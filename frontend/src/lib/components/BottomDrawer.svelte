<script lang="ts">
  import { slide } from 'svelte/transition';
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

  // ── Auto-hide ────────────────────────────────────────────────────────────
  let expanded = $state(false);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function expand() {
    expanded = true;
    scheduleCollapse();
  }

  function scheduleCollapse(ms = 4000) {
    clearTimeout(hideTimer ?? undefined);
    hideTimer = setTimeout(() => { expanded = false; }, ms);
  }

  function cancelCollapse() {
    clearTimeout(hideTimer ?? undefined);
    hideTimer = null;
  }

  function toggleExpanded() {
    if (expanded) {
      expanded = false;
      cancelCollapse();
    } else {
      expand();
    }
  }

  // Expand on district hover; collapse quickly when cursor leaves all districts
  let _prevHovered = false;
  $effect(() => {
    if (hovered) {
      _prevHovered = true;
      expand();
    } else if (_prevHovered) {
      _prevHovered = false;
      scheduleCollapse(1500);
    }
  });

  // ── Opacity ──────────────────────────────────────────────────────────────
  const OPACITY_KEY = 'fdex_drawer_opacity';
  let opacity = $state(Number(localStorage.getItem(OPACITY_KEY) ?? 85));
  $effect(() => { localStorage.setItem(OPACITY_KEY, String(opacity)); });

  // ── Info overlay ─────────────────────────────────────────────────────────
  let activeInfoKey = $state<string | null>(null);

  const INFO: Record<string, { title: string; desc: string }> = {
    population: {
      title: 'Total Population',
      desc: 'The total number of residents in the district based on the 2020 Census. This includes all residents regardless of citizenship, age, or voting eligibility. Equal population across districts is the primary requirement of the "one person, one vote" standard in redistricting.',
    },
    vap: {
      title: 'Voting Age Population (VAP)',
      desc: 'The number of residents aged 18 or older based on the 2020 Census. VAP represents the pool of potentially eligible voters before accounting for citizenship or other eligibility factors. Estimates here are derived from precinct-level Census data.',
    },
    white_vap: {
      title: 'White Voting Age Population',
      desc: 'The estimated share and count of non-Hispanic white residents aged 18+, derived from 2020 Census precinct data. Racial composition of a district is one factor courts examine when evaluating compliance with the Voting Rights Act and assessing community representation.',
    },
    black_vap: {
      title: 'Black Voting Age Population (any-part)',
      desc: 'The share of residents aged 18+ who identified as Black or African American alone or in combination with one or more other races — the "any-part Black" measure. This is the standard used in Voting Rights Act analysis (Gingles preconditions): it counts anyone who selected Black regardless of whether they also selected another race.',
    },
    asian_vap: {
      title: 'Asian Voting Age Population',
      desc: 'The estimated share and count of non-Hispanic Asian residents aged 18+. The Voting Rights Act protects Asian American voters as a language minority group in certain jurisdictions from having their voting strength diluted.',
    },
    hispanic_vap: {
      title: 'Hispanic Voting Age Population',
      desc: 'The estimated share and count of Hispanic or Latino residents aged 18+, of any race. The Voting Rights Act protects Hispanic voters\' equal opportunity to participate in the political process and elect representatives of their choice.',
    },
    minority_vap: {
      title: 'Minority (BIPOC) Voting Age Population',
      desc: 'The combined share of Black, Indigenous, and People of Color (BIPOC) residents aged 18+. This broad measure captures the total non-white voting-age population in the district. Note that individuals may identify with multiple racial/ethnic groups.',
    },
    partisan: {
      title: 'Partisan Lean (2018–2022)',
      desc: 'The district\'s average Democratic share of the two-party vote across five statewide elections: Governor (2018), President (2020), U.S. Senate Runoff (2021), Governor (2022), and U.S. Senate (2022). Values above 50% indicate the district leaned Democratic on average; values below 50% Republican. This is a historical summary based on actual results — it does not predict future outcomes.',
    },
    election_results: {
      title: 'Per-Election Results & Wasted Votes',
      desc: 'Each bar shows the two-party vote split and wasted-vote breakdown for one election cycle.\n\nBlue = Democratic share (left); Red = Republican share (right). The white center line marks the 50% winning threshold.\n\nDark color = votes that counted toward winning the seat (exactly 50% of all votes cast — just enough to secure the majority). Faded color = wasted votes: surplus votes the winner didn\'t need beyond 50%, or all votes cast for the losing party (since losing produces no seat regardless).',
    },
    efficiency_gap: {
      title: 'Efficiency Gap',
      desc: 'A quantitative measure of vote efficiency symmetry across a district plan, introduced by Stephanopoulos & McGhee (2015). It is calculated as: (total wasted votes for Party D − total wasted votes for Party R) ÷ total votes cast. A value near zero indicates both parties waste similar fractions of their votes. A large positive or negative value suggests the plan systematically produces more wasted votes for one party than the other. Scholars generally consider values above ±7–8% to be significant.',
    },
    mean_median: {
      title: 'Mean–Median Difference',
      desc: 'The difference between the mean (average) and median district-level partisan vote share across all districts in the plan. When supporters of one party are heavily concentrated in a few districts, the mean and median diverge. A value near zero suggests voter distributions are more symmetric across districts.',
    },
    median_income: {
      title: 'Median Household Income',
      desc: 'The midpoint of household income in the district, from the Census Bureau\'s American Community Survey (ACS) 5-year estimates. Half of households earn above this figure, half below.',
    },
    poverty: {
      title: 'Below Poverty Rate',
      desc: 'The percentage of residents with income below the federal poverty threshold, from ACS 5-year estimates.',
    },
    bachelors: {
      title: "Bachelor's Degree or Higher",
      desc: "The share of adults aged 25+ who hold at least a bachelor's degree, from ACS 5-year estimates.",
    },
    no_vehicle: {
      title: 'No-Vehicle Households',
      desc: 'The share of households with no vehicle available, from ACS 5-year estimates. This metric can reflect access constraints — including access to polling locations.',
    },
    uninsured: {
      title: 'Uninsured Rate',
      desc: 'The share of the civilian noninstitutionalized population without health insurance coverage, from ACS 5-year estimates.',
    },
    unemployment: {
      title: 'Unemployment Rate',
      desc: 'The share of the civilian labor force that is unemployed and actively seeking work, from ACS 5-year estimates.',
    },
  };

  const LABEL_TO_INFO: Record<string, string> = {
    'Population':       'population',
    'VAP 2020':         'vap',
    'White VAP':        'white_vap',
    'Black VAP (any)':  'black_vap',
    'Asian VAP':        'asian_vap',
    'Hispanic VAP':     'hispanic_vap',
    'Minority VAP':     'minority_vap',
    'Partisan Lean':    'partisan',
    'Median Income':    'median_income',
    'Below Poverty':    'poverty',
    "Bachelor's+":      'bachelors',
    'No Vehicle HH':    'no_vehicle',
    'Uninsured':        'uninsured',
    'Unemployment':     'unemployment',
  };

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
    { key: 'g18_pct_dem', label: '2018 Gov' },
    { key: 'p20_pct_dem', label: '2020 President' },
    { key: 'r21_pct_dem', label: '2021 US Sen Runoff' },
    { key: 'g22_pct_dem', label: '2022 Gov' },
    { key: 's22_pct_dem', label: '2022 US Sen' },
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
      ['Black VAP (any)',    pct(p.pct_bvp),
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
      ['Partisan Lean',
        p.partisan != null
          ? `${(p.partisan * 100).toFixed(1)}% D · ${((1 - p.partisan) * 100).toFixed(1)}% R`
          : '—',
        null, false],
    ];
  })());

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

  // Partisan lean display for strip
  let partisanSummary = $derived((() => {
    if (!hovered?.properties?.partisan) return null;
    const p = hovered.properties.partisan as number;
    return `${(p * 100).toFixed(1)}% D · ${((1 - p) * 100).toFixed(1)}% R`;
  })());
