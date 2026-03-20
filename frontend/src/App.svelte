<script lang="ts">
  import { onMount } from 'svelte';
  import type { AppConfig } from './lib/types';
  import { getAppConfig, setAppConfig } from './lib/stores/state.svelte';
  import ControlBar from './lib/components/ControlBar.svelte';
  import MapView from './lib/components/MapView.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import Legend from './lib/components/Legend.svelte';

  let config = $derived(getAppConfig());
  let error = $state('');

  onMount(async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}config.json`);
      if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
      const data: AppConfig = await res.json();
      setAppConfig(data);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load configuration';
    }
  });
</script>

<main class="flex flex-col h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans">
  <!-- Header -->
  <div class="h-[45px] bg-black flex items-center shrink-0">
    <a href="https://www.fairdistrictsga.org/" class="h-full flex items-center">
      <img src="/img/fdga_logo.png" alt="FDGA" class="h-10 ml-2.5" />
    </a>
    <span class="text-white font-bold text-[28px] tracking-normal text-center flex-1">
      Georgia Explorer
    </span>
  </div>

  {#if error}
    <div class="p-4 bg-red-100 text-red-800 text-center">{error}</div>
  {:else if !config}
    <div class="flex-1 flex items-center justify-center text-lg text-gray-500">Loading...</div>
  {:else}
    <!-- Controls -->
    <ControlBar {config} />

    <!-- Map + sidebar -->
    <div class="flex-1 flex overflow-hidden min-h-0">
      <div class="flex-1 relative overflow-hidden">
        <MapView {config} />
        <Legend />
      </div>
      <Sidebar />
    </div>
  {/if}
</main>
