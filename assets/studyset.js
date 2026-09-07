/* =============================================================================
   Replan — study set builder
   -----------------------------------------------------------------------------
   Builds notes, flashcards and questions from a student's upload with no API
   key, no server and no network call. Every stem, answer and distractor is
   wording that appeared in the file, so nothing can be invented.

   DESIGN NOTE — why everything is a sentence completion.
   The obvious approach ("Which of these describes X?" + a list of definition
   fragments) produces ungrammatical, ambiguous questions, because a definition
   pulled out of a sentence is rarely a well-formed noun phrase on its own.
   Instead we keep the student's sentence intact and blank out one part of it:

     "________ is the breakdown of glucose into two pyruvate molecules."   → pick the term
     "Glycolysis is ________"                                              → pick the predicate

   Both read correctly because they ARE the original sentence, and both have
   exactly one defensible answer. Anything that cannot be phrased this way is
   dropped rather than shipped half-formed.

   Scope: this drills recall. It cannot ask for synthesis or inference, and it
   does not pretend to.
   ============================================================================= */

const StudySet = (() => {

  /* subjects that carry no meaning out of context — "This stage is ..." makes a
     question nobody can answer, so definitions with these subjects are dropped */
  const DEICTIC = new Set(('this that these those it its they them he she his her there here ' +
    'each one some both all such another other any many most few several either neither ' +
    'we you i our your their my his hers ' +
    'what why how when where which who whom whose'          // interrogatives, from question lines
  ).split(' '));

  const LIMITS = { flashcards: 40, mcq: 20, shortAnswer: 8, notePoints: 6 };
  const MIN_TEXT = 200;

  const clean = s => s.replace(/\s+/g, ' ').trim();
  const strip = s => clean(s).replace(/^[-*••\d.)\s]+/, '').replace(/[.,;:]+$/, '');
  const lower = s => s.toLowerCase();
  const trim = (s, n) => s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function shuffle(a){ a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }

  function sentences(text){
    return text
      .replace(/([.!?])\s+(?=[A-Z(])/g, '$1')
      .split(/|\n/)
      .map(clean)
      .filter(s => s.length > 30 && s.length < 320 && /[a-z]/.test(s) && / /.test(s));
  }

  /* ---------------------------------------------------------------- sections
     Decks and PDFs arrive with [Slide n] / [Page n] markers from the extractor,
     and those are far more reliable than guessing. Previously they were skipped
     and headings were inferred, which went badly wrong on real decks: a short
     bullet like "Requires oxygen" looked exactly like a title, so it became the
     heading for nine sections while the actual slide titles were swallowed as
     body text. A 41-slide deck collapsed into about seven junk groups. */
  const SLIDE_MARK = /^\[(?:Page|Slide)\s+(\d+)\]$/i;
  const BULLET = /^[-*•‣◦·]/;

  function sections(text){
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.some(l => SLIDE_MARK.test(l))) return slideSections(lines);

    const out = [];
    let cur = { heading: 'General', lines: [] };
    for (const l of lines) {
      const looksLikeHeading =
        (/^(?:chapter|unit|section|lesson|part|topic|module)\b/i.test(l) && l.length < 70) ||
        // a title may well contain a verb — "Mitochondria are the powerhouse" is
        // a slide title, so excluding is/are/has threw away real headings
        (/^[A-Z0-9]/.test(l) && !BULLET.test(l) && !/[.!?,;]$/.test(l)
         && l.split(' ').length <= 10 && l.length <= 70);
      if (looksLikeHeading) {
        if (cur.lines.length) out.push(cur);
        cur = { heading: strip(l), lines: [] };
      } else cur.lines.push(l);
    }
    if (cur.lines.length) out.push(cur);
    return out.length ? out : [{ heading: 'General', lines }];
  }

  function slideSections(lines){
    const raw = [];
    let cur = null;
    for (const l of lines) {
      if (SLIDE_MARK.test(l)) { if (cur) raw.push(cur); cur = { heading: '', lines: [] }; continue; }
      if (!cur) cur = { heading: '', lines: [] };
      // the first ordinary line after the marker is the slide title
      if (!cur.heading && !BULLET.test(l) && l.length <= 90) { cur.heading = strip(l); continue; }
      cur.lines.push(l);
    }
    if (cur) raw.push(cur);

    // "Osmosis" and "Osmosis continued" are one topic, not two
    const key = s => lower(s).replace(/\b(?:cont(?:inued|d)?|part\s*\d+|\(\s*\d+\s*\))\b/g, '')
                             .replace(/[^a-z0-9]+/g, ' ').trim();
    const merged = [];
    raw.forEach(s => {
      const prev = merged[merged.length - 1];
      if (prev && s.heading && key(prev.heading) === key(s.heading)) { prev.lines.push(...s.lines); return; }
      if (prev && !s.heading) { prev.lines.push(...s.lines); return; }
      merged.push({ heading: s.heading || 'General', lines: s.lines.slice() });
    });
    return merged.filter(s => s.heading !== 'General' || s.lines.length);
  }

  /* ------------------------------------------------------------- definitions
     A usable definition keeps three parts so the sentence can be rebuilt with
     either side blanked: subject, connector verb, and the predicate WITH its
     article intact. Stripping the article is what made the old output read
     wrong ("Glycolysis is breakdown of glucose"). */
  function definitions(secs){
    const out = [];
    const seen = new Set();

    const patterns = [
      { re: /^(.{3,60}?)\s*[:–—]\s+(.{20,280})$/,                    conn: 'is' },
      { re: /^(.{3,60}?)\s+(is|are)\s+(.{18,280})$/i,                          fromMatch: true },
      { re: /^(.{3,60}?)\s+(refers? to|means|describes)\s+(.{18,280})$/i,      fromMatch: true }
    ];

    secs.forEach(sec => {
      const pool = [];
      sec.lines.forEach(l => { pool.push(clean(l)); sentences(l).forEach(s => pool.push(s)); });

      [...new Set(pool)].forEach(raw => {
        // a question is not a definition — "What is the capital of France?"
        // otherwise parses as subject "What", which is unanswerable
        if (/\?\s*$/.test(clean(raw))) return;
        const line = clean(raw).replace(/[.]$/, '');
        for (const p of patterns) {
          const m = line.match(p.re);
          if (!m) continue;

          let subject = strip(m[1]);
          let conn = p.fromMatch ? lower(m[2]) : p.conn;
          let predicate = strip(p.fromMatch ? m[3] : m[2]);

          // "X is defined as Y" / "X is known as Y" → connector stays "is"
          predicate = predicate.replace(/^(?:defined|known|referred to)\s+as\s+/i, '');
          conn = /^refers? to$/.test(conn) ? 'refers to' : conn === 'are' ? 'are' : conn === 'means' ? 'means' : conn === 'describes' ? 'describes' : 'is';

          const w = subject.split(/\s+/);
          if (w.length > 6 || subject.length < 3) return;
          if (DEICTIC.has(lower(w[0]).replace(/[^a-z]/g,''))) return;       // "This stage is …"
          if (!/[a-zA-Z]/.test(subject)) return;
          if (/\b(is|are|was|were|will|can|should)\b/i.test(subject)) return;
          if (predicate.split(/\s+/).length < 4) return;                    // too thin to choose between
          if (/^(?:also|often|usually|sometimes|not|very|the same)\b/i.test(predicate)) return;

          const key = lower(subject);
          if (seen.has(key)) return;
          seen.add(key);
          out.push({ subject, conn, predicate, topic: sec.heading,
                     sentence: `${cap(subject)} ${conn} ${predicate}.` });
          return;
        }
      });
    });
    return out;
  }

  /* ------------------------------------------------------------------ figures
     Numeric facts, but only where the sentence names what the figure belongs to.
     A sentence beginning "This stage produces 2 ATP" is unanswerable once it is
     lifted away from the paragraph, so those are skipped. */
  function figures(secs){
    const out = [];
    secs.forEach(sec => sec.lines.forEach(l => sentences(l).forEach(s => {
      const first = s.split(/\s+/)[0].replace(/[^a-zA-Z]/g, '');
      if (DEICTIC.has(lower(first))) return;
      const nums = s.match(/\b\d+(?:[.,]\d+)?\s*(?:%|percent|kg|km|cm|mm|ml|mol|ATP|NADH|degrees|million|billion)?\b/g) || [];
      if (nums.length !== 1) return;                     // ambiguous which one to blank
      const value = nums[0].trim();
      if (value.length < 1) return;
      out.push({ sentence: s.replace(/[.]$/, ''), value, topic: sec.heading });
    })));
    return out;
  }

  /* --------------------------------------------------------------- prompts
     Worksheets and review sheets are mostly questions, not statements, so the
     definition patterns find nothing in them. The questions themselves are
     already good practice prompts, so surface them as free response — and say
     plainly that the upload carried no answer key to check against. */
  const PROMPT_VERB = /^(?:explain|describe|compare|contrast|discuss|evaluate|analyse|analyze|outline|summarise|summarize|define|identify|calculate|justify|assess|state|list|name|give|show)\b/i;
  function prompts(secs){
    const out = [];
    const seen = new Set();
    secs.forEach(sec => sec.lines.forEach(raw => {
      const asked = /\?\s*$/.test(clean(raw));
      const l = strip(raw.replace(/^\s*(?:\d+|[a-z])\s*[.)]\s*/i, ''));
      if (l.length < 18 || l.length > 240) return;
      if (!asked && !PROMPT_VERB.test(l)) return;
      const key = lower(l).slice(0, 60);
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        type:'frq', topic:sec.heading, fromWorksheet:true,
        stem:cap(l.replace(/[?.!]+$/, '')) + (asked ? '?' : '.'),
        rubric:['Answers the question that was actually asked',
                'Supports the answer with specifics rather than generalities',
                'Your upload had no answer key, so check this against your notes or textbook'],
        sample:''
      });
    }));
    return out;
  }

  /* ------------------------------------------------------------------- items */
  function buildMCQ(defs, figs){
    const qs = [];
    const used = new Set();

    /* A — blank the subject. Options are terms; the sentence stays intact. */
    if (defs.length >= 4) {
      defs.forEach(d => {
        if (qs.length >= LIMITS.mcq) return;
        const pool = defs.filter(x => x !== d);
        const near = pool.filter(x => x.topic === d.topic);
        const picks = shuffle(near.length >= 3 ? near : pool).slice(0, 3);
        if (picks.length < 3) return;
        const opts = shuffle([d.subject, ...picks.map(p => p.subject)]);
        if (new Set(opts.map(lower)).size !== opts.length) return;
        qs.push({
          type:'mcq', topic:d.topic, difficulty:'Easy',
          stem:`Fill in the blank from your material: “________ ${d.conn} ${d.predicate}.”`,
          choices:opts, answer:opts.indexOf(d.subject),
          why:opts.map(o => o === d.subject
            ? `Correct. Your material says: “${d.sentence}”`
            : `Your material uses ${o} for something else: “${defs.find(x => x.subject === o)?.sentence ?? ''}”`)
        });
        used.add(d.subject);
      });
    }

    /* B — blank the predicate. The stem keeps the answer's own connector, and
       options are restricted to predicates that open with a determiner or a
       gerund, which read correctly after is / are / means / refers to alike.
       That is what lets definitions with different connectors share a pool. */
    const READS_AFTER_CONNECTOR = /^(?:the|a|an|any|all|one|two|three|its|their|when|where|how|[a-z]+ing)\b/i;
    {
      const group = defs.filter(d => READS_AFTER_CONNECTOR.test(d.predicate));
      if (group.length >= 4) group.forEach(d => {
        if (qs.length >= LIMITS.mcq) return;
        const picks = shuffle(group.filter(x => x !== d)).slice(0, 3);
        if (picks.length < 3) return;
        const opts = shuffle([d.predicate, ...picks.map(p => p.predicate)]).map(o => trim(o, 150));
        if (new Set(opts.map(lower)).size !== opts.length) return;
        const answer = opts.indexOf(trim(d.predicate, 150));
        if (answer < 0) return;
        qs.push({
          type:'mcq', topic:d.topic, difficulty:'Medium',
          stem:`Complete this sentence from your material: “${cap(d.subject)} ${d.conn} ________”`,
          choices:opts, answer,
          why:opts.map((o, i) => i === answer
            ? `Correct. The full sentence is: “${d.sentence}”`
            : `That is what your material says about ${group.find(x => trim(x.predicate,150) === o)?.subject ?? 'another term'}.`)
        });
      });
    }

    /* C — blank a figure, where the sentence names its own subject */
    const values = [...new Set(figs.map(f => f.value))];
    if (values.length >= 4) figs.forEach(f => {
      if (qs.length >= LIMITS.mcq) return;
      const others = shuffle(values.filter(v => v !== f.value)).slice(0, 3);
      if (others.length < 3) return;
      const opts = shuffle([f.value, ...others]);
      qs.push({
        type:'mcq', topic:f.topic, difficulty:'Medium',
        stem:`Fill in the figure from your material: “${f.sentence.replace(f.value, '________')}.”`,
        choices:opts, answer:opts.indexOf(f.value),
        why:opts.map(o => o === f.value
          ? `Correct. Your material states: “${f.sentence}.”`
          : `${o} appears elsewhere in your material, not in this sentence.`)
      });
    });

    return shuffle(qs).slice(0, LIMITS.mcq);
  }

  function buildFlashcards(defs, figs){
    const cards = defs.map(d => ({ front: cap(d.subject), back: d.sentence, topic: d.topic }));
    for (const f of figs) {
      if (cards.length >= LIMITS.flashcards) break;
      if (cards.some(c => c.back === f.sentence + '.')) continue;
      cards.push({ front: f.sentence.replace(f.value, '________') + '.', back: f.value, topic: f.topic });
    }
    return cards.slice(0, LIMITS.flashcards);
  }

  function buildShortAnswer(defs, secs){
    const out = defs.slice(0, LIMITS.shortAnswer).map(d => ({
      type:'frq', topic:d.topic,
      stem:`In your own words, explain ${d.subject}.`,
      rubric:[
        `Captures what your material says: ${trim(d.predicate, 130)}`,
        'Is phrased in your own words rather than copied',
        'Would make sense to someone who has not read the material'
      ],
      sample:d.sentence
    }));
    if (out.length < 3) {
      secs.filter(s => s.heading !== 'General' && s.lines.length > 1)
        .slice(0, LIMITS.shortAnswer - out.length)
        .forEach(s => out.push({
          type:'frq', topic:s.heading,
          stem:`Summarise what your material says about ${s.heading}.`,
          rubric:['Covers the main points of this section', 'Stays within what the material actually states'],
          sample:s.lines.slice(0, 3).join(' ')
        }));
    }
    return out;
  }

  function buildNotes(secs){
    return secs.map(sec => {
      const points = [];
      sec.lines.forEach(l => sentences(l).forEach(s => { if (points.length < LIMITS.notePoints) points.push(s); }));
      // slide bullets are short by nature; dropping everything under 25 characters
      // left most decks with almost no notes at all
      if (points.length < LIMITS.notePoints)
        sec.lines.filter(l => l.length > 10 && !points.includes(clean(l)))
                 .slice(0, LIMITS.notePoints - points.length)
                 .forEach(l => points.push(clean(l).replace(BULLET, '').trim()));
      return { heading: sec.heading, points };
    }).filter(n => n.points.length);
  }

  /* ------------------------------------------------------------------ public */
  function build({ text, name = 'Untitled material' } = {}){
    const body = (text || '').trim();
    if (body.length < MIN_TEXT)
      throw new Error('There is not enough readable text here to build a study set. Roughly a page of notes is the minimum.');

    const secs = sections(body);
    const defs = definitions(secs);
    const figs = figures(secs);
    const asked = prompts(secs);

    const mcq        = buildMCQ(defs, figs);
    const flashcards = buildFlashcards(defs, figs);
    const notes      = buildNotes(secs);
    // a worksheet's own questions are better practice than anything derived
    // from it, so they lead; only top up when the file is not already a
    // question sheet, or "Summarise Chapter 5 Review Questions" creeps in
    const shortAnswer = [...asked, ...(asked.length >= 3 ? [] : buildShortAnswer(defs, secs))]
      .slice(0, LIMITS.shortAnswer);

    if (mcq.length + flashcards.length + shortAnswer.length < 3)
      throw new Error('This text is readable but does not state things in a form questions can be built from. Sentences like “X is …”, “X refers to …”, a figure with a named subject, or a list of review questions all work; disconnected slide fragments do not.');

    const topics = [...new Set([...defs, ...figs, ...asked].map(x => x.topic).filter(t => t && t !== 'General'))];
    const notesOnly = [];
    if (defs.length && defs.length < 4) notesOnly.push('there were fewer than four definitions, so some question types could not be built');
    if (asked.length && !defs.length)   notesOnly.push('this reads as a question sheet, so the questions are your own with no answer key to check against');
    if (!figs.length && defs.length)    notesOnly.push('no figures with a clearly named subject were found');

    const title = secs.find(s => s.heading !== 'General')?.heading || name.replace(/\.[a-z0-9]+$/i, '');

    return {
      title: trim(title, 70),
      coverage: `Built from your material: ${defs.length} ${defs.length === 1 ? 'definition' : 'definitions'}, ` +
                `${figs.length} ${figs.length === 1 ? 'figure' : 'figures'} and ` +
                `${asked.length} ${asked.length === 1 ? 'question' : 'questions'} carried over from the file, across ` +
                `${topics.length || 1} ${topics.length === 1 ? 'topic' : 'topics'}. ` +
                (notesOnly.length ? `Note that ${notesOnly.join(', and ')}. ` : '') +
                'Generated questions are your own sentences with a part blanked out, so they drill recall rather than reasoning.',
      topics: topics.length ? topics : ['General'],
      notes, flashcards, mcq, shortAnswer
    };
  }

  return { build, LIMITS };
})();

if (typeof window !== 'undefined') window.StudySet = StudySet;
