<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import type { AppConfig } from '../types';
  import { getMapState } from '../stores/state.svelte';
  import { generateSources, generateLayers } from '../config/mapLayers';
  import {
    registerHoverHandlers,
    registerClickHandlers,
    showLevel,
    showMeasure,
    applyDistrictFill,
    hideDistrictFill,
    toggleCities,
    toggleCounties,
    togglePrecincts,
    clearPin,
  } from '../config/mapInteraction';
  import { setStateTotals, setMapInstance, setDemographics } from '../stores/state.svelte';
  import type { StateTotals } from '../types';

  interface Props {
    config: AppConfig;
  }
  let { config }: Props = $props();

  let mapContainer: HTMLDivElement;
  let map = $state<mapboxgl.Map | null>(null);
  let mapReady = $state(false);

  let state = $derived(getMapState());

  // Track previous values for effect comparisons
  let prevLevel = $state('');
  let prevMeasure = $state('');
  let prevShowDistrict = $state(true);
  let prevShowCity = $state(false);
  let prevShowCounty = $state(false);
  let prevShowPrecinct = $state(false);

  const ELECTIONS = [
    { key: 'g18_pct_dem', label: '2018 Gen' },
    { key: 'p20_pct_dem', label: '2020 Pres' },
    { key: 'r21_pct_dem', label: '2021 Runoff' },
    { key: 'g22_pct_dem', label: '2022 Gen' },
    { key: 's22_pct_dem', label: '2022 Senate' },
  ] as const;

  async function loadStateTotals(levelId: string) {
    const plan = config.districtPlans.find((p) => p.id === levelId);
    if (!plan) return;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/${plan.geojson}`);
      const geojson = await res.json();
      const totals: StateTotals = {
        pop: 0, tvap: 0, wvap: 0, bvap: 0, avap: 0, hvap: 0, bipocvap: 0,
        maxPop: 0, maxTvap: 0, maxWvap: 0, maxBvap: 0, maxAvap: 0, maxHvap: 0, maxBipocvap: 0,
        meanPartisan: 0, medianPartisan: 0, meanMedian: 0,
        elections: [],
      };

      const egAccum: Record<string, { wastedD: number; wastedR: number; totalV: number }> = {};
      for (const el of ELECTIONS) egAccum[el.key] = { wastedD: 0, wastedR: 0, totalV: 0 };
      const partisanVals: number[] = [];

      for (const f of geojson.features) {
        const p = f.properties ?? {};
        const tvap     = p.tvap  ?? 0;
        const bvap     = tvap * (p.pct_bvp ?? 0);
        const avap     = tvap * (p.pct_avp ?? 0);
        const hvap     = tvap * (p.pct_hvp ?? 0);
        const bipocvap = tvap * (p.pct_bp_ ?? 0);
        const wvap     = tvap * (p.pct_wvap_al ?? 0);
        totals.pop      += p.pop ?? 0;
        totals.tvap     += tvap;
        totals.wvap     += wvap;
        totals.bvap     += bvap;
        totals.avap     += avap;
        totals.hvap     += hvap;
        totals.bipocvap += bipocvap;
        if ((p.pop ?? 0) > totals.maxPop)     totals.maxPop     = p.pop ?? 0;
        if (tvap          > totals.maxTvap)    totals.maxTvap    = tvap;
        if (wvap          > totals.maxWvap)    totals.maxWvap    = wvap;
        if (bvap          > totals.maxBvap)    totals.maxBvap    = bvap;
        if (avap          > totals.maxAvap)    totals.maxAvap    = avap;
        if (hvap          > totals.maxHvap)    totals.maxHvap    = hvap;
        if (bipocvap      > totals.maxBipocvap) totals.maxBipocvap = bipocvap;

        if (p.partisan != null) partisanVals.push(p.partisan);

        if (tvap > 0) {
          for (const el of ELECTIONS) {
            const dem = p[el.key];
            if (typeof dem === 'number') {
              const acc = egAccum[el.key];
              if (dem > 0.5) {
                acc.wastedD += (dem - 0.5) * tvap;
                acc.wastedR += (1 - dem) * tvap;
              } else {
                acc.wastedD += dem * tvap;
                acc.wastedR += (0.5 - dem) * tvap;
              }
              acc.totalV += tvap;
            }
          }
        }
      }

      // Mean-median difference
      if (partisanVals.length > 0) {
        const mean = partisanVals.reduce((a, b) => a + b, 0) / partisanVals.length;
        const sorted = [...partisanVals].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
        totals.meanPartisan   = mean;
        totals.medianPartisan = median;
        totals.meanMedian     = mean - median;
      }

      totals.elections = ELECTIONS.map((el) => {
        const acc = egAccum[el.key];
        const hasData = acc.totalV > 0;
        return { key: el.key, label: el.label, eg: hasData ? (acc.wastedD - acc.wastedR) / acc.totalV : 0, hasData };
      });

      setStateTotals(totals);
    } catch (e) { console.error('[loadStateTotals failed]', e); }
  }

  async function loadDemographics(levelId: string) {
    const plan = config.districtPlans.find((p) => p.id === levelId);
    if (!plan) return;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/demographics/${plan.chamber}.json`);
      if (!res.ok) { setDemographics(null); return; }
      setDemographics(await res.json());
    } catch { setDemographics(null); }
  }

  onMount(() => {
    const isMobile = window.matchMedia(`(max-width: ${config.map.mobileBreakpoint}px)`).matches;
    const zoom = isMobile ? config.map.zoom.mobile : config.map.zoom.desktop;

    mapboxgl.accessToken = config.mapboxToken;

    const m = new mapboxgl.Map({
      container: mapContainer,
      style: config.map.style,
      center: config.map.center,
      zoom,
      minZoom: config.map.minZoom,
      maxZoom: config.map.maxZoom,
    });

    // Navigation controls (no compass)
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }));

    m.on('error', (e) => {
      console.error('[map error]', e.error);
    });

    m.on('load', () => {
      try {
        // Add all sources
        const sources = generateSources(config);
        for (const [id, spec] of Object.entries(sources)) {
          try {
            m.addSource(id, spec);
          } catch (e) {
            console.error(`[addSource failed] ${id}:`, e);
          }
        }

        // Add all layers
        const layers = generateLayers(config);
        for (const layer of layers) {
          try {
            m.addLayer(layer);
          } catch (e) {
            console.error(`[addLayer failed] ${(layer as any).id}:`, e);
          }
        }

        // Register hover handlers
        registerHoverHandlers(m, config.districtPlans);
        registerClickHandlers(m, config.districtPlans);

        map = m;
        mapReady = true;
        setMapInstance(m);

        // Apply initial state
        showLevel(m, state.level, config.districtPlans);
        applyCurrentOverlay(m);

        // Load state totals + census demographics for tooltip
        loadStateTotals(state.level);
        loadDemographics(state.level);
      } catch (e) {
        console.error('[map load callback failed]', e);
      }
    });
  });

  onDestroy(() => {
    map?.remove();
    map = null;
    setMapInstance(null);
  });

  /**
   * Apply the current measure overlay with correct layer ordering.
   *
   * Layer order goal (bottom → top):
   *   district_fill → overlay_tiles → district_line → district_hover
   *   → county_borders → city_borders → city_borders_fill → precinct_borders
   *
   * applyDistrictFill moves the fill all the way to the top, which buries
   * boundary line layers beneath it.  We fix that by always re-raising those
   * boundary layers at the end so they're visible whenever toggled on.
   */
  function applyCurrentOverlay(m: mapboxgl.Map) {
    showMeasure(m, state.measure, config.overlays);
    hideDistrictFill(m, config.districtPlans);

    if (state.showDistrict) {
      // Districts toggle ON: raise district fill to top for solid block coloring.
      applyDistrictFill(m, state.level, state.measure, config.overlays);
    }
    // Districts toggle OFF: the tile overlay (e.g. precinct_plean) renders on
    // its own. No district-fill gap filler — it caused color inconsistency as
    // tiles loaded incrementally at different zoom levels, and showed wrong
    // district-level colors for precincts with missing partisan data.

    // In Mapbox GL JS v3, vector tile layers (precinct_plean) break when they sit
    // ABOVE a GeoJSON fill in the z-stack. Georgia-Explorer adds layers in reverse
    // order so its popup fill naturally lands above precinct_plean. Replicate that
    // here by explicitly raising the active popup fill above overlay layers.
    try { m.moveLayer(`${state.level}_popup`); } catch { /* ok */ }

    // Re-raise boundary/outline layers above everything (fill, tiles, district
    // lines) so they are always visible when toggled on.
    try { m.moveLayer('county_borders'); } catch { /* ok */ }
    try { m.moveLayer('city_borders'); } catch { /* ok */ }
    try { m.moveLayer('city_borders_fill'); } catch { /* ok */ }
    try { m.moveLayer('precinct_borders'); } catch { /* ok */ }
  }

  // React to state changes
  $effect(() => {
    if (!mapReady || !map) return;

    if (state.level !== prevLevel) {
      prevLevel = state.level;
      clearPin(map, config.districtPlans);
      showLevel(map, state.level, config.districtPlans);
      applyCurrentOverlay(map);
      loadStateTotals(state.level);
      loadDemographics(state.level);
    }
  });

  $effect(() => {
    if (!mapReady || !map) return;

    if (state.measure !== prevMeasure) {
      prevMeasure = state.measure;
      applyCurrentOverlay(map);
    }
  });

  $effect(() => {
    if (!mapReady || !map) return;

    if (state.showDistrict !== prevShowDistrict) {
      prevShowDistrict = state.showDistrict;
      applyCurrentOverlay(map);
    }
  });

  $effect(() => {
    if (!mapReady || !map) return;

    if (state.showCity !== prevShowCity) {
      prevShowCity = state.showCity;
      toggleCities(map, state.showCity);
    }
  });

  $effect(() => {
    if (!mapReady || !map) return;

    if (state.showCounty !== prevShowCounty) {
      prevShowCounty = state.showCounty;
      toggleCounties(map, state.showCounty);
    }
  });

  $effect(() => {
    if (!mapReady || !map) return;

    if (state.showPrecinct !== prevShowPrecinct) {
      prevShowPrecinct = state.showPrecinct;
      togglePrecincts(map, state.showPrecinct);
    }
  });
</script>

<div class="absolute inset-0">
  <div bind:this={mapContainer} class="w-full h-full"></div>
</div>
