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

  async function loadStateTotals(levelId: string) {
    const plan = config.districtPlans.find((p) => p.id === levelId);
    if (!plan) return;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/${plan.geojson}`);
      const geojson = await res.json();
      const totals: StateTotals = {
        pop: 0, tvap: 0, bvap: 0, avap: 0, hvap: 0, bipocvap: 0,
        maxPop: 0, maxTvap: 0, maxBvap: 0, maxAvap: 0, maxHvap: 0, maxBipocvap: 0,
      };
      for (const f of geojson.features) {
        const p = f.properties ?? {};
        const bvap    = (p.tvap ?? 0) * (p.pct_bvp ?? 0);
        const avap    = (p.tvap ?? 0) * (p.pct_avp ?? 0);
        const hvap    = (p.tvap ?? 0) * (p.pct_hvp ?? 0);
        const bipocvap = (p.tvap ?? 0) * (p.pct_bp_ ?? 0);
        totals.pop      += p.pop   ?? 0;
        totals.tvap     += p.tvap  ?? 0;
        totals.bvap     += bvap;
        totals.avap     += avap;
        totals.hvap     += hvap;
        totals.bipocvap += bipocvap;
        if ((p.pop   ?? 0) > totals.maxPop)     totals.maxPop     = p.pop   ?? 0;
        if ((p.tvap  ?? 0) > totals.maxTvap)    totals.maxTvap    = p.tvap  ?? 0;
        if (bvap           > totals.maxBvap)    totals.maxBvap    = bvap;
        if (avap           > totals.maxAvap)    totals.maxAvap    = avap;
        if (hvap           > totals.maxHvap)    totals.maxHvap    = hvap;
        if (bipocvap       > totals.maxBipocvap) totals.maxBipocvap = bipocvap;
      }
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
        showMeasure(m, state.measure, config.overlays);
        applyDistrictFill(m, state.level, state.measure, config.overlays);

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

  // React to state changes
  $effect(() => {
    if (!mapReady || !map) return;

    if (state.level !== prevLevel) {
      prevLevel = state.level;
      clearPin(map, config.districtPlans);
      showLevel(map, state.level, config.districtPlans);
      if (state.showDistrict) {
        hideDistrictFill(map, config.districtPlans);
        applyDistrictFill(map, state.level, state.measure, config.overlays);
      }
      loadStateTotals(state.level);
      loadDemographics(state.level);
    }
  });

  $effect(() => {
    if (!mapReady || !map) return;

    if (state.measure !== prevMeasure) {
      prevMeasure = state.measure;
      showMeasure(map, state.measure, config.overlays);
      if (state.showDistrict) {
        hideDistrictFill(map, config.districtPlans);
        applyDistrictFill(map, state.level, state.measure, config.overlays);
      }
    }
  });

  $effect(() => {
    if (!mapReady || !map) return;

    if (state.showDistrict !== prevShowDistrict) {
      prevShowDistrict = state.showDistrict;
      hideDistrictFill(map, config.districtPlans);
      if (state.showDistrict) {
        applyDistrictFill(map, state.level, state.measure, config.overlays);
      }
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
