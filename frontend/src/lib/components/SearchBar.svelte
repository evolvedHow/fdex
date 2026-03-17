<script lang="ts">
  import type mapboxgl from 'mapbox-gl';
  import type { AppConfig, DistrictPlan } from '../types';
  import { getMapState, getMapInstance, setHoveredDistrict } from '../stores/state.svelte';

  interface Props {
    config: AppConfig;
    compact?: boolean;   // hides hint text when embedded in a tight toolbar
  }
  let { config, compact = false }: Props = $props();

  let state   = $derived(getMapState());
  let query   = $state('');
  let searching = $state(false);
  let errorMsg  = $state('');

  const HINT = 'D5 = district · Cobb = county · or full address';

  function currentPlan(): DistrictPlan | undefined {
    return config.districtPlans.find((p) => p.id === state.level);
  }

  function featureBbox(geometry: any): [number, number, number, number] {
    const coords: [number, number][] = [];
    const extract = (c: any) => {
      if (typeof c[0] === 'number') coords.push(c as [number, number]);
      else c.forEach(extract);
    };
    extract(geometry.coordinates);
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
  }

  function highlightFeature(feature: any, plan: DistrictPlan) {
    const m = getMapInstance();
    if (!m) return;
    const districtVal = feature.properties[plan.districtProp] ?? feature.properties['DISTRICT'] ?? '';
    try { m.setFilter(`${plan.id}_hover`, ['==', plan.districtProp, districtVal]); } catch { /* */ }
    setHoveredDistrict({ properties: feature.properties, tooltipTitle: plan.tooltipTitle });
  }

  function highlightAfterMove() {
    const m = getMapInstance();
    if (!m) return;
    const plan = currentPlan();
    if (!plan) return;
    m.once('moveend', () => {
      const m2 = getMapInstance();
      if (!m2) return;
      const features = m2.queryRenderedFeatures(m2.project(m2.getCenter()), {
        layers: [`${plan.id}_popup`],
      });
      if (features.length) highlightFeature(features[0], plan);
    });
  }

  async function searchDistrict(num: number): Promise<boolean> {
    const m = getMapInstance();
    const plan = currentPlan();
    if (!plan || !m) return false;
    const res = await fetch(`/data/${plan.geojson}`);
    const geojson = await res.json();
    const feature = geojson.features.find(
      (f: any) => parseInt(f.properties[plan.districtProp], 10) === num,
    );
    if (!feature) return false;
    m.once('moveend', () => highlightFeature(feature, plan));
    m.fitBounds(featureBbox(feature.geometry) as mapboxgl.LngLatBoundsLike, { padding: 60, maxZoom: 12 });
    return true;
  }

  async function searchMapbox(q: string): Promise<boolean> {
    const m = getMapInstance();
    if (!m) return false;
    const [minLng, minLat, maxLng, maxLat] = config.map.geocoderBbox;
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
      `?bbox=${minLng},${minLat},${maxLng},${maxLat}` +
      `&country=US&types=address,place,county,district,region&limit=1` +
      `&access_token=${config.mapboxToken}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.features?.length) return false;
    const f = data.features[0];
    highlightAfterMove();
    if (f.bbox) {
      m.fitBounds(f.bbox as mapboxgl.LngLatBoundsLike, { padding: 60, maxZoom: 13 });
    } else {
      m.flyTo({ center: f.center, zoom: 12 });
    }
    return true;
  }

  async function handleSearch() {
    const q = query.trim();
    if (!q || !getMapInstance()) return;
    searching = true;
    errorMsg = '';
    setHoveredDistrict(null);
    try {
      const dm = q.trim().match(/^[Dd]\s*(\d+)$/);
      if (dm) {
        const found = await searchDistrict(parseInt(dm[1], 10));
        if (found) { query = ''; return; }
        errorMsg = `District ${dm[1]} not found`;
        return;
      }
      const found = await searchMapbox(q);
      if (found) query = '';
      else errorMsg = 'Location not found';
    } finally {
      searching = false;
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') { query = ''; errorMsg = ''; setHoveredDistrict(null); }
  }
</script>

<div class="flex flex-col gap-0.5">
  <div class="flex gap-1.5 items-center">
    <input
      type="text"
      bind:value={query}
      onkeydown={onKeydown}
      placeholder="D5 · county · address…"
      class="w-[200px] px-2.5 py-1 text-sm rounded
             border border-gray-300 bg-white
             focus:outline-none focus:border-blue-400"
    />
    <button
      onclick={handleSearch}
      disabled={searching}
      class="px-2.5 py-1 text-sm bg-[#29315F] text-white rounded
             hover:bg-[#3a4580] disabled:opacity-50 cursor-pointer"
    >
      {searching ? '…' : 'Go'}
    </button>
  </div>
  {#if errorMsg}
    <div class="text-xs text-red-600 mt-0.5">{errorMsg}</div>
  {:else if !compact}
    <span class="text-[10px] text-gray-400 px-0.5">{HINT}</span>
  {/if}
</div>
