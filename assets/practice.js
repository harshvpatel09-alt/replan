/* =============================================================================
   Replan — practice engine
   -----------------------------------------------------------------------------
   Two modes:
     drill  untimed, feedback the moment an answer is submitted
     test   timed module, feedback withheld until the end — test-day conditions

   Handles multiple choice, student-produced response (grid-in) and free
   response. Free response is self-scored against a rubric, since no grader is
   available offline; the UI is explicit that the student is marking themselves.

   Results feed the scheduler. Topics below the weak threshold can be turned
   into real review assignments, which is the point of measuring at all.
   ============================================================================= */

const Practice = (() => {

  const WEAK = 0.7;              // below this share correct, a topic needs work
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  let S = null;                  // active session
  let tick = null;
  let onExit = () => {};
  let onReview = () => {};

  const norm = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g,'').replace(/^\+/,'');
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };

  function start({ items, mode = 'drill', label = 'Practice', minutes = null, hooks = {} }) {
    if (!items || !items.length) return false;
    onExit   = hooks.onExit   || (() => {});
    onReview = hooks.onReview || (() => {});
    S = {
      mode, label,
      items: shuffle(items),
      answers: {},               // id -> { value, correct, self }
      flagged: {},
      i: 0,
      startedAt: Date.now(),
      endsAt: minutes ? Date.now() + minutes*60000 : null,
      timerHidden: false,
      finished: false,
      reviewing: false,
      revealed: {}               // drill mode: which have been submitted
    };
    if (S.endsAt) {
      clearInterval(tick);
      tick = setInterval(() => {
        if (!S || S.finished) return clearInterval(tick);
        if (Date.now() >= S.endsAt) { finish(true); rerender(); return; }
        const el = document.getElementById('pTimer');
        if (el && !S.timerHidden) el.textContent = clock();
      }, 1000);
    }
    return true;
  }

  function clock(){
    const ms = Math.max(0, S.endsAt - Date.now());
    const m = Math.floor(ms/60000), s = Math.floor(ms/1000) % 60;
    return `${m}:${String(s).padStart(2,'0')}`;
  }
  function elapsed(){
    const ms = (S.finishedAt || Date.now()) - S.startedAt;
    const m = Math.floor(ms/60000), s = Math.floor(ms/1000) % 60;
    return m ? `${m}m ${s}s` : `${s}s`;
  }

  const cur = () => S.items[S.i];

  /* ------------------------------------------------------------------ scoring */
  function grade(q, value, self) {
    if (q.type === 'mcq')  return value === q.answer;
    if (q.type === 'grid') return (q.answer || []).some(a => norm(a) === norm(value));
    if (q.type === 'frq')  return self === 'got';
    return false;
  }
  function scoreOf(q, a) {
    if (!a) return 0;
    if (q.type === 'frq') return a.self === 'got' ? 1 : a.self === 'part' ? 0.5 : 0;
    return a.correct ? 1 : 0;
  }

  function submit(value, self) {
    const q = cur();
    S.answers[q.id] = { value, self, correct: grade(q, value, self) };
    if (S.mode === 'drill') S.revealed[q.id] = true;
    else next();
  }
  function next(){ if (S.i < S.items.length - 1) S.i++; else finish(); }
  function prev(){ if (S.i > 0) S.i--; }
  function goTo(i){ S.i = Math.max(0, Math.min(S.items.length - 1, i)); }
  function finish(byTimeout){
    S.finished = true; S.finishedAt = Date.now(); S.timedOut = !!byTimeout;
    clearInterval(tick);
  }

  /* ------------------------------------------------------------- analysis */
  function analyse(){
    const by = {};
    let got = 0;
    S.items.forEach(q => {
      const a = S.answers[q.id];
      const s = scoreOf(q, a);
      got += s;
      [['domain', q.domain || 'General'], ['topic', q.topic || 'General']].forEach(([k, name]) => {
        const m = (by[k] ||= {});
        (m[name] ||= { name, n:0, score:0, missed:[] });
        m[name].n += 1; m[name].score += s;
        if (s < 1) m[name].missed.push(q.id);
      });
    });
    const rank = obj => Object.values(obj).map(r => ({ ...r, pct: r.n ? r.score / r.n : 0 })).sort((a,b) => b.pct - a.pct || b.n - a.n);
    const domains = rank(by.domain || {});
    const topics  = rank(by.topic  || {});
    return {
      total: S.items.length,
      correct: got,
      pct: S.items.length ? got / S.items.length : 0,
      unanswered: S.items.filter(q => !S.answers[q.id]).length,
      domains, topics,
      strong: topics.filter(t => t.pct >= WEAK),
      weak:   topics.filter(t => t.pct <  WEAK)
    };
  }

  /* ------------------------------------------------------------------ donut
     Segments sized by question count, coloured by accuracy. A screen reader
     gets the same information from the ranked list below it, so the chart is
     hidden from the accessibility tree rather than described twice. */
  const TONE = p => p >= 0.8 ? '#16A34A' : p >= 0.5 ? '#F59E0B' : '#E11D48';
  function donut(rows, total){
    const R = 62, C = 2 * Math.PI * R;
    let off = 0;
    const segs = rows.map(r => {
      const frac = total ? r.n / total : 0;
      const len = frac * C;
      const s = `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${TONE(r.pct)}" stroke-width="26"
        stroke-dasharray="${len - 2} ${C - len + 2}" stroke-dashoffset="${-off}" transform="rotate(-90 80 80)"></circle>`;
      off += len;
      return s;
    }).join('');
    return `<svg viewBox="0 0 160 160" class="h-40 w-40 shrink-0" role="presentation" aria-hidden="true">
      <circle cx="80" cy="80" r="${R}" fill="none" stroke="#E4ECF9" stroke-width="26"></circle>${segs}</svg>`;
  }

  /* ------------------------------------------------------------------- views */
  function renderQuestion(){
    const q = cur();
    const a = S.answers[q.id];
    const shown = S.mode === 'drill' && S.revealed[q.id];
    const split = !!q.passage;

    let right = `<p class="text-[16px] font-semibold leading-relaxed">${esc(q.stem)}</p>`;

    if (q.type === 'mcq') {
      right += `<div class="mt-5 flex flex-col gap-2.5">`;
      q.choices.forEach((c, i) => {
        const picked = a?.value === i, isAns = i === q.answer;
        let cls = 'border-mist-line bg-white hover:border-brand-300', mark = '';
        if (shown && isAns) { cls = 'border-grass-500 bg-grass-50'; mark = `<span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-grass-600 text-white"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>`; }
        else if (shown && picked) { cls = 'border-rose-500 bg-rose-50'; mark = `<span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rose-600 text-white"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span>`; }
        else if (picked) cls = 'border-brand-500 bg-brand-50';
        right += `<button type="button" data-p="pick" data-v="${i}" ${shown ? 'disabled' : ''} aria-pressed="${picked}"
          class="flex w-full items-start gap-3.5 rounded-2xl border-2 ${cls} p-4 text-left ${shown ? '' : 'cursor-pointer'}">
          <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${picked && !shown ? 'border-brand-600 bg-brand-600 text-white' : 'border-mist-deep text-ink-soft'} text-[13px] font-bold">${'ABCD'[i]}</span>
          <span class="min-w-0 flex-1 text-[15px] leading-relaxed">${esc(c)}</span>${mark}</button>`;
      });
      right += `</div>`;
      if (shown) {
        right += `<div class="mt-5 rounded-2xl border border-mist-line bg-mist p-5">
          <p class="text-[13px] font-bold ${a?.correct ? 'text-grass-700' : 'text-rose-700'}">${a?.correct ? 'Correct' : `Not quite — the answer is ${'ABCD'[q.answer]}`}</p>
          <div class="mt-3 flex flex-col gap-2.5">${q.choices.map((_, i) => `
            <p class="text-[13.5px] leading-relaxed ${i === q.answer ? 'text-ink' : 'text-ink-soft'}">
              <strong>${'ABCD'[i]}.</strong> ${esc(q.why?.[i] || '')}</p>`).join('')}</div></div>`;
      }
    }

    if (q.type === 'grid') {
      right += `<div class="mt-5">
        <label class="mb-1.5 block text-[13px] font-bold" for="pGrid">Your answer</label>
        <input id="pGrid" type="text" inputmode="decimal" autocomplete="off" ${shown ? 'disabled' : ''} value="${esc(a?.value ?? '')}"
          class="h-12 w-full max-w-xs rounded-xl border-2 ${shown ? (a?.correct ? 'border-grass-500 bg-grass-50' : 'border-rose-500 bg-rose-50') : 'border-mist-line'} bg-white px-4 text-[16px] font-semibold">
        <p class="mt-1.5 text-[12.5px] text-ink-mute">Enter a number. No units, no commas.</p></div>`;
      if (shown) right += `<div class="mt-5 rounded-2xl border border-mist-line bg-mist p-5">
        <p class="text-[13px] font-bold ${a?.correct ? 'text-grass-700' : 'text-rose-700'}">${a?.correct ? 'Correct' : `Not quite — the answer is ${esc((q.answer||[])[0] ?? '')}`}</p>
        <p class="mt-2 text-[13.5px] leading-relaxed text-ink-soft">${esc(q.why || '')}</p></div>`;
    }

    if (q.type === 'frq') {
      right += `<div class="mt-5">
        <label class="mb-1.5 block text-[13px] font-bold" for="pFrq">Your response</label>
        <textarea id="pFrq" rows="7" ${shown ? 'disabled' : ''}
          class="w-full rounded-xl border-2 border-mist-line bg-white p-4 text-[14.5px] leading-relaxed focus:border-brand-500"
          placeholder="Write your response, then compare it against the rubric.">${esc(a?.value ?? '')}</textarea></div>`;
      if (shown) {
        right += `<div class="mt-5 rounded-2xl border border-mist-line bg-mist p-5">
          <p class="text-[13px] font-bold">What a full-credit response needs</p>
          <ul class="mt-2.5 flex flex-col gap-1.5">${(q.rubric||[]).map(r => `<li class="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-soft"><span class="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true"></span>${esc(r)}</li>`).join('')}</ul>
          ${q.sample ? `<p class="mt-4 text-[13px] font-bold">A response that would earn full credit</p>
            <p class="mt-1.5 rounded-xl bg-white p-3.5 text-[13.5px] leading-relaxed text-ink-soft">${esc(q.sample)}</p>` : ''}
          ${q.why ? `<p class="mt-3 text-[13px] leading-relaxed text-ink-soft"><strong>Watch out:</strong> ${esc(q.why)}</p>` : ''}
          <p class="mt-4 text-[13px] font-bold">Mark yourself honestly</p>
          <div class="mt-2 flex flex-wrap gap-2">
            ${[['got','I met the rubric','grass'],['part','Partly','tassel'],['miss','I missed it','rose']].map(([v,l,c]) =>
              `<button type="button" data-p="self" data-v="${v}" class="h-10 cursor-pointer rounded-xl border-2 px-4 text-[13.5px] font-semibold ${a?.self===v?`border-${c}-500 bg-${c}-50 text-${c}-700`:'border-mist-line bg-white text-ink-soft hover:border-brand-300'}">${l}</button>`).join('')}
          </div></div>`;
      }
    }

    /* action bar */
    const answered = !!a;
    let actions = '';
    if (S.mode === 'drill') {
      actions = shown
        ? `<button type="button" data-p="next" class="h-12 cursor-pointer rounded-xl bg-brand-600 px-6 text-[15px] font-semibold text-white hover:bg-brand-500">${S.i === S.items.length-1 ? 'See results' : 'Next question'}</button>`
        : `<button type="button" data-p="check" class="h-12 cursor-pointer rounded-xl bg-brand-600 px-6 text-[15px] font-semibold text-white hover:bg-brand-500">Check answer</button>`;
    } else {
      actions = `<button type="button" data-p="save-next" class="h-12 cursor-pointer rounded-xl bg-brand-600 px-6 text-[15px] font-semibold text-white hover:bg-brand-500">${S.i === S.items.length-1 ? 'Finish module' : 'Next'}</button>`;
    }

    const body = split
      ? `<div class="grid gap-0 lg:grid-cols-2">
           <div class="border-b border-mist-line p-6 lg:border-b-0 lg:border-r lg:p-8">
             <p class="whitespace-pre-line text-[15.5px] leading-[1.75]">${esc(q.passage)}</p></div>
           <div class="p-6 lg:p-8">${right}</div></div>`
      : `<div class="p-6 lg:p-8">${right}</div>`;

    return `
      ${bar()}
      <div class="overflow-hidden rounded-3xl border border-mist-line bg-white shadow-card">${body}</div>
      <div class="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" data-p="prev" ${S.i===0?'disabled':''} class="h-12 rounded-xl border border-mist-line bg-white px-5 text-[15px] font-semibold text-ink-soft ${S.i===0?'opacity-40':'cursor-pointer hover:border-brand-300'}">Back</button>
        <button type="button" data-p="flag" class="h-12 cursor-pointer rounded-xl border px-5 text-[15px] font-semibold ${S.flagged[q.id]?'border-tassel-500 bg-tassel-50 text-tassel-700':'border-mist-line bg-white text-ink-soft hover:border-brand-300'}">${S.flagged[q.id]?'Flagged':'Flag'}</button>
        <span class="ml-auto flex items-center gap-3">
          ${S.mode==='test' && !answered ? `<span class="text-[13px] text-ink-mute">Unanswered</span>` : ''}
          ${actions}</span></div>
      ${S.mode==='test' ? navGrid() : ''}`;
  }

  function bar(){
    const q = cur();
    return `<div class="mb-5 flex flex-wrap items-center gap-3">
      <div class="min-w-0">
        <h1 class="text-[17px] font-extrabold tracking-tight">${esc(S.label)}</h1>
        <p class="text-[13px] text-ink-mute">Question ${S.i+1} of ${S.items.length}${q.difficulty?` · ${esc(q.difficulty)}`:''}${q.topic?` · ${esc(q.topic)}`:''}</p>
      </div>
      <div class="ml-auto flex items-center gap-2">
        ${S.endsAt ? `
          <span class="rounded-xl bg-navy-900 px-3.5 py-2 text-[15px] font-bold tabular-nums text-white ${S.timerHidden?'hidden':''}" id="pTimer">${clock()}</span>
          <button type="button" data-p="timer" class="h-10 cursor-pointer rounded-xl border border-mist-line bg-white px-3.5 text-[13px] font-semibold text-ink-soft hover:border-brand-300">${S.timerHidden?'Show timer':'Hide timer'}</button>` : ''}
        <button type="button" data-p="quit" class="h-10 cursor-pointer rounded-xl border border-mist-line bg-white px-3.5 text-[13px] font-semibold text-ink-soft hover:border-brand-300">Exit</button>
      </div></div>`;
  }

  function navGrid(){
    return `<div class="mt-6 rounded-2xl border border-mist-line bg-white p-4 shadow-card">
      <p class="mb-2.5 text-[12.5px] font-bold text-ink-soft">Jump to a question</p>
      <div class="flex flex-wrap gap-1.5">${S.items.map((q,i) => {
        const done = !!S.answers[q.id], here = i === S.i, fl = S.flagged[q.id];
        return `<button type="button" data-p="jump" data-v="${i}" aria-label="Question ${i+1}${done?', answered':', unanswered'}"
          class="h-9 w-9 cursor-pointer rounded-lg text-[13px] font-bold ${here?'bg-navy-900 text-white':fl?'bg-tassel-100 text-tassel-700':done?'bg-brand-100 text-brand-700':'bg-mist text-ink-mute hover:bg-mist-deep'}">${i+1}</button>`;
      }).join('')}</div></div>`;
  }

  function renderResults(){
    const r = analyse();
    const pct = Math.round(r.pct * 100);
    const tone = pct >= 80 ? 'grass' : pct >= 50 ? 'tassel' : 'rose';

    /* name and score share a line, bar sits under them — survives any column width */
    const bars = rows => rows.map(t => `
      <div>
        <div class="flex items-baseline gap-2">
          <span class="min-w-0 flex-1 truncate text-[13px] font-semibold" title="${esc(t.name)}">${esc(t.name)}</span>
          <span class="shrink-0 text-[12px] font-bold tabular-nums text-ink-soft">${t.score % 1 ? t.score.toFixed(1) : t.score}/${t.n}</span>
        </div>
        <span class="mt-1 block h-2 overflow-hidden rounded-full bg-mist-deep">
          <span class="block h-full rounded-full" style="width:${Math.round(t.pct*100)}%;background:${TONE(t.pct)}"></span></span>
      </div>`).join('');

    return `
      <div class="mb-6 flex flex-wrap items-start gap-4">
        <div class="min-w-0 flex-1">
          <h1 class="text-[clamp(1.5rem,3.4vw,2rem)] font-extrabold tracking-tight">${esc(S.label)} — results</h1>
          <p class="mt-1.5 text-[14.5px] text-ink-soft">${elapsed()}${S.timedOut?' · time ran out':''}${r.unanswered?` · ${r.unanswered} left blank`:''}</p>
        </div>
        <button type="button" data-p="exit" class="h-11 cursor-pointer rounded-xl border border-mist-line bg-white px-4 text-[14px] font-semibold text-ink-soft hover:border-brand-300">Done</button>
      </div>

      <div class="mb-5 grid gap-4 xl:grid-cols-[auto_1fr]">
        <div class="flex items-center gap-6 rounded-3xl border border-mist-line bg-white p-6 shadow-card">
          <div class="relative">${donut(r.domains, r.total)}
            <div class="absolute inset-0 grid place-items-center">
              <div class="text-center"><p class="text-[26px] font-extrabold leading-none tabular-nums text-${tone}-700">${pct}%</p>
              <p class="mt-0.5 text-[12px] font-semibold text-ink-mute">${r.correct % 1 ? r.correct.toFixed(1) : r.correct} of ${r.total}</p></div></div>
          </div>
          <div class="min-w-0">
            <p class="text-[13px] font-bold">By section</p>
            <ul class="mt-2.5 flex flex-col gap-1.5">${r.domains.map(d => `
              <li class="flex items-center gap-2 text-[13px]"><span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background:${TONE(d.pct)}" aria-hidden="true"></span>
              <span class="min-w-0 flex-1 truncate">${esc(d.name)}</span>
              <span class="shrink-0 font-bold tabular-nums text-ink-soft">${Math.round(d.pct*100)}%</span></li>`).join('')}</ul>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-3xl border border-grass-500 bg-grass-50 p-5">
            <h2 class="text-[14px] font-bold text-grass-700">Where you did well</h2>
            ${r.strong.length ? `<div class="mt-3 flex flex-col gap-2">${bars(r.strong)}</div>`
              : `<p class="mt-2 text-[13.5px] leading-relaxed text-ink-soft">Nothing cleared ${Math.round(WEAK*100)}% this time. That is worth knowing rather than hiding — start with the weakest topic below.</p>`}
          </div>
          <div class="rounded-3xl border border-rose-500 bg-rose-50 p-5">
            <h2 class="text-[14px] font-bold text-rose-700">What needs work</h2>
            ${r.weak.length ? `<div class="mt-3 flex flex-col gap-2">${bars(r.weak)}</div>
              <button type="button" data-p="schedule" class="mt-4 w-full cursor-pointer rounded-xl bg-rose-600 px-4 py-3 text-[13.5px] font-semibold leading-snug text-white hover:bg-rose-500">
                Schedule ${r.weak.length} review ${r.weak.length===1?'session':'sessions'}</button>`
              : `<p class="mt-2 text-[13.5px] leading-relaxed text-ink-soft">Every topic cleared ${Math.round(WEAK*100)}%. Nothing to add to your schedule from this one.</p>`}
          </div>
        </div>
      </div>

      <h2 class="mb-3 mt-8 text-[15px] font-bold">Every question</h2>
      <div class="flex flex-col gap-2.5">${S.items.map((q,i) => {
        const a = S.answers[q.id]; const s = scoreOf(q,a);
        const label = !a ? 'Blank' : s === 1 ? 'Correct' : s > 0 ? 'Partial' : 'Incorrect';
        const c = !a ? 'mist-deep' : s === 1 ? 'grass' : s > 0 ? 'tassel' : 'rose';
        return `<button type="button" data-p="review" data-v="${i}" class="flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border border-mist-line bg-white p-4 text-left shadow-card hover:border-brand-300">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-mist text-[13px] font-bold text-ink-soft">${i+1}</span>
          <span class="min-w-0 flex-1"><span class="block truncate text-[14px] font-semibold">${esc(q.stem)}</span>
          <span class="block truncate text-[12.5px] text-ink-mute">${esc(q.topic || q.domain || '')}</span></span>
          <span class="shrink-0 rounded-md ${a && s===1 ? 'bg-grass-100 text-grass-700' : a && s>0 ? 'bg-tassel-100 text-tassel-700' : a ? 'bg-rose-100 text-rose-700' : 'bg-mist-deep text-ink-soft'} px-2 py-1 text-[11.5px] font-bold">${label}</span>
        </button>`;
      }).join('')}</div>`;
  }

  function renderReview(){
    const saved = S.mode; S.mode = 'drill';
    const q = cur(); S.revealed[q.id] = true;
    const html = renderQuestion().replace(/data-p="check"/g,'data-p="noop"');
    S.mode = saved;
    return `<button type="button" data-p="back-results" class="mb-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-mist-line bg-white px-4 text-[13.5px] font-semibold text-ink-soft hover:border-brand-300">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H6M12 6l-6 6 6 6"/></svg>Back to results</button>${html}`;
  }

  function render(){
    if (!S) return '';
    if (S.reviewing) return renderReview();
    return S.finished ? renderResults() : renderQuestion();
  }

  let rerender = () => {};
  function mount(fn){ rerender = fn; }

  /* Navigating away has to be able to end a session. Without this the router
     changes `view` but render() keeps drawing the quiz, which makes every
     sidebar tab look broken. Returns false if the student cancels. */
  function stop({ confirmIfUnsaved = true } = {}){
    if (!S) return true;
    const answered = Object.keys(S.answers).length;
    if (confirmIfUnsaved && !S.finished && answered &&
        !confirm('Leave this practice session? Your answers so far will not be saved.')) return false;
    clearInterval(tick);
    S = null;
    return true;
  }

  /* ------------------------------------------------------------------ events */
  function handle(el){
    if (!S) return false;
    const act = el.dataset.p, v = el.dataset.v;
    const q = cur();

    if (act === 'pick')  { submit(+v); }
    else if (act === 'check') {
      if (q.type === 'grid') submit(document.getElementById('pGrid')?.value ?? '');
      else if (q.type === 'frq') { S.answers[q.id] = { value: document.getElementById('pFrq')?.value ?? '', self:null, correct:false }; S.revealed[q.id] = true; }
      else return true;
    }
    else if (act === 'save-next') {
      if (q.type === 'grid') S.answers[q.id] = { value: document.getElementById('pGrid')?.value ?? '', correct: grade(q, document.getElementById('pGrid')?.value ?? '') };
      if (q.type === 'frq')  S.answers[q.id] = { value: document.getElementById('pFrq')?.value ?? '', self:null, correct:false };
      next();
    }
    else if (act === 'self')  { const a = S.answers[q.id] || {}; a.self = v; a.correct = v === 'got'; S.answers[q.id] = a; }
    else if (act === 'next')  next();
    else if (act === 'prev')  prev();
    else if (act === 'jump')  goTo(+v);
    else if (act === 'flag')  S.flagged[q.id] = !S.flagged[q.id];
    else if (act === 'timer') S.timerHidden = !S.timerHidden;
    else if (act === 'review'){ S.reviewing = true; goTo(+v); }
    else if (act === 'back-results') S.reviewing = false;
    else if (act === 'quit')  { if (!confirm('Leave this session? Your answers will not be saved.')) return true; clearInterval(tick); S = null; onExit(); return true; }
    else if (act === 'exit')  { const r = analyse(); clearInterval(tick); const done = S; S = null; onExit(done, r); return true; }
    else if (act === 'schedule') { onReview(analyse().weak, S.label); return true; }
    else if (act === 'noop')  { return true; }
    else return false;

    rerender();
    return true;
  }

  return { start, stop, render, handle, mount, analyse, WEAK,
           get active(){ return !!S; },
           get finished(){ return !!S?.finished; } };
})();

if (typeof window !== 'undefined') window.Practice = Practice;
