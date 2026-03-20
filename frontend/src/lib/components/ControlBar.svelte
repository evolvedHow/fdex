<script lang="ts">
  import type { AppConfig, DistrictPlan, Overlay } from '../types';
  import {
    getMapState,
    setLevel,
    setMeasure,
    setShowDistrict,
    setShowCity,
    setShowCounty,
    setShowPrecinct,
  } from '../stores/state.svelte';
  import SearchBar from './SearchBar.svelte';

  interface Props { config: AppConfig; }
  let { config }: Props = $props();

  let state  = $derived(getMapState());

  // ── Grouped selectors ──────────────────────────────────────────────────
  let planGroups = $derived.by(() => {
    const groups: { label: string; plans: DistrictPlan[] }[] = [];
    const seen = new Map<string, DistrictPlan[]>();
    for (const plan of config.districtPlans) {
      if (!seen.has(plan.group)) {
        const arr: DistrictPlan[] = [];
        seen.set(plan.group, arr);
        groups.push({ label: plan.group, plans: arr });
      }
      seen.get(plan.group)!.push(plan);
    }
    return groups;
  });

  let overlayGroups = $derived.by(() => {
    const groups: { label: string | null; overlays: Overlay[] }[] = [];
    const seen = new Map<string | null, Overlay[]>();
    for (const overlay of config.overlays) {
      if (!seen.has(overlay.group)) {
        const arr: Overlay[] = [];
        seen.set(overlay.group, arr);
        groups.push({ label: overlay.group, overlays: arr });
      }
      seen.get(overlay.group)!.push(overlay);
    }
    return groups;
  });

  // ── Layer toggle pills ─────────────────────────────────────────────────
  const layers = [
    { label: 'Districts', get: () => state.showDistrict, set: setShowDistrict },
    { label: 'Cities',    get: () => state.showCity,     set: setShowCity     },
    { label: 'County',    get: () => state.showCounty,   set: setShowCounty   },
    { label: 'Precincts', get: () => state.showPrecinct, set: setShowPrecinct },
  ] as const;
</script>

<!-- ── Toolbar (single scrolling row) ────────────────────────────────── -->
<div class="shrink-0 bg-[#F0F1F5] border-b border-gray-300">
  <div class="flex items-center gap-2 px-3 h-[52px] overflow-x-auto">

      <!-- Boundary selector -->
      <select
        class="shrink-0 border border-gray-300 rounded px-2 py-1 text-sm bg-white w-[230px] cursor-pointer"
        value={state.level}
        onchange={(e) => setLevel((e.target as HTMLSelectElement).value)}
        title="Political boundary"
      >
        {#each planGroups as group}
          <optgroup label={group.label}>
            {#each group.plans as plan}
              <option value={plan.id}>{plan.label}</option>
            {/each}
          </optgroup>
        {/each}
      </select>

      <!-- Divider -->
      <div class="shrink-0 w-px h-6 bg-gray-300"></div>

      <!-- Data overlay selector -->
      <select
        class="shrink-0 border border-gray-300 rounded px-2 py-1 text-sm bg-white w-[220px] cursor-pointer"
        value={state.measure}
        onchange={(e) => setMeasure((e.target as HTMLSelectElement).value)}
        title="Data overlay"
      >
        {#each overlayGroups as group}
          {#if group.label}
            <optgroup label={group.label}>
              {#each group.overlays as overlay}
                <option value={overlay.id}>{overlay.label}</option>
              {/each}
            </optgroup>
          {:else}
            {#each group.overlays as overlay}
              <option value={overlay.id}>{overlay.label}</option>
            {/each}
          {/if}
        {/each}
      </select>

      <!-- Divider -->
      <div class="shrink-0 w-px h-6 bg-gray-300"></div>

      <!-- Search -->
      <div class="shrink-0">
        <SearchBar {config} compact />
      </div>

      <!-- Divider -->
      <div class="shrink-0 w-px h-6 bg-gray-300"></div>

      <!-- Layer toggle pills -->
      <span class="shrink-0 text-xs text-gray-500 font-medium">Display:</span>
      {#each layers as layer}
        <button
          class="shrink-0 px-2.5 py-1 text-xs rounded-full border transition-colors cursor-pointer select-none
                 {layer.get()
                   ? 'bg-[#29315F] text-white border-[#29315F]'
                   : 'bg-white text-gray-600 border-gray-300 hover:border-[#29315F] hover:text-[#29315F]'}"
          onclick={() => layer.set(!layer.get())}
        >
          {layer.label}
        </button>
      {/each}

    </div>
  </div>