</script>

<!-- ── Info overlay (fixed, above everything) ────────────────────────── -->
{#if activeInfoKey && INFO[activeInfoKey]}
  <div
    class="fixed inset-0 bg-black/30 z-50 flex items-end"
    role="button"
    tabindex="0"
    onclick={() => activeInfoKey = null}
    onkeydown={(e) => e.key === 'Escape' && (activeInfoKey = null)}
  >
    <div
      class="w-full bg-white border-t-2 border-[#29315F] shadow-xl p-4 max-h-[50%] overflow-y-auto"
      role="none"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-start justify-between mb-2">
        <div class="text-[13px] font-semibold text-[#29315F] leading-snug pr-2">
          {INFO[activeInfoKey].title}
        </div>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-700 text-[16px] leading-none shrink-0 mt-0.5 cursor-pointer"
          onclick={() => activeInfoKey = null}
          aria-label="Close"
        >✕</button>
      </div>
      <p class="text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">
        {INFO[activeInfoKey].desc}
      </p>
    </div>
  </div>
{/if}

<!-- ── Bottom drawer ─────────────────────────────────────────────────────── -->
<div
  class="absolute bottom-0 left-0 right-0 z-20 flex flex-col"
  role="region"
  aria-label="District statistics"
  onmouseenter={cancelCollapse}
  onmouseleave={() => scheduleCollapse()}
>
  <!-- Expanded content panel (renders above the strip) -->
  {#if expanded}
    <div
      transition:slide={{ duration: 200 }}
      class="h-[210px] border-t border-gray-200 flex overflow-hidden shadow-[0_-4px_12px_rgba(0,0,0,0.12)]"
      style="background-color: rgba(255,255,255,{opacity/100})"
    >
      {#if hovered}
        <!-- ── District mode: 4 columns ──────────────────────────────── -->

        <!-- Col 1: District Metrics -->
        <div class="flex-1 flex flex-col min-w-0 overflow-y-auto border-r border-gray-200 px-2.5 py-2 text-[11px] text-[#29315F]">
          <div class="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            District Metrics
          </div>
          <table class="w-full border-collapse">
            <tbody>
              {#each planRows as [label, value, share, largest]}
                <tr class="border-b border-gray-100 last:border-0">
                  <td class="text-gray-500 py-[2px] pr-1.5 whitespace-nowrap align-top text-[10px]">
                    {label}
                    {#if LABEL_TO_INFO[label]}
                      <button
                        type="button"
                        class="text-gray-300 hover:text-blue-400 ml-0.5 text-[9px] leading-none align-middle cursor-pointer"
                        onclick={() => activeInfoKey = LABEL_TO_INFO[label]}
                        title="What is this?"
                      >ⓘ</button>
                    {/if}
                  </td>
                  <td class="text-right py-[2px] align-top">
                    <div class="font-medium tabular-nums flex items-center justify-end gap-1 flex-wrap text-[10px]">
                      {value}
                      {#if share != null}
                        <span class="text-gray-400 font-normal text-[9px]">{sharePct(share)}</span>
                      {/if}
                      {#if largest}
                        <span class="inline-block bg-amber-100 text-amber-700 text-[8px] font-semibold px-[3px] py-[1px] rounded leading-tight">▲</span>
                      {/if}
                    </div>
                    {#if share != null}
                      <div class="w-full h-[2px] bg-gray-100 rounded-full mt-[1px]">
                        <div class="h-[2px] rounded-full {largest ? 'bg-amber-400' : 'bg-blue-400'}" style="width: {Math.min(share * 100, 100)}%"></div>
                      </div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Col 2: Election Results -->
        <div class="flex-[1.4] flex flex-col min-w-0 overflow-y-auto border-r border-gray-200 px-2.5 py-2 text-[11px]">
          <div class="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
            Election Results
            <button
              type="button"
              class="text-gray-300 hover:text-blue-400 text-[9px] leading-none cursor-pointer font-normal normal-case"
              onclick={() => activeInfoKey = 'election_results'}
              title="What is this?"
            >ⓘ</button>
          </div>

          {#if electionRows.length > 0}
            <div class="flex flex-col gap-[7px]">
              {#each electionRows as row}
                {@const dPct = row.dem * 100}
                {@const rPct = (1 - row.dem) * 100}
                {@const dWins = row.dem > 0.5}
                {@const dWasted = dWins ? dPct - 50 : dPct}
                {@const rWasted = dWins ? rPct : rPct - 50}
                <div>
                  <div class="flex items-center justify-between mb-[1px]">
                    <span class="text-gray-500 text-[10px]">{row.label}</span>
                    <span class="text-[10px] font-semibold {dWins ? 'text-blue-600' : 'text-red-600'}">
                      {dWins ? 'D' : 'R'} +{Math.abs(dPct - rPct).toFixed(1)}
                    </span>
                  </div>
                  <div class="relative w-full h-[11px] rounded overflow-hidden flex">
                    {#if dWins}
                      <div class="h-full bg-blue-600" style="width:50%" title="D efficient: 50.0%"></div>
                      <div class="h-full bg-blue-300" style="width:{dWasted}%" title="D surplus"></div>
                      <div class="h-full bg-red-200"  style="width:{rPct}%"    title="R wasted"></div>
                    {:else if row.dem < 0.5}
                      <div class="h-full bg-blue-200" style="width:{dPct}%"    title="D wasted"></div>
                      <div class="h-full bg-red-600"  style="width:50%"        title="R efficient: 50.0%"></div>
                      <div class="h-full bg-red-300"  style="width:{rWasted}%" title="R surplus"></div>
                    {:else}
                      <div class="h-full bg-blue-500" style="width:50%"></div>
                      <div class="h-full bg-red-500"  style="width:50%"></div>
                    {/if}
                    <div class="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/80 -translate-x-1/2"></div>
                  </div>
                  <div class="flex tabular-nums mt-[1px] items-start">
                    <span class="text-[9px] {dWins ? 'text-blue-700' : 'text-blue-400'}">D {dPct.toFixed(1)}%</span>
                    <span class="text-[9px] text-gray-300 mx-0.5">·</span>
                    <span class="text-[9px] text-gray-400">{dWasted.toFixed(1)}% wasted</span>
                    <div class="flex-1 text-right">
                      <span class="text-[9px] text-gray-400">{rWasted.toFixed(1)}% wasted</span>
                      <span class="text-[9px] text-gray-300 mx-0.5">·</span>
                      <span class="text-[9px] {!dWins ? 'text-red-700' : 'text-red-400'}">R {rPct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-[10px] text-gray-400 italic">No election data</p>
          {/if}
        </div>

        <!-- Col 3: Census Demographics -->
        <div class="flex-1 flex flex-col min-w-0 overflow-y-auto border-r border-gray-200 px-2.5 py-2 text-[11px] text-[#29315F]">
          <div class="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Census Demographics
          </div>
          {#if demoRows.length > 0}
            <table class="w-full border-collapse">
              <tbody>
                {#each demoRows as [label, value, share, largest]}
                  <tr class="border-b border-gray-100 last:border-0">
                    <td class="text-gray-500 py-[2px] pr-1.5 whitespace-nowrap align-top text-[10px]">
                      {label}
                      {#if LABEL_TO_INFO[label]}
                        <button
                          type="button"
                          class="text-gray-300 hover:text-blue-400 ml-0.5 text-[9px] leading-none align-middle cursor-pointer"
                          onclick={() => activeInfoKey = LABEL_TO_INFO[label]}
                          title="What is this?"
                        >ⓘ</button>
                      {/if}
                    </td>
                    <td class="text-right py-[2px] align-top">
                      <div class="font-medium tabular-nums flex items-center justify-end gap-1 flex-wrap text-[10px]">
                        {value}
                        {#if share != null}
                          <span class="text-gray-400 font-normal text-[9px]">{sharePct(share)}</span>
                        {/if}
                        {#if largest}
                          <span class="inline-block bg-amber-100 text-amber-700 text-[8px] font-semibold px-[3px] py-[1px] rounded leading-tight">▲</span>
                        {/if}
                      </div>
                      {#if share != null}
                        <div class="w-full h-[2px] bg-gray-100 rounded-full mt-[1px]">
                          <div class="h-[2px] rounded-full {largest ? 'bg-amber-400' : 'bg-blue-400'}" style="width: {Math.min(share * 100, 100)}%"></div>
                        </div>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <p class="text-[10px] text-gray-400 italic">No ACS data for this district</p>
          {/if}
        </div>

        <!-- Col 4: Location + Fairness -->
        <div class="flex-1 flex flex-col min-w-0 overflow-y-auto px-2.5 py-2 text-[11px] text-[#29315F]">
          <!-- County + Precinct -->
          <div class="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Location</div>
          <table class="w-full border-collapse mb-2">
            <tbody>
              <tr class="border-b border-gray-100">
                <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">County</td>
                <td class="text-right py-[2px] font-medium text-[10px]">{county ? `${county} Co.` : '—'}</td>
              </tr>
              <tr class="border-b border-gray-100 last:border-0">
                <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">Precinct Lean</td>
                <td class="text-right py-[2px] font-medium text-[10px]">
                  {precinct?.partisan != null ? pct(precinct.partisan as number) : 'zoom in'}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Efficiency Gap -->
          {#if totals?.elections.some((e) => e.hasData)}
            <div class="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              Efficiency Gap
              <button type="button" class="text-gray-300 hover:text-blue-400 text-[9px] leading-none cursor-pointer" onclick={() => activeInfoKey = 'efficiency_gap'} title="What is this?">ⓘ</button>
            </div>
            <table class="w-full border-collapse mb-2">
              <tbody>
                {#each totals.elections.filter((e) => e.hasData) as el}
                  <tr class="border-b border-gray-100 last:border-0">
                    <td class="text-gray-500 py-[2px] pr-1.5 text-[10px] whitespace-nowrap">{el.label}</td>
                    <td class="text-right py-[2px] font-medium tabular-nums text-[10px] {el.eg > 0 ? 'text-blue-600' : 'text-red-600'}">
                      {el.eg > 0 ? '+' : ''}{(el.eg * 100).toFixed(1)}%
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>

            <!-- Mean-Median -->
            {#if totals.meanPartisan > 0}
              <div class="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                Mean–Median
                <button type="button" class="text-gray-300 hover:text-blue-400 text-[9px] leading-none cursor-pointer" onclick={() => activeInfoKey = 'mean_median'} title="What is this?">ⓘ</button>
              </div>
              <table class="w-full border-collapse">
                <tbody>
                  <tr class="border-b border-gray-100">
                    <td class="text-gray-500 py-[2px] text-[10px]">Mean</td>
                    <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">{pct(totals.meanPartisan)}</td>
                  </tr>
                  <tr class="border-b border-gray-100">
                    <td class="text-gray-500 py-[2px] text-[10px]">Median</td>
                    <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">{pct(totals.medianPartisan)}</td>
                  </tr>
                  <tr>
                    <td class="text-gray-500 py-[2px] text-[10px] font-medium">Diff</td>
                    <td class="text-right py-[2px] font-medium tabular-nums text-[10px] {totals.meanMedian > 0 ? 'text-blue-600' : 'text-red-600'}">
                      {totals.meanMedian > 0 ? '+' : ''}{(totals.meanMedian * 100).toFixed(2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            {/if}
          {/if}
        </div>

      {:else}
        <!-- ── Statewide mode: 3 columns ──────────────────────────────── -->

        <!-- Col 1: Statewide Metrics -->
        <div class="flex-1 flex flex-col min-w-0 overflow-y-auto border-r border-gray-200 px-2.5 py-2 text-[11px] text-[#29315F]">
          <div class="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Statewide Metrics</div>
          {#if totals}
            <table class="w-full border-collapse">
              <tbody>
                <tr class="border-b border-gray-100">
                  <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">
                    Population
                    <button type="button" class="text-gray-300 hover:text-blue-400 ml-0.5 text-[9px] leading-none align-middle cursor-pointer" onclick={() => activeInfoKey = 'population'}>ⓘ</button>
                  </td>
                  <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">{fmt(totals.pop)}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">
                    VAP 2020
                    <button type="button" class="text-gray-300 hover:text-blue-400 ml-0.5 text-[9px] leading-none align-middle cursor-pointer" onclick={() => activeInfoKey = 'vap'}>ⓘ</button>
                  </td>
                  <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">{fmt(totals.tvap)}</td>
                </tr>
                {#if totals.wvap > 0}
                  <tr class="border-b border-gray-100">
                    <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">White VAP</td>
                    <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">
                      {totals.tvap > 0 ? pct(totals.wvap / totals.tvap) : '—'}
                      <span class="text-gray-400 font-normal text-[9px] ml-0.5">{fmt(totals.wvap)}</span>
                    </td>
                  </tr>
                {/if}
                <tr class="border-b border-gray-100">
                  <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">Black VAP</td>
                  <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">
                    {totals.tvap > 0 ? pct(totals.bvap / totals.tvap) : '—'}
                    <span class="text-gray-400 font-normal text-[9px] ml-0.5">{fmt(totals.bvap)}</span>
                  </td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">Asian VAP</td>
                  <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">
                    {totals.tvap > 0 ? pct(totals.avap / totals.tvap) : '—'}
                    <span class="text-gray-400 font-normal text-[9px] ml-0.5">{fmt(totals.avap)}</span>
                  </td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">Hispanic VAP</td>
                  <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">
                    {totals.tvap > 0 ? pct(totals.hvap / totals.tvap) : '—'}
                    <span class="text-gray-400 font-normal text-[9px] ml-0.5">{fmt(totals.hvap)}</span>
                  </td>
                </tr>
                <tr>
                  <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">Minority VAP</td>
                  <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">
                    {totals.tvap > 0 ? pct(totals.bipocvap / totals.tvap) : '—'}
                    <span class="text-gray-400 font-normal text-[9px] ml-0.5">{fmt(totals.bipocvap)}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          {:else}
            <p class="text-[10px] text-gray-400 italic">Loading…</p>
          {/if}
        </div>

        <!-- Col 2: ACS Statewide -->
        <div class="flex-1 flex flex-col min-w-0 overflow-y-auto border-r border-gray-200 px-2.5 py-2 text-[11px] text-[#29315F]">
          <div class="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Census Demographics (ACS 5-yr)</div>
          {#if demTot}
            <table class="w-full border-collapse">
              <tbody>
                <tr class="border-b border-gray-100">
                  <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">Below Poverty</td>
                  <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">{fmt(demTot.poverty_count)}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">Bachelor's+</td>
                  <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">{fmt(demTot.bachelors_plus_count)}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">Married HH</td>
                  <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">{fmt(demTot.married_hh_count)}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">Single Parent</td>
                  <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">{fmt(demTot.single_parent_count)}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">No Vehicle HH</td>
                  <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">{fmt(demTot.no_vehicle_count)}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">Uninsured</td>
                  <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">{fmt(demTot.uninsured_count)}</td>
                </tr>
                <tr>
                  <td class="text-gray-500 py-[2px] pr-1.5 text-[10px]">Unemployed</td>
                  <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">{fmt(demTot.unemployed_count)}</td>
                </tr>
              </tbody>
            </table>
          {:else}
            <p class="text-[10px] text-gray-400 italic">No ACS data loaded</p>
          {/if}
        </div>

        <!-- Col 3: Fairness Metrics -->
        <div class="flex-[1.4] flex flex-col min-w-0 overflow-y-auto px-2.5 py-2 text-[11px] text-[#29315F]">
          {#if totals?.elections.some((e) => e.hasData)}
            <div class="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              Efficiency Gap
              <button type="button" class="text-gray-300 hover:text-blue-400 text-[9px] leading-none cursor-pointer" onclick={() => activeInfoKey = 'efficiency_gap'}>ⓘ</button>
            </div>
            <table class="w-full border-collapse mb-2">
              <tbody>
                {#each totals.elections.filter((e) => e.hasData) as el}
                  <tr class="border-b border-gray-100 last:border-0">
                    <td class="text-gray-500 py-[2px] pr-1.5 text-[10px] whitespace-nowrap">{el.label}</td>
                    <td class="text-right py-[2px] font-medium tabular-nums text-[10px] {el.eg > 0 ? 'text-blue-600' : 'text-red-600'}">
                      {el.eg > 0 ? '+' : ''}{(el.eg * 100).toFixed(1)}%
                    </td>
                    <td class="text-right py-[2px] text-gray-400 text-[9px] pl-1 whitespace-nowrap">
                      {el.eg > 0 ? 'D wasted > R' : 'R wasted > D'}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
            <div class="text-gray-400 text-[9px] mb-2 italic">EG = (wasted D − wasted R) ÷ total votes</div>

            {#if totals.meanPartisan > 0}
              <div class="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                Mean–Median Difference
                <button type="button" class="text-gray-300 hover:text-blue-400 text-[9px] leading-none cursor-pointer" onclick={() => activeInfoKey = 'mean_median'}>ⓘ</button>
              </div>
              <table class="w-full border-collapse">
                <tbody>
                  <tr class="border-b border-gray-100">
                    <td class="text-gray-500 py-[2px] text-[10px]">Mean partisan</td>
                    <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">{pct(totals.meanPartisan)}</td>
                  </tr>
                  <tr class="border-b border-gray-100">
                    <td class="text-gray-500 py-[2px] text-[10px]">Median partisan</td>
                    <td class="text-right py-[2px] font-medium tabular-nums text-[10px]">{pct(totals.medianPartisan)}</td>
                  </tr>
                  <tr>
                    <td class="text-gray-500 py-[2px] text-[10px] font-medium">MM Difference</td>
                    <td class="text-right py-[2px] font-medium tabular-nums text-[10px] {totals.meanMedian > 0 ? 'text-blue-600' : 'text-red-600'}">
                      {totals.meanMedian > 0 ? '+' : ''}{(totals.meanMedian * 100).toFixed(2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            {/if}
          {:else}
            <div class="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Fairness Metrics</div>
            <p class="text-[10px] text-gray-400 italic">No election data loaded</p>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  <!-- ── Collapsed strip (always visible at very bottom) ──────────────── -->
  <div
    class="h-7 border-t border-gray-300 flex items-center gap-2.5 px-3 cursor-pointer select-none shrink-0"
    style="background-color: rgba(240,241,245,{opacity/100})"
    role="button"
    tabindex="0"
    onclick={toggleExpanded}
    onkeydown={(e) => e.key === 'Enter' && toggleExpanded()}
  >
    {#if hovered}
      <span class="text-[11px] font-semibold text-[#29315F] shrink-0">
        {hovered.tooltipTitle ?? ''}{districtNum ? ` · District ${districtNum}` : ''}
      </span>
      {#if partisanSummary}
        <span class="text-[10px] text-gray-500 shrink-0">{partisanSummary}</span>
      {/if}
      {#if hovered.properties?.pct_bvp != null}
        <span class="text-[10px] text-gray-400 shrink-0">
          · Black VAP {((hovered.properties.pct_bvp as number) * 100).toFixed(1)}%
        </span>
      {/if}
      {#if county}
        <span class="text-[10px] text-gray-400 shrink-0">· {county} Co.</span>
      {/if}
    {:else}
      <span class="text-[10px] text-gray-500">Georgia Statewide · Hover a district for details</span>
    {/if}
    <div class="ml-auto flex items-center gap-2 shrink-0">
      <input
        type="range" min="30" max="100" step="5"
        bind:value={opacity}
        class="w-14 h-1 cursor-pointer accent-gray-400"
        title="Drawer opacity"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
      />
      <span class="text-[10px] text-gray-400">{expanded ? '▼ hide' : '▲ stats'}</span>
    </div>
  </div>
</div>
