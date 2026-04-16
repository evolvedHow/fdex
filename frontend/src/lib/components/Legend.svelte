<script lang="ts">
  import type { Overlay } from '../types';
  import { getMapState, getAppConfig } from '../stores/state.svelte';

  let state = $derived(getMapState());
  let config = $derived(getAppConfig());

  let activeOverlay = $derived.by(() => {
    if (!config) return null;
    return config.overlays.find((o: Overlay) => o.id === state.measure) ?? null;
  });
</script>

{#if activeOverlay?.legend}
  <div class="absolute top-2.5 right-2.5 z-10">
    <div
      class="inline-flex flex-wrap items-center gap-0 p-1.5
             border border-gray-300 rounded-lg bg-[#fafafa]
             w-[185px] max-md:w-[125px]"
    >
      <div class="w-full font-bold text-black pb-1 text-center text-sm">
        {activeOverlay.legend.title}
      </div>
      {#each activeOverlay.legend.items as item}
        <div class="flex items-center w-full text-[#29315F] text-sm max-md:text-xs">
          <span
            class="inline-block w-2.5 h-2.5 ml-2.5 mr-1.5 shrink-0"
            style:background-color={item.color}
          ></span>
          <span>{item.label}</span>
        </div>
      {/each}
    </div>
  </div>
{/if}
