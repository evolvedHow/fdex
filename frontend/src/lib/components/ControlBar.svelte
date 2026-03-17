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
  let pinned = $state(true);

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

{#if pinned}
  <!-- ── Expanded toolbar (single scrolling row) ───────────────────────── -->
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

      <!-- Spacer pushes pin to the far right -->
      <div class="flex-1 min-w-[8px]"></div>

      <!-- Pin / collapse button -->
      <button
        class="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500
               border border-gray-300 rounded bg-white hover:bg-gray-100 cursor-pointer"
        onclick={() => pinned = false}
        title="Collapse toolbar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <!-- pin icon -->
          <line x1="12" y1="17" x2="12" y2="22"/>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
        </svg>
        Unpin
      </button>
    </div>
  </div>

{:else}
  <!-- ── Collapsed strip ────────────────────────────────────────────────── -->
  <div class="shrink-0 bg-[#29315F] border-b border-[#1a2040]">
    <button
      class="w-full h-[26px] flex items-center justify-center gap-1.5
             text-xs text-white/80 hover:text-white cursor-pointer"
      onclick={() => pinned = true}
      title="Expand toolbar"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="12" y1="17" x2="12" y2="22"/>
        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
      </svg>
      Show Controls
    </button>
  </div>
{/if}
