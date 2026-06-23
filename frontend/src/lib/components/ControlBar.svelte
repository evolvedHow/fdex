<script lang="ts">
  import { slide } from 'svelte/transition';
  import type { AppConfig, DistrictPlan, Overlay } from '../types';
  import {
    getMapState,
    setLevel,
    setMeasure,
    setShowDistrict,
    setShowCity,
    setShowCounty,
    setShowPrecinct,
    getControlsOpen,
    setControlsOpen,
    toggleControlsOpen,
  } from '../stores/state.svelte';
  import SearchBar from './SearchBar.svelte';

  interface Props { config: AppConfig; }
  let { config }: Props = $props();

  let state = $derived(getMapState());

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

  // Shared select markup helpers (rendered differently per layout)
  function onPlanChange(e: Event) {
    setLevel((e.target as HTMLSelectElement).value);
  }
  function onOverlayChange(e: Event) {
    setMeasure((e.target as HTMLSelectElement).value);
    setControlsOpen(false); // auto-close phone filters panel
  }
</script>

<!-- ── Toolbar wrapper ─────────────────────────────────────────────────── -->
<div class="shrink-0 bg-[#F0F1F5] border-b border-gray-300">

  <!-- ══ PHONE layout (< 640px): plan select + Filters button ══ -->
  <div class="flex items-center gap-2 px-3 h-[48px] sm:hidden">
    <select
      class="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1.5 text-sm bg-white cursor-pointer"
      value={state.level}
      onchange={onPlanChange}
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

    <button
      class="shrink-0 h-[38px] px-3 bg-[#29315F] text-white text-sm rounded
             flex items-center gap-1.5 cursor-pointer hover:bg-[#3a4580]"
      onclick={toggleControlsOpen}
      aria-expanded={getControlsOpen()}
      aria-label="Open filters"
    >
      <!-- Hamburger / sliders icon -->
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M3 5h18M3 10h12M3 15h18M15 10h6" />
      </svg>
      Filters
    </button>
  </div>

  <!-- ══ TABLET layout (640–1023px): two rows ══ -->
  <div class="hidden sm:flex lg:hidden flex-col px-3 py-2 gap-2">
    <!-- Row 1: plan select + overlay select + search -->
    <div class="flex items-center gap-2">
      <select
        class="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1.5 text-sm bg-white cursor-pointer"
        value={state.level}
        onchange={onPlanChange}
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
      <select
        class="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1.5 text-sm bg-white cursor-pointer"
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
      <SearchBar {config} compact />
    </div>
    <!-- Row 2: layer toggle pills -->
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-xs text-gray-500 font-medium shrink-0">Display:</span>
      {#each layers as layer}
        <button
          class="h-[34px] px-3 text-sm rounded-full border transition-colors cursor-pointer select-none
                 {layer.get()
                   ? 'bg-[#29315F] text-white border-[#29315F]'
                   : 'bg-white text-gray-600 border-gray-300 hover:border-[#29315F] hover:text-[#29315F]'}"
          onclick={() => layer.set(!layer.get())}
        >{layer.label}</button>
      {/each}
    </div>
  </div>

  <!-- ══ LAPTOP / DESKTOP layout (1024px+): single row (current) ══ -->
  <div class="hidden lg:flex items-center gap-2 px-3 h-[52px]">
    <select
      class="shrink-0 border border-gray-300 rounded px-2 py-1 text-sm bg-white w-[230px] cursor-pointer"
      value={state.level}
      onchange={onPlanChange}
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

    <div class="shrink-0 w-px h-6 bg-gray-300"></div>

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

    <div class="shrink-0 w-px h-6 bg-gray-300"></div>

    <div class="shrink-0">
      <SearchBar {config} compact />
    </div>

    <div class="shrink-0 w-px h-6 bg-gray-300"></div>

    <span class="shrink-0 text-xs text-gray-500 font-medium">Display:</span>
    {#each layers as layer}
      <button
        class="shrink-0 px-2.5 py-1 text-xs rounded-full border transition-colors cursor-pointer select-none
               {layer.get()
                 ? 'bg-[#29315F] text-white border-[#29315F]'
                 : 'bg-white text-gray-600 border-gray-300 hover:border-[#29315F] hover:text-[#29315F]'}"
        onclick={() => layer.set(!layer.get())}
      >{layer.label}</button>
    {/each}
  </div>

</div>

<!-- ══ PHONE Filters overlay panel (slides down below toolbar) ══ -->
{#if getControlsOpen()}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-30 bg-black/40 sm:hidden"
    role="button"
    tabindex="0"
    aria-label="Close filters"
    onclick={() => setControlsOpen(false)}
    onkeydown={(e) => e.key === 'Escape' && setControlsOpen(false)}
  ></div>

  <!-- Panel — slides in from top, sits below header (40px) + toolbar (48px) -->
  <div
    transition:slide={{ duration: 200 }}
    class="fixed top-[88px] left-0 right-0 z-40 bg-white border-b border-gray-200
           shadow-lg px-4 py-4 flex flex-col gap-4 sm:hidden"
  >
    <!-- Overlay select -->
    <div>
      <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        Data Overlay
      </label>
      <select
        class="w-full border border-gray-300 rounded px-3 py-2.5 text-[15px] bg-white cursor-pointer"
        value={state.measure}
        onchange={onOverlayChange}
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
    </div>

    <!-- Search -->
    <div>
      <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        Find a Location
      </label>
      <SearchBar {config} compact />
    </div>

    <!-- Layer toggles (2×2 grid, 44px tall each) -->
    <div>
      <div class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Display Layers
      </div>
      <div class="grid grid-cols-2 gap-2">
        {#each layers as layer}
          <button
            class="h-[44px] px-3 text-[15px] rounded-lg border-2 transition-colors cursor-pointer select-none
                   {layer.get()
                     ? 'bg-[#29315F] text-white border-[#29315F]'
                     : 'bg-white text-gray-600 border-gray-300'}"
            onclick={() => layer.set(!layer.get())}
          >{layer.label}</button>
        {/each}
      </div>
    </div>

    <!-- Done button -->
    <button
      class="h-[44px] w-full rounded-lg bg-gray-100 text-gray-700 text-[15px] font-medium cursor-pointer hover:bg-gray-200"
      onclick={() => setControlsOpen(false)}
    >Done</button>
  </div>
{/if}
