<script lang="ts">
  import { onMount } from 'svelte';
  import type { AppConfig } from './lib/types';
  import { getAppConfig, setAppConfig } from './lib/stores/state.svelte';
  import { hasSidebar } from './lib/utils/breakpoint.svelte';
  import ControlBar from './lib/components/ControlBar.svelte';
  import MapView from './lib/components/MapView.svelte';
  import BottomDrawer from './lib/components/BottomDrawer.svelte';
  import Legend from './lib/components/Legend.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';

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

<main class="flex h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans overflow-hidden">

  <!-- Left column: header + controls + map (full height flex column) -->
  <div class="flex-1 flex flex-col overflow-hidden min-w-0">
    <!-- Header — shrinks on phone -->
    <div class="h-[40px] sm:h-[45px] bg-black flex items-center shrink-0">
      <a href="https://www.fairdistrictsga.org/" class="h-full flex items-center">
        <img src="/img/fdga_logo.png" alt="FDGA" class="h-8 sm:h-10 ml-2 sm:ml-2.5" />
      </a>
      <span class="text-white font-bold text-[17px] sm:text-[22px] lg:text-[26px] xl:text-[28px] tracking-normal text-center flex-1 pr-2">
        Georgia Explorer
      </span>
    </div>

    {#if error}
      <div class="p-4 bg-red-100 text-red-800 text-center text-sm">{error}</div>
    {:else if !config}
      <div class="flex-1 flex items-center justify-center text-lg text-gray-500">Loading...</div>
    {:else}
      <!-- Controls -->
      <ControlBar {config} />

      <!-- Map -->
      <div class="flex-1 relative overflow-hidden min-h-0">
        <MapView {config} />
        <Legend />
        <!-- BottomDrawer hidden at xl+ where Sidebar takes over -->
        <div class="xl:hidden">
          <BottomDrawer />
        </div>
      </div>
    {/if}
  </div>

  <!-- Sidebar: desktop only (xl+), replaces BottomDrawer -->
  {#if hasSidebar.matches && config}
    <Sidebar />
  {/if}

</main>
