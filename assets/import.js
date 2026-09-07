/* =============================================================================
   Replan — importing from school platforms
   -----------------------------------------------------------------------------
   WHY THERE IS NO "CONNECT WITH OAUTH" BUTTON HERE

   Every platform below would need a registered OAuth application with a client
   secret to sign requests. A secret cannot live in a static page — anyone can
   read it — so real linking needs a server. On top of that:

     · Canvas, Schoology, PowerSchool, Skyward, Infinite Campus and Aeries gate
       API access behind district administrators. A student cannot grant it.
     · Kahoot, Blooket, Gimkit, Quizizz and Nearpod publish no student API.

   A button that looked like it connected but did not would be worse than no
   button, so this module does the thing that actually works: it reads what the
   student can already get out of those platforms themselves — a copied list, a
   screenshot, a calendar feed, an export file — and turns it into classes,
   assignments with due dates, or practice questions.

   Every provider entry names the specific route that works for that product.
   ============================================================================= */

const Importer = (() => {

  /* ------------------------------------------------------------- providers
     `use` decides what we look for: coursework platforms are scanned for
     classes and due dates, quiz platforms for questions, document tools for
     study material. That is why pasting a Kahoot never creates assignments. */
  const PROVIDERS = [
    // ---- coursework: classes, assignments, due dates -> the schedule
    { id:'google-classroom', name:'Google Classroom', use:'coursework', feed:true,
      steps:['Open Classroom, pick a class, then the Classwork tab.',
             'Select the assignment list and copy it, then paste below.',
             'For due dates in bulk: Google Calendar → Settings → your Classroom calendar → "Secret address in iCal format" → download the .ics and drop it here.'] },
    { id:'canvas', name:'Canvas', use:'coursework', feed:true,
      steps:['Canvas → Calendar → "Calendar Feed" at the bottom right.',
             'Download the .ics file that link gives you and drop it here.',
             'Or copy your Assignments list and paste it below.'] },
    { id:'schoology', name:'Schoology Learning', use:'coursework', feed:true,
      steps:['Schoology → Calendar → iCal feed, if your school has enabled it.',
             'Download the .ics and drop it here.',
             'Otherwise copy your Upcoming or Grades list and paste it below.'] },
    { id:'powerschool', name:'PowerSchool', use:'coursework', feed:false,
      steps:['PowerSchool has no student calendar feed.',
             'Open Assignments, then copy the list or take a screenshot.',
             'Paste or drop it here and check what is found before importing.'] },
    { id:'skyward', name:'Skyward', use:'coursework', feed:false,
      steps:['Skyward has no student calendar feed.',
             'Open Gradebook or Assignments and copy the list, or screenshot it.'] },
    { id:'infinite-campus', name:'Infinite Campus', use:'coursework', feed:false,
      steps:['Open the Assignments tab in the Campus Student portal.',
             'Copy the list or take a screenshot and drop it here.'] },
    { id:'aeries', name:'Aeries', use:'coursework', feed:false,
      steps:['Aeries → Gradebook → Assignments.', 'Copy the list or screenshot it.'] },
    { id:'seesaw', name:'Seesaw', use:'coursework', feed:false,
      steps:['Open the Activities list for your class.', 'Screenshot it and drop it here.'] },

    // ---- quiz and activity tools: questions -> practice
    { id:'kahoot', name:'Kahoot!', use:'questions', feed:false,
      steps:['If it is your own kahoot: open it, then Export as spreadsheet and paste the question columns.',
             'If you played someone else’s: screenshot the review screen at the end, which shows each question and the correct answer.'] },
    { id:'quizizz', name:'Quizizz', use:'questions', feed:false,
      steps:['Open the quiz, then copy the question list or screenshot the review screen.'] },
    { id:'gimkit', name:'Gimkit', use:'questions', feed:false,
      steps:['Open the kit and copy the question list, or export it if it is yours.'] },
    { id:'blooket', name:'Blooket', use:'questions', feed:false,
      steps:['Open the set and copy the questions, or screenshot the review screen.'] },
    { id:'nearpod', name:'Nearpod', use:'questions', feed:false,
      steps:['Open the lesson and copy the quiz slides, or download the lesson as PDF and drop it here.'] },
    { id:'edpuzzle', name:'Edpuzzle', use:'questions', feed:false,
      steps:['Open the assignment and copy the questions attached to the video.'] },
    { id:'quizlet', name:'Quizlet', use:'questions', feed:false,
      steps:['Open the set → the three dots → Export.',
             'Choose Copy text, then paste it below. Term and definition on each line is exactly what Replan expects.'] },

    // ---- documents and notes: content -> study material
    { id:'google-docs', name:'Google Docs', use:'notes', feed:false,
      steps:['File → Download → Plain text (.txt) or PDF, then drop the file here.'] },
    { id:'google-slides', name:'Google Slides', use:'notes', feed:false,
      steps:['File → Download → PDF, then drop the file here.'] },
    { id:'google-drive', name:'Google Drive', use:'notes', feed:false,
      steps:['Download the file from Drive, then drop it here. PDF, Word, PowerPoint and text all work.'] },
    { id:'ms-word', name:'Microsoft Word', use:'notes', feed:false,
      steps:['Drop the .docx straight in — no conversion needed.'] },
    { id:'ms-powerpoint', name:'Microsoft PowerPoint', use:'notes', feed:false,
      steps:['Drop the .pptx straight in — the text on each slide is read.'] },
    { id:'onedrive', name:'Microsoft OneDrive', use:'notes', feed:false,
      steps:['Download the file from OneDrive, then drop it here.'] },
    { id:'canva', name:'Canva for Education', use:'notes', feed:false,
      steps:['Share → Download → PDF Standard, then drop the file here.'] },
    { id:'padlet', name:'Padlet', use:'notes', feed:false,
      steps:['Share → Export → PDF or CSV, then drop the file here.'] },
    { id:'notion', name:'Notion', use:'notes', feed:false,
      steps:['Page menu → Export → Markdown or PDF, then drop the file here.'] }
  ];

  const byId = id => PROVIDERS.find(p => p.id === id);

  /* ------------------------------------------------------------------ dates */
  const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11 };
  const iso = (y,m,d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  /* A school year straddles January, so "Due Jan 12" seen in September means
     next year. Anything more than ~2 months in the past is rolled forward. */
  function resolveYear(month, day, todayISO){
    const [ty, tm] = todayISO.split('-').map(Number);
    let y = ty;
    const candidate = new Date(Date.UTC(y, month, day));
    const today = new Date(Date.UTC(ty, tm - 1, Number(todayISO.split('-')[2])));
    if ((today - candidate) / 86400000 > 60) y += 1;
    return y;
  }

  function parseDate(text, todayISO){
    const t = text.toLowerCase();
    if (/\btoday\b/.test(t))     return todayISO;
    if (/\btomorrow\b/.test(t))  { const d = new Date(todayISO + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+1); return d.toISOString().slice(0,10); }
    let m;
    if ((m = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)))              return `${m[1]}-${m[2]}-${m[3]}`;
    if ((m = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:,\s*(\d{4}))?/))) {
      const mo = MONTHS[m[1]], day = +m[2];
      if (day < 1 || day > 31) return null;
      return iso(m[3] ? +m[3] : resolveYear(mo, day, todayISO), mo, day);
    }
    if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
      const mo = +m[1] - 1, day = +m[2];
      if (mo < 0 || mo > 11 || day < 1 || day > 31) return null;
      let y = m[3] ? +m[3] : resolveYear(mo, day, todayISO);
      if (y < 100) y += 2000;
      return iso(y, mo, day);
    }
    return null;
  }

  /* --------------------------------------------------------------- detection
     Decides what a blob of text actually is, so a pasted Kahoot never gets
     read as coursework. Explicit provider choice always wins over this. */
  function detect(text){
    const t = text.toLowerCase();
    const lines = text.split('\n').map(s => s.trim()).filter(Boolean);

    let course = 0, quiz = 0;
    if (/\bdue\b/.test(t))                      course += (t.match(/\bdue\b/g) || []).length * 2;
    if (/\bassigned\b|\bturned in\b|\bmissing\b|\bposted\b|\bno due date\b/.test(t)) course += 4;
    if (/\bpts\b|\bpoints\b|\/\s*\d+\s*pts/.test(t)) course += 2;
    if (/begin:vcalendar/i.test(text))          course += 50;

    if (/\banswer\s*[:：]/.test(t))              quiz += 5;
    if (/\bcorrect answer\b/.test(t))            quiz += 6;
    if (/^\s*[a-d][).]\s+/m.test(text))          quiz += 4;
    quiz += Math.min(10, lines.filter(l => l.endsWith('?')).length * 2);
    quiz += Math.min(6, lines.filter(l => /\t/.test(l)).length);   // quizlet export

    if (course === 0 && quiz === 0) return 'notes';
    return course >= quiz ? 'coursework' : 'questions';
  }

  /* --------------------------------------------------------------------- ics
     The most reliable route by far: Canvas and Google Calendar both hand
     students a feed, and the fields we need are unambiguous in it. */
  function parseICS(text, todayISO){
    const out = [];
    // unfold RFC5545 continuation lines before parsing
    const body = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
    const blocks = body.split(/BEGIN:VEVENT/i).slice(1);
    blocks.forEach(b => {
      const end = b.split(/END:VEVENT/i)[0];
      const get = re => (end.match(re) || [])[1];
      const summary = (get(/\nSUMMARY(?:;[^:\n]*)?:(.*)/i) || '').trim();
      const dt = get(/\nDTSTART(?:;[^:\n]*)?:([0-9TZ]+)/i) || get(/\nDUE(?:;[^:\n]*)?:([0-9TZ]+)/i);
      if (!summary || !dt) return;
      const m = dt.match(/^(\d{4})(\d{2})(\d{2})/);
      if (!m) return;
      const due = `${m[1]}-${m[2]}-${m[3]}`;
      // "Essay 2 [Period 3 English]" — Canvas puts the course in brackets
      const br = summary.match(/^(.*?)\s*\[(.+?)\]\s*$/);
      out.push({
        title: unescapeICS((br ? br[1] : summary).trim()),
        className: br ? unescapeICS(br[2].trim()) : '',
        due
      });
    });
    return out;
  }
  const unescapeICS = s => s.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/gi, ' ').replace(/\\\\/g, '\\');

  /* -------------------------------------------------------------- coursework
     Screenshots and copied lists are messy and vary per platform, so this is
     deliberately conservative: a row only counts when a real date is present.
     Everything found is shown for review before anything is created. */
  const NOISE = /^(?:classwork|assignments?|upcoming|to ?do|grades?|home|stream|people|all|view all|no due date|week of|today|tomorrow|assigned|turned in|missing|done|completed|graded|filter|sort)\b/i;

  /* A class name is not an assignment name. Google Classroom's to-do list runs
     title / class / due, while the classwork view runs class-header / title /
     posted / due. Reading "the line above the date" therefore picked up the
     class every time, so every imported assignment was called "Chemistry -
     Period 3". These markers are what tells the two apart. */
  const CLASS_HINT = /\b(?:period|hour|block|section|per\.?|sem\.?|semester)\s*\d|\bp\d\b|\b\d(?:st|nd|rd|th)\s+(?:period|hour|block)\b/i;
  const POSTED = /^(?:posted|assigned|due date|opens?|available)\b/i;

  function parseCoursework(text, todayISO){
    const lines = text.split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const rows = [];
    let sectionClass = '';

    const hasDue = l => /\bdue\b/i.test(l) || /\b\d{1,2}\/\d{1,2}\b/.test(l);
    const classLike = l => CLASS_HINT.test(l) && l.length < 60;

    lines.forEach((line, i) => {
      if (!hasDue(line)) {
        if (classLike(line) && !NOISE.test(line)) sectionClass = line.replace(/[•·|]+/g, ' ').trim();
        return;
      }
      if (NOISE.test(line) && !/\bdue\b/i.test(line)) return;

      const due = parseDate(line, todayISO);
      if (!due) return;                              // never guess a date

      // the due line sometimes carries the title too: "Lab Report 3 — Due Sep 18"
      let title = line
        .replace(/\bdue\b[^,|•·]*/i, ' ')
        .replace(/\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/ig, ' ')
        .replace(/\b\d+\s*\/\s*\d+\s*pts?\b/ig, ' ')
        .replace(/\b\d+\s*(?:pts|points)\b/ig, ' ')
        .replace(/[-–—•·|]{1,}/g, ' ')
        .replace(/\s+/g, ' ').trim();
      let cls = '';

      // otherwise walk back: the nearest class-like line names the class, the
      // nearest ordinary line names the assignment
      if (title.length < 3 || classLike(title)) {
        title = '';
        for (let k = i - 1; k >= 0 && k >= i - 4; k--) {
          const prev = lines[k];
          if (!prev || hasDue(prev) || NOISE.test(prev) || POSTED.test(prev)) continue;
          if (classLike(prev)) { if (!cls) cls = prev; continue; }
          title = prev; break;
        }
      }
      if (!cls) cls = sectionClass;
      title = title.replace(/[•·|]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (title.length < 3 || classLike(title)) return;

      rows.push({ title: title.slice(0, 80), className: cls, due });
    });

    const seen = new Set();
    return rows.filter(r => {
      const k = (r.title + r.due).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  /* "Chemistry - Period 3" and a class the student already called "Chemistry"
     are the same class. Without this every import spawned a duplicate. */
  function classKey(name){
    return String(name || '')
      .toLowerCase()
      .replace(/\b(?:period|hour|block|section|per\.?|sem\.?|semester)\s*\d+\b/g, ' ')
      .replace(/\b\d(?:st|nd|rd|th)\s+(?:period|hour|block)\b/g, ' ')
      .replace(/\bp\d\b/g, ' ')
      .replace(/\b(?:honors|honours|ap|cp|advanced placement|college prep|regular|academic)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /* --------------------------------------------------------------- questions */
  function parseQuestions(text){
    const out = [];
    const lines = text.split('\n').map(l => l.replace(/\s+$/,'')).filter(l => l.trim());

    // Quizlet-style export: term<tab>definition, or "term - definition"
    const tabbed = lines.filter(l => /\t/.test(l) || /\s{2,}[-–—]\s{2,}/.test(l));
    if (tabbed.length >= 4 && tabbed.length >= lines.length * 0.6) {
      tabbed.forEach(l => {
        const [term, ...rest] = l.split(/\t|\s{2,}[-–—]\s{2,}/);
        const def = rest.join(' ').trim();
        if (term && term.trim().length > 1 && def.length > 2)
          out.push({ kind:'pair', term:term.trim().slice(0,120), def:def.slice(0,300) });
      });
      if (out.length) return out;
    }

    // question followed by lettered options and an answer line
    let cur = null;
    lines.forEach(raw => {
      const l = raw.trim();
      const opt = l.match(/^([A-Da-d])[).]\s+(.{1,200})$/);
      const ans = l.match(/^(?:correct\s+)?answer\s*[:：]\s*([A-Da-d])\b/i);
      const q   = l.match(/^(?:\d+[).]\s*)?(.{8,240}\?)$/);

      if (ans && cur) { cur.answer = ans[1].toUpperCase().charCodeAt(0) - 65; return; }
      if (opt && cur) { cur.choices.push(opt[2].trim()); return; }
      if (q) { if (cur && cur.choices.length >= 2) out.push(cur); cur = { kind:'mcq', stem:q[1].trim(), choices:[], answer:0 }; return; }
    });
    if (cur && cur.choices.length >= 2) out.push(cur);
    return out.filter(x => x.kind !== 'mcq' || (x.choices.length >= 2 && x.answer < x.choices.length));
  }

  /* ------------------------------------------------------------------ public */
  function scan(text, providerId, todayISO){
    const p = providerId ? byId(providerId) : null;
    const isICS = /BEGIN:VCALENDAR/i.test(text);
    const kind = isICS ? 'coursework' : (p ? p.use : detect(text));

    if (kind === 'coursework') {
      const rows = isICS ? parseICS(text, todayISO) : parseCoursework(text, todayISO);
      return { kind:'coursework', source: isICS ? 'calendar feed' : 'pasted list', rows };
    }
    if (kind === 'questions') return { kind:'questions', source:'pasted questions', items: parseQuestions(text) };
    return { kind:'notes', source:'document text', text };
  }

  return { PROVIDERS, byId, scan, detect, parseDate, parseICS, parseCoursework, parseQuestions, classKey };
})();

if (typeof window !== 'undefined') window.Importer = Importer;
