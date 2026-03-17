<script lang="ts">
  import {
    getHoveredDistrict,
    getStateTotals,
    getChamberDemographics,
    getDemographicsTotals,
    getIsPinned,
    setIsPinned,
    setHoveredDistrict,
    setLocationCounty,
    setLocationPrecinct,
    getLocationCounty,
    getLocationPrecinct,
  } from '../stores/state.svelte';

  let hovered  = $derived(getHoveredDistrict());
  let totals   = $derived(getStateTotals());
  let demData  = $derived(getChamberDemographics());
  let demTot   = $derived(getDemographicsTotals());
  let pinned   = $derived(getIsPinned());
  let county   = $derived(getLocationCounty());
  let precinct = $derived(getLocationPrecinct());

  function unpin() {
    setIsPinned(false);
    setHoveredDistrict(null);
    setLocationCounty(null);
    setLocationPrecinct(null);
  }

  // ── Formatters ───────────────────────────────────────────────────────────
  function fmt(n: number | undefined): string {
    if (n == null) return '—';
    return n.toLocaleString('en-US');
  }
  function pct(n: number | undefined): string {
    if (n == null) return '—';
    return `${(n * 100).toFixed(1)}%`;
  }
  function money(n: number | undefined | null): string {
    if (n == null) return '—';
    return `$${n.toLocaleString('en-US')}`;
  }
  function sharePct(share: number): string {
    return `${(share * 100).toFixed(1)}%`;
  }
  function isMax(val: number, max: number): boolean {
    return max > 0 && Math.abs(val - max) < 0.5;
  }
  function isMaxF(val: number, max: number): boolean {
    return max > 0 && Math.abs(val - max) < 0.0001;
  }

  let districtNum = $derived(
    hovered?.properties?.district ?? hovered?.properties?.DISTRICT ?? '',
  );

  // ── District plan rows ────────────────────────────────────────────────────
  type Row = [string, string, number | null, boolean];

  let planRows = $derived<Row[]>((() => {
    if (!hovered) return [];
    const p = hovered.properties;
    const t = totals;
    const distBvap   = (p.tvap ?? 0) * (p.pct_bvp ?? 0);
    const distAvap   = (p.tvap ?? 0) * (p.pct_avp ?? 0);
    const distHvap   = (p.tvap ?? 0) * (p.pct_hvp ?? 0);
    const distBipoc  = (p.tvap ?? 0) * (p.pct_bp_ ?? 0);
    return [
      ['Population',   fmt(p.pop),
        t && p.pop  != null ? p.pop  / t.pop   : null,
        t != null && p.pop  != null && isMax(p.pop,   t.maxPop)],
      ['VAP 2020',     fmt(p.tvap),
        t && p.tvap != null ? p.tvap / t.tvap  : null,
        t != null && p.tvap != null && isMax(p.tvap,  t.maxTvap)],
      ['Black VAP',    pct(p.pct_bvp),
        t && t.bvap    > 0 ? distBvap  / t.bvap    : null,
        t != null && isMax(distBvap,   t.maxBvap)],
      ['Asian VAP',    pct(p.pct_avp),
        t && t.avap    > 0 ? distAvap  / t.avap    : null,
        t != null && isMax(distAvap,   t.maxAvap)],
      ['Hispanic VAP', pct(p.pct_hvp),
        t && t.hvap    > 0 ? distHvap  / t.hvap    : null,
        t != null && isMax(distHvap,   t.maxHvap)],
      ['Minority VAP', pct(p.pct_bp_),
        t && t.bipocvap > 0 ? distBipoc / t.bipocvap : null,
        t != null && isMax(distBipoc,  t.maxBipocvap)],
      ['Dem 2018–22',  pct(p.partisan), null, false],
    ];
  })());

  // ── Census demographics rows ──────────────────────────────────────────────
  let demoRows = $derived<Row[]>((() => {
    if (!hovered || !demData || !demTot) return [];
    const key = String(Math.round(Number(hovered.properties.district ?? hovered.properties.DISTRICT ?? 0)));
    const d = demData[key];
    if (!d) return [];
    return [
      ['Median Income',   money(d.median_income),   null,
        isMax(d.median_income ?? 0, demTot.maxMedianIncome)],
      ['Below Poverty',   pct(d.pct_poverty),
        demTot.poverty_count > 0 && d.poverty_count != null ? d.poverty_count / demTot.poverty_count : null,
        isMaxF(d.pct_poverty ?? 0, demTot.maxPctPoverty)],
      ["Bachelor's+",     pct(d.pct_bachelors_plus),
        demTot.bachelors_plus_count > 0 && d.bachelors_plus_count != null ? d.bachelors_plus_count / demTot.bachelors_plus_count : null,
        isMaxF(d.pct_bachelors_plus ?? 0, demTot.maxPctBachelors)],
      ['Male',            pct(d.pct_male),            null, false],
      ['Female',          pct(d.pct_female),          null, false],
      ['Married HH',      pct(d.pct_married_family),
        demTot.married_hh_count > 0 && d.married_hh_count != null ? d.married_hh_count / demTot.married_hh_count : null,
        isMaxF(d.pct_married_family ?? 0, demTot.maxPctMarried)],
      ['Single Parent',   pct(d.pct_single_parent),
        demTot.single_parent_count > 0 && d.single_parent_count != null ? d.single_parent_count / demTot.single_parent_count : null,
        isMaxF(d.pct_single_parent ?? 0, demTot.maxPctSingleParent)],
    ];
  })());
</script>

