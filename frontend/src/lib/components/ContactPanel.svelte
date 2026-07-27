<script lang="ts">
  import { getPinnedLngLat, getIsPinned } from '../stores/state.svelte';
  import { resolveReps, type Legislator, type ResolvedReps } from '../data/legislators';

  interface Props {
    /** compact = drawer tab layout; full = desktop-sidebar inline layout */
    variant?: 'compact' | 'full';
  }
  let { variant = 'full' }: Props = $props();

  let pin = $derived(getPinnedLngLat());
  let pinned = $derived(getIsPinned());

  let reps = $state<ResolvedReps | null>(null);
  let loading = $state(false);
  let errorMsg = $state('');

  let stance = $state<'support' | 'oppose' | 'undecided' | 'general'>('general');
  let topic  = $state('');

  $effect(() => {
    if (!pin || !pinned) { reps = null; return; }
    const { lng, lat } = pin;
    loading = true;
    errorMsg = '';
    resolveReps(lng, lat)
      .then((r) => { reps = r; if (!r) errorMsg = 'Legislator database not available'; })
      .catch((e) => { errorMsg = e?.message ?? 'Lookup failed'; })
      .finally(() => { loading = false; });
  });

  function mailtoUrl(rep: Legislator): string {
    if (!rep.email) return '';
    const subject = buildSubject();
    const body = buildBody(rep);
    return `mailto:${encodeURIComponent(rep.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function telUrl(rep: Legislator): string {
    const raw = rep.phones?.[0];
    if (!raw) return '';
    const digits = raw.replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : '';
  }

  const RESISTBOT_SMS = 'sms:50409?body=RESIST';

  function buildSubject(): string {
    if (stance === 'support' && topic) return `Please support: ${topic}`;
    if (stance === 'oppose'  && topic) return `Please oppose: ${topic}`;
    if (topic) return `Your constituent on: ${topic}`;
    return 'Your constituent';
  }

  function buildBody(rep: Legislator): string {
    const t = topic || '[the issue that matters to you]';
    const opener = `Dear ${rep.title || 'Representative'} ${rep.name.split(' ').slice(-1)[0]},`;
    const stanceLine =
      stance === 'support'
        ? `I am writing to urge you to support ${t}.`
        : stance === 'oppose'
        ? `I am writing to urge you to oppose ${t}.`
        : stance === 'undecided'
        ? `I am writing to share my concerns about ${t} and to ask where you stand.`
        : `I am writing as your constituent to share my views on ${t}.`;
    return [
      opener,
      '',
      'I am your constituent.',
      stanceLine,
      '',
      '[Add a sentence or two about why this matters to you personally.]',
      '',
      'Thank you for your time and for representing our district.',
      '',
      'Sincerely,',
      '[Your name]',
      '[Your address]',
    ].join('\n');
  }

  /** Statewide seats report district "Georgia" — don't render "District Georgia". */
  function districtSuffix(rep: Legislator): string {
    const d = (rep.district ?? '').trim();
    return /^\d+$/.test(d) ? ` · District ${d}` : '';
  }

  function partyBadge(p: string): string {
    const short = p?.[0] ?? '?';
    if (short === 'D') return 'bg-blue-100 text-blue-700';
    if (short === 'R') return 'bg-red-100 text-red-700';
    return 'bg-gray-200 text-gray-700';
  }

  // Current U.S. President — federal, shown irrespective of pin location.
  // Update when a new administration takes office.
  const PRESIDENT: Legislator = {
    id: 'us-president',
    name: 'Donald J. Trump',
    party: 'Republican',
    image: '',
    email: '',
    phones: ['comments: (202) 456-1111'],
    addresses: ['The White House, 1600 Pennsylvania Ave NW, Washington, DC 20500'],
    website: 'https://www.whitehouse.gov/contact/',
    district: '',
    title: 'President',
    org_classification: 'executive',
  };
</script>

{#snippet card(rep: Legislator, chamberLabel: string)}
  <div class="border border-gray-200 rounded-md bg-white p-2.5 mb-2">
    <div class="flex items-start gap-2">
      {#if rep.image}
        <img src={rep.image} alt="" class="w-10 h-10 rounded-full object-cover shrink-0 bg-gray-100" />
      {:else}
        <div class="w-10 h-10 rounded-full bg-gray-100 shrink-0"></div>
      {/if}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[12px] font-semibold text-[#29315F] leading-tight">{rep.name}</span>
          <span class="text-[9px] font-semibold px-1 py-[1px] rounded {partyBadge(rep.party)}">
            {(rep.party ?? '')[0] ?? '?'}
          </span>
        </div>
        <div class="text-[10px] text-gray-500">
          {chamberLabel}{districtSuffix(rep)}
        </div>
      </div>
    </div>

    <div class="flex flex-wrap gap-1.5 mt-2">
      {#if rep.email}
        <a href={mailtoUrl(rep)}
           class="text-[11px] px-2 py-1 rounded bg-[#29315F] text-white hover:bg-[#3a4580]">
          ✉ Email
        </a>
      {/if}
      {#if telUrl(rep)}
        <a href={telUrl(rep)}
           class="text-[11px] px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
          ☎ Call
        </a>
      {/if}
      <a href={RESISTBOT_SMS}
         class="text-[11px] px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
        💬 Text via Resistbot
      </a>
      {#if rep.website}
        <a href={rep.website} target="_blank" rel="noopener noreferrer"
           class="text-[11px] px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50">
          Profile ↗
        </a>
      {/if}
    </div>
  </div>
{/snippet}

<div class={variant === 'compact' ? 'text-[13px]' : 'text-[12px]'}>

  {#if !pinned || !pin}
    <p class="text-gray-400 italic text-[11px]">
      Click anywhere on the map, or search an address, to see your state and
      federal representatives and contact them directly.
    </p>
  {:else if loading}
    <p class="text-gray-500 italic text-[11px]">Looking up your representatives…</p>
  {:else if errorMsg}
    <p class="text-red-600 text-[11px]">{errorMsg}</p>
  {:else if reps}
    <!-- Message composer controls -->
    <div class="mb-2 p-2 bg-[#F0F1F5] rounded">
      <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Your message
      </div>
      <div class="flex flex-wrap gap-1 mb-1.5">
        {#each [
          { k: 'general',    l: 'General' },
          { k: 'support',    l: 'Support' },
          { k: 'oppose',     l: 'Oppose'  },
          { k: 'undecided',  l: 'Ask'     },
        ] as opt}
          <button type="button"
                  class="text-[10px] px-2 py-[3px] rounded border
                         {stance === opt.k
                            ? 'bg-[#29315F] text-white border-[#29315F]'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}"
                  onclick={() => stance = opt.k as any}>
            {opt.l}
          </button>
        {/each}
      </div>
      <input type="text"
             bind:value={topic}
             placeholder="Topic or bill (e.g. HB 481, redistricting reform)"
             class="w-full text-[11px] px-2 py-1 rounded border border-gray-300 bg-white
                    focus:outline-none focus:border-blue-400" />
    </div>

    <!--
      Ordered most local first. The seats that change with the clicked point
      lead — Georgia House (smallest district), Georgia Senate, then U.S.
      House. The two U.S. Senate seats and the President are the same for
      every point in the state, so they sit at the bottom.
    -->
    {#if reps.state_house}
      <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Georgia House</div>
      {@render card(reps.state_house, 'State Representative')}
    {:else if reps.districts.state_house === null}
      <p class="text-[10px] text-gray-400 italic mb-2">Couldn't resolve your Georgia House district.</p>
    {/if}

    {#if reps.state_senate}
      <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Georgia Senate</div>
      {@render card(reps.state_senate, 'State Senator')}
    {:else if reps.districts.state_senate === null}
      <p class="text-[10px] text-gray-400 italic mb-2">Couldn't resolve your Georgia Senate district.</p>
    {/if}

    {#if reps.us_house}
      <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">U.S. House</div>
      {@render card(reps.us_house, 'U.S. Representative')}
    {:else if reps.districts.us_house === null}
      <p class="text-[10px] text-gray-400 italic mb-2">Couldn't resolve your U.S. Congressional district.</p>
    {/if}

    <!-- Statewide / national — identical for every point on the map -->
    {#if reps.us_senate.length}
      <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 mt-3 pt-2 border-t border-gray-100">
        U.S. Senate <span class="normal-case font-normal text-gray-400">· same statewide</span>
      </div>
      {#each reps.us_senate as rep}
        {@render card(rep, 'U.S. Senator')}
      {/each}
    {/if}

    <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
      President <span class="normal-case font-normal text-gray-400">· national</span>
    </div>
    {@render card(PRESIDENT, 'U.S. President')}

    <div class="text-[9px] text-gray-400 italic mt-2 leading-snug">
      Contact info sourced from openstates.org. Text link opens SMS to Resistbot (50409).
      On desktop without an SMS app, text <b>RESIST</b> to <b>50409</b> from your phone.
    </div>
  {/if}
</div>
