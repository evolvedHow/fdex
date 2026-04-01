<script lang="ts">
  import {
    getHoveredDistrict,
    getStateTotals,
    getChamberDemographics,
    getDemographicsTotals,
    getLocationCounty,
    getLocationPrecinct,
  } from '../stores/state.svelte';

  let hovered  = $derived(getHoveredDistrict());
  let totals   = $derived(getStateTotals());
  let demData  = $derived(getChamberDemographics());
  let demTot   = $derived(getDemographicsTotals());
  let county   = $derived(getLocationCounty());
  let precinct = $derived(getLocationPrecinct());

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

  const ELECTION_DEFS = [
    { key: 'g18_pct_dem', label: '2018 Gen' },
    { key: 'p20_pct_dem', label: '2020 Pres' },
    { key: 'r21_pct_dem', label: '2021 Runoff' },
    { key: 'g22_pct_dem', label: '2022 Gen' },
    { key: 's22_pct_dem', label: '2022 Senate' },
  ];

  let planRows = $derived<Row[]>((() => {
    if (!hovered) return [];
    const p = hovered.properties;
    const t = totals;
    const distBvap   = (p.tvap ?? 0) * (p.pct_bvp ?? 0);
    const distAvap   = (p.tvap ?? 0) * (p.pct_avp ?? 0);
    const distHvap   = (p.tvap ?? 0) * (p.pct_hvp ?? 0);
    const distBipoc  = (p.tvap ?? 0) * (p.pct_bp_ ?? 0);
    const distWvap   = (p.tvap ?? 0) * (p.pct_wvap_al ?? 0);
    return [
      ['Population',   fmt(p.pop),
        t && p.pop  != null ? p.pop  / t.pop   : null,
        t != null && p.pop  != null && isMax(p.pop,   t.maxPop)],
      ['VAP 2020',     fmt(p.tvap),
        t && p.tvap != null ? p.tvap / t.tvap  : null,
        t != null && p.tvap != null && isMax(p.tvap,  t.maxTvap)],
      ['White VAP',    pct(p.pct_wvap_al),
        t && t.wvap    > 0 ? distWvap  / t.wvap    : null,
        t != null && t.maxWvap > 0 && isMax(distWvap, t.maxWvap)],
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

  // ── Per-district election results + wasted votes ──────────────────────────
  type ElectionRow = { label: string; dem: number; wastedDPct: number; wastedRPct: number };

  let electionRows = $derived<ElectionRow[]>((() => {
    if (!hovered) return [];
    const p = hovered.properties;
    const rows: ElectionRow[] = [];
    for (const { key, label } of ELECTION_DEFS) {
      const dem = p[key] as number | undefined;
      if (dem == null) continue;
      rows.push({
        label,
        dem,
        wastedDPct: dem > 0.5 ? dem - 0.5 : dem,
        wastedRPct: dem > 0.5 ? 1 - dem   : 0.5 - dem,
      });
    }
    return rows;
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
      ['No Vehicle HH',   pct(d.pct_no_vehicle),
        demTot.no_vehicle_count > 0 && d.no_vehicle_count != null ? d.no_vehicle_count / demTot.no_vehicle_count : null,
        isMaxF(d.pct_no_vehicle ?? 0, demTot.maxPctNoVehicle)],
      ['Uninsured',       pct(d.pct_uninsured),
        demTot.uninsured_count > 0 && d.uninsured_count != null ? d.uninsured_count / demTot.uninsured_count : null,
        isMaxF(d.pct_uninsured ?? 0, demTot.maxPctUninsured)],
      ['Unemployment',    pct(d.pct_unemployed),
        demTot.labor_force_count > 0 && d.unemployed_count != null ? d.unemployed_count / demTot.labor_force_count : null,
        isMaxF(d.pct_unemployed ?? 0, demTot.maxPctUnemployed)],
    ];
  })());
</script>

<!-- Fixed-width sidebar, full height, always visible -->
<div class="w-[300px] shrink-0 flex flex-col bg-white border-l border-gray-200 text-[#29315F] overflow-hidden">

  {#if hovered}
    <!-- ── Header ──────────────────────────────────────────────────────── -->
    <div class="shrink-0 px-3 py-2.5 border-b border-gray-200 bg-[#F0F1F5]">
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

      <!-- Election Results & Efficiency Gap -->
      {#if electionRows.length > 0}
        <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Election Results
        </div>
        <table class="w-full border-collapse mb-3">
          <thead>
            <tr>
              <td class="text-gray-400 text-[10px] py-[2px] pr-2"></td>
              <td class="text-right text-gray-400 text-[10px] py-[2px] pr-1">%Dem</td>
              <td class="text-right text-gray-400 text-[10px] py-[2px] pr-1">Wasted D</td>
              <td class="text-right text-gray-400 text-[10px] py-[2px]">Wasted R</td>
            </tr>
          </thead>
          <tbody>
            {#each electionRows as row}
              <tr class="border-b border-gray-100 last:border-0">
                <td class="text-gray-500 py-[3px] pr-2 whitespace-nowrap">{row.label}</td>
                <td class="text-right py-[3px] pr-1 font-medium tabular-nums {row.dem > 0.5 ? 'text-blue-600' : 'text-red-600'}">
                  {pct(row.dem)}
                </td>
                <td class="text-right py-[3px] pr-1 tabular-nums text-blue-500 text-[11px]">
                  {pct(row.wastedDPct)}
                </td>
                <td class="text-right py-[3px] tabular-nums text-red-500 text-[11px]">
                  {pct(row.wastedRPct)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}

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
    <!-- ── Statewide totals ──────────────────────────────────────────────── -->
    <div class="shrink-0 px-3 py-2.5 border-b border-gray-200 bg-[#F0F1F5]">
      <div class="text-[13px] font-semibold leading-snug">Georgia Statewide</div>
      <div class="text-[11px] text-gray-500 mt-0.5">Hover a district for details</div>
    </div>

    {#if totals}
      <div class="flex-1 overflow-y-auto px-3 py-2 text-[12px]">

        <!-- VAP & Population -->
        <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Statewide Metrics
        </div>
        <table class="w-full border-collapse mb-3">
          <tbody>
            <tr class="border-b border-gray-100">
              <td class="text-gray-500 py-[3px] pr-2">Population</td>
              <td class="text-right py-[3px] font-medium tabular-nums">{fmt(totals.pop)}</td>
            </tr>
            <tr class="border-b border-gray-100">
              <td class="text-gray-500 py-[3px] pr-2">VAP 2020</td>
              <td class="text-right py-[3px] font-medium tabular-nums">{fmt(totals.tvap)}</td>
            </tr>
            {#if totals.wvap > 0}
            <tr class="border-b border-gray-100">
              <td class="text-gray-500 py-[3px] pr-2">White VAP</td>
              <td class="text-right py-[3px] font-medium tabular-nums">
                {totals.tvap > 0 ? pct(totals.wvap / totals.tvap) : '—'}
                <span class="text-gray-400 font-normal text-[11px] ml-1">{fmt(totals.wvap)}</span>
              </td>
            </tr>
            {/if}
            <tr class="border-b border-gray-100">
              <td class="text-gray-500 py-[3px] pr-2">Black VAP</td>
              <td class="text-right py-[3px] font-medium tabular-nums">
                {totals.tvap > 0 ? pct(totals.bvap / totals.tvap) : '—'}
                <span class="text-gray-400 font-normal text-[11px] ml-1">{fmt(totals.bvap)}</span>
              </td>
            </tr>
            <tr class="border-b border-gray-100">
              <td class="text-gray-500 py-[3px] pr-2">Asian VAP</td>
              <td class="text-right py-[3px] font-medium tabular-nums">
                {totals.tvap > 0 ? pct(totals.avap / totals.tvap) : '—'}
                <span class="text-gray-400 font-normal text-[11px] ml-1">{fmt(totals.avap)}</span>
              </td>
            </tr>
            <tr class="border-b border-gray-100">
              <td class="text-gray-500 py-[3px] pr-2">Hispanic VAP</td>
              <td class="text-right py-[3px] font-medium tabular-nums">
                {totals.tvap > 0 ? pct(totals.hvap / totals.tvap) : '—'}
                <span class="text-gray-400 font-normal text-[11px] ml-1">{fmt(totals.hvap)}</span>
              </td>
            </tr>
            <tr class="border-b border-gray-100 last:border-0">
              <td class="text-gray-500 py-[3px] pr-2">Minority VAP</td>
              <td class="text-right py-[3px] font-medium tabular-nums">
                {totals.tvap > 0 ? pct(totals.bipocvap / totals.tvap) : '—'}
                <span class="text-gray-400 font-normal text-[11px] ml-1">{fmt(totals.bipocvap)}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Census Demographics totals -->
        {#if demTot}
          <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Census Demographics (ACS 5-yr)
          </div>
          <table class="w-full border-collapse mb-3">
            <tbody>
              <tr class="border-b border-gray-100">
                <td class="text-gray-500 py-[3px] pr-2">Below Poverty</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{fmt(demTot.poverty_count)}</td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="text-gray-500 py-[3px] pr-2">Bachelor's+</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{fmt(demTot.bachelors_plus_count)}</td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="text-gray-500 py-[3px] pr-2">Married HH</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{fmt(demTot.married_hh_count)}</td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="text-gray-500 py-[3px] pr-2">Single Parent</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{fmt(demTot.single_parent_count)}</td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="text-gray-500 py-[3px] pr-2">No Vehicle HH</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{fmt(demTot.no_vehicle_count)}</td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="text-gray-500 py-[3px] pr-2">Uninsured</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{fmt(demTot.uninsured_count)}</td>
              </tr>
              <tr class="border-b border-gray-100 last:border-0">
                <td class="text-gray-500 py-[3px] pr-2">Unemployed</td>
                <td class="text-right py-[3px] font-medium tabular-nums">{fmt(demTot.unemployed_count)}</td>
              </tr>
            </tbody>
          </table>
        {/if}

        <!-- Fairness Metrics -->
        {#if totals.elections.some((e) => e.hasData)}
          <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Fairness Metrics
          </div>

          <!-- Efficiency Gap per election -->
          <div class="text-[10px] text-gray-500 mb-0.5 font-medium">Efficiency Gap</div>
          <table class="w-full border-collapse mb-1">
            <tbody>
              {#each totals.elections.filter((e) => e.hasData) as el}
                <tr class="border-b border-gray-100 last:border-0">
                  <td class="text-gray-500 py-[3px] pr-2 whitespace-nowrap">{el.label}</td>
                  <td class="text-right py-[3px] font-medium tabular-nums {el.eg > 0 ? 'text-blue-600' : 'text-red-600'}">
                    {el.eg > 0 ? '+' : ''}{(el.eg * 100).toFixed(1)}%
                  </td>
                  <td class="text-right py-[3px] text-gray-400 text-[10px] pl-1 whitespace-nowrap">
                    {el.eg > 0 ? 'D disadvantaged' : 'R disadvantaged'}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          <div class="text-gray-400 text-[10px] mb-2 italic">
            EG = (wasted D − wasted R) / total votes. Positive = D voters packed.
          </div>

          <!-- Mean-Median Difference -->
          {#if totals.meanPartisan > 0}
            <div class="text-[10px] text-gray-500 mb-0.5 font-medium">Mean–Median Difference</div>
            <table class="w-full border-collapse mb-1">
              <tbody>
                <tr class="border-b border-gray-100">
                  <td class="text-gray-500 py-[3px] pr-2">Mean partisan</td>
                  <td class="text-right py-[3px] font-medium tabular-nums">{pct(totals.meanPartisan)}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="text-gray-500 py-[3px] pr-2">Median partisan</td>
                  <td class="text-right py-[3px] font-medium tabular-nums">{pct(totals.medianPartisan)}</td>
                </tr>
                <tr class="border-b border-gray-100 last:border-0">
                  <td class="text-gray-500 py-[3px] pr-2 font-medium">MM Difference</td>
                  <td class="text-right py-[3px] font-medium tabular-nums {totals.meanMedian > 0 ? 'text-blue-600' : 'text-red-600'}">
                    {totals.meanMedian > 0 ? '+' : ''}{(totals.meanMedian * 100).toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="text-gray-400 text-[10px] mb-3 italic">
              Mean − median of district partisan lean. Positive = D voters packed into fewer districts.
            </div>
          {/if}
        {/if}

        <div class="text-gray-400 text-[10px] border-t border-gray-100 pt-2 italic">
          * VAP estimates based on precincts · Census ACS 5-yr
        </div>

      </div>
    {:else}
      <div class="flex-1 flex items-center justify-center text-[12px] text-gray-400 italic px-4 text-center">
        Loading statewide data…
      </div>
    {/if}
  {/if}
</div>