<!-- Fixed-width sidebar, full height, always visible -->
<div class="w-[300px] shrink-0 flex flex-col bg-white border-l border-gray-200 text-[#29315F] overflow-hidden">

  {#if hovered}
    <!-- ── Header ──────────────────────────────────────────────────────── -->
    <div class="shrink-0 px-3 py-2.5 border-b border-gray-200 bg-[#F0F1F5]">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="text-[13px] font-semibold leading-snug">
            {hovered.tooltipTitle ?? ''}
            {#if districtNum}
              <span class="text-gray-500 font-normal"> · District {districtNum}</span>
            {/if}
          </div>
          {#if county}
            <div class="text-[11px] text-gray-500 mt-0.5">{county} County</div>
          {/if}
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          {#if pinned}
            <span class="text-[10px] bg-[#29315F] text-white px-1.5 py-0.5 rounded font-medium">
              📌 Pinned
            </span>
            <button
              onclick={unpin}
              class="text-gray-400 hover:text-gray-700 text-lg leading-none cursor-pointer"
              title="Unpin"
            >×</button>
          {:else}
            <span class="text-[10px] text-gray-400 italic">Click to pin</span>
          {/if}
        </div>
      </div>
    </div>

    <!-- ── Scrollable content ───────────────────────────────────────────── -->
    <div class="flex-1 overflow-y-auto px-3 py-2 text-[12px]">

      <!-- District Metrics -->
      <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        District Metrics
      </div>
      <table class="w-full border-collapse mb-3">
        <tbody>
          {#each planRows as [label, value, share, largest]}
            <tr class="border-b border-gray-100 last:border-0">
              <td class="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top">{label}</td>
              <td class="text-right py-[3px] align-top">
                <div class="font-medium tabular-nums flex items-center justify-end gap-1 flex-wrap">
                  {value}
                  {#if share != null}
                    <span class="text-gray-400 font-normal text-[11px]">{sharePct(share)}</span>
                  {/if}
                  {#if largest}
                    <span class="inline-block bg-amber-100 text-amber-700 text-[9px] font-semibold px-[4px] py-[1px] rounded leading-tight" title="Largest among all districts">▲ max</span>
                  {/if}
                </div>
                {#if share != null}
                  <div class="w-full h-[3px] bg-gray-100 rounded-full mt-[2px]">
                    <div class="h-[3px] rounded-full {largest ? 'bg-amber-400' : 'bg-blue-400'}" style="width: {Math.min(share * 100, 100)}%"></div>
                  </div>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <!-- Census Demographics -->
      {#if demData}
        <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Census Demographics (ACS 5-yr)
        </div>
        {#if demoRows.length === 0}
          <p class="text-[11px] text-gray-400 italic mb-3">No ACS data for this district.</p>
        {:else}
          <table class="w-full border-collapse mb-3">
            <tbody>
              {#each demoRows as [label, value, share, largest]}
                <tr class="border-b border-gray-100 last:border-0">
                  <td class="text-gray-500 py-[3px] pr-2 whitespace-nowrap align-top">{label}</td>
                  <td class="text-right py-[3px] align-top">
                    <div class="font-medium tabular-nums flex items-center justify-end gap-1 flex-wrap">
                      {value}
                      {#if share != null}
                        <span class="text-gray-400 font-normal text-[11px]">{sharePct(share)}</span>
                      {/if}
                      {#if largest}
                        <span class="inline-block bg-amber-100 text-amber-700 text-[9px] font-semibold px-[4px] py-[1px] rounded leading-tight" title="Largest among all districts">▲ max</span>
                      {/if}
                    </div>
                    {#if share != null}
                      <div class="w-full h-[3px] bg-gray-100 rounded-full mt-[2px]">
                        <div class="h-[3px] rounded-full {largest ? 'bg-amber-400' : 'bg-blue-400'}" style="width: {Math.min(share * 100, 100)}%"></div>
                      </div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      {/if}

      <!-- County -->
      <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        County
      </div>
      <div class="mb-3 text-[12px]">
        {#if county}
          <div class="font-medium">{county} County</div>
        {:else}
          <div class="text-gray-400 italic">County data unavailable at this zoom</div>
        {/if}
      </div>

      <!-- Precinct -->
      <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        Precinct
      </div>
      <div class="mb-3 text-[12px]">
        {#if precinct && precinct.partisan != null}
          <table class="w-full border-collapse">
            <tbody>
              <tr class="border-b border-gray-100">
                <td class="text-gray-500 py-[3px] pr-2">Partisan Lean</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{pct(precinct.partisan as number)}</td>
              </tr>
            </tbody>
          </table>
        {:else}
          <div class="text-gray-400 italic">Zoom in for precinct-level data</div>
        {/if}
      </div>

      <!-- Legend -->
      <div class="text-gray-400 text-[10px] border-t border-gray-100 pt-2 flex flex-col gap-1">
        <div class="flex items-center gap-1.5">
          <span class="inline-block w-5 h-[3px] bg-blue-400 rounded-full shrink-0"></span>
          <span>% = district's share of state total</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="inline-block bg-amber-100 text-amber-700 text-[9px] font-semibold px-[4px] py-[1px] rounded leading-tight shrink-0">▲ max</span>
          <span>= largest district for this metric</span>
        </div>
        <div class="italic">* VAP estimates based on precincts · Census ACS 5-yr</div>
      </div>

    </div><!-- end scrollable -->

  {:else}
    <!-- ── Empty state ──────────────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col items-center justify-center text-center text-gray-400 px-4 gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5"/>
        <path d="M8 10h8M8 14h4"/>
        <circle cx="17" cy="17" r="4"/>
        <path d="m21 21-1.5-1.5"/>
      </svg>
      <div class="text-[13px] font-medium text-gray-500">No district selected</div>
      <div class="text-[11px]">Hover over a district to preview details, or click to pin them here.</div>
    </div>
  {/if}
</div>
