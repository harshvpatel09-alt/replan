/* =============================================================================
   Replan — study material extraction
   -----------------------------------------------------------------------------
   Turns an uploaded file into text (and, for images, base64 the model can see).
   Everything runs in the browser: no upload leaves the device until the student
   deliberately sends it for generation.

   Supported
     .pdf              pdf.js, text layer per page
     .pptx             zip of XML — slide text plus speaker notes
     .docx             zip of XML — document body
     .txt .md .csv     read straight
     images            passed through as base64 for a vision model to read

   Scanned PDFs have no text layer. Rather than silently handing the model an
   empty string, we say so and suggest photographing the pages instead.
   ============================================================================= */

const Extract = (() => {

  const CDN = {
    pdf:       'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    jszip:     'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    tesseract: 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js'
  };

  const MAX_FILE  = 25 * 1024 * 1024;   // 25 MB
  const MAX_CHARS = 120000;             // keeps a huge deck inside a sane context
  const MAX_IMAGE = 5 * 1024 * 1024;

  const loaded = {};
  function script(src){
    if (loaded[src]) return loaded[src];
    return loaded[src] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = res;
      s.onerror = () => rej(new Error('Could not load a required library. Check your connection.'));
      document.head.appendChild(s);
    });
  }

  const readBuf  = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Could not read that file.')); r.readAsArrayBuffer(f); });
  const readText = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Could not read that file.')); r.readAsText(f); });
  const readB64  = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('Could not read that file.')); r.readAsDataURL(f); });

  const ext = n => (n.split('.').pop() || '').toLowerCase();
  const clean = s => s.replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  const unxml = s => s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');

  /* --------------------------------------------------------------------- pdf */
  async function fromPDF(file){
    await script(CDN.pdf);
    const lib = window.pdfjsLib;
    if (!lib) throw new Error('The PDF reader failed to load.');
    lib.GlobalWorkerOptions.workerSrc = CDN.pdfWorker;

    const doc = await lib.getDocument({ data: await readBuf(file) }).promise;
    const parts = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      // pdf.js hands back positioned runs; rebuild lines by vertical position
      let line = '', lastY = null;
      const lines = [];
      tc.items.forEach(it => {
        const y = it.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 2) { if (line.trim()) lines.push(line.trim()); line = ''; }
        line += it.str + (it.hasEOL ? '\n' : ' ');
        lastY = y;
      });
      if (line.trim()) lines.push(line.trim());
      const body = lines.join('\n').trim();
      if (body) parts.push(`[Page ${p}]\n${body}`);
    }
    const text = clean(parts.join('\n\n'));
    return {
      text, pages: doc.numPages,
      warning: text.length < 40
        ? 'This PDF has almost no selectable text, so it is probably a scan. Photograph the pages and upload the images instead — a vision model can read those.'
        : null
    };
  }

  /* -------------------------------------------------------------------- pptx */
  async function fromPPTX(file){
    await script(CDN.jszip);
    const zip = await window.JSZip.loadAsync(await readBuf(file));

    const slideNo = p => { const m = p.match(/slide(\d+)\.xml$/); return m ? +m[1] : 0; };
    const slides = Object.keys(zip.files).filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a,b) => slideNo(a) - slideNo(b));
    const notes  = Object.keys(zip.files).filter(p => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(p)).sort((a,b) => slideNo(a) - slideNo(b));

    const runs = xml => (xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [])
      .map(t => unxml(t.replace(/<[^>]+>/g,''))).filter(Boolean);

    const out = [];
    for (let i = 0; i < slides.length; i++) {
      const body = runs(await zip.file(slides[i]).async('string'));
      const note = notes[i] ? runs(await zip.file(notes[i]).async('string')) : [];
      if (!body.length && !note.length) continue;
      let s = `[Slide ${i + 1}]\n${body.join('\n')}`;
      if (note.length) s += `\nSpeaker notes: ${note.join(' ')}`;
      out.push(s);
    }
    const text = clean(out.join('\n\n'));
    return { text, pages: slides.length,
      warning: text.length < 40 ? 'Almost no text came out of this deck — the slides may be mostly images.' : null };
  }

  /* -------------------------------------------------------------------- docx */
  async function fromDOCX(file){
    await script(CDN.jszip);
    const zip = await window.JSZip.loadAsync(await readBuf(file));
    const f = zip.file('word/document.xml');
    if (!f) throw new Error('That does not look like a Word document.');
    const xml = await f.async('string');
    const text = clean(
      xml.replace(/<w:p\b[^>]*>/g,'\n')
         .replace(/<w:tab\b[^>]*\/>/g,' ')
         .replace(/<w:br\b[^>]*\/>/g,'\n')
         .replace(/<[^>]+>/g,'')
         .split('\n').map(l => unxml(l).trim()).filter(Boolean).join('\n')
    );
    return { text, pages: null, warning: text.length < 40 ? 'Very little text came out of this document.' : null };
  }

  /* ------------------------------------------------------------------- image
     OCR in the browser via tesseract. Slow (a few seconds a page) and weaker on
     handwriting than on print, but it means a photographed worksheet becomes
     usable text without sending the picture anywhere. */
  async function fromImage(file, onProgress){
    try {
      await script(CDN.tesseract);
    } catch {
      throw new Error('The text-recognition library could not be loaded, so this image cannot be read. Check your connection, or type the notes into a text file instead.');
    }
    if (!window.Tesseract) throw new Error('The text-recognition library did not initialise.');

    let worker;
    try {
      worker = await window.Tesseract.createWorker('eng', 1, {
        logger: msg => {
          if (msg.status === 'recognizing text' && onProgress)
            onProgress(`Reading the image… ${Math.round((msg.progress || 0) * 100)}%`);
        }
      });
      const { data } = await worker.recognize(file);
      const text = clean(data?.text || '');
      return {
        text, pages: null,
        warning: text.length < 40
          ? 'Almost no text could be recognised in this image. A sharper, straight-on photo in good light reads far better, and handwriting is much harder than print.'
          : null
      };
    } catch (err) {
      throw new Error(`Could not read text from that image. ${err.message || ''}`.trim());
    } finally {
      try { await worker?.terminate(); } catch {}
    }
  }

  /* ------------------------------------------------------------------ public */
  async function fromFile(file, onProgress){
    if (file.size > MAX_FILE) throw new Error(`That file is ${(file.size/1048576).toFixed(1)} MB. The limit is 25 MB — split it up or export a smaller version.`);

    const e = ext(file.name);
    const base = { name:file.name, size:file.size, text:'', images:[], pages:null, warning:null };

    if (file.type.startsWith('image/')) {
      if (file.size > MAX_IMAGE) throw new Error('Images must be under 5 MB. Reduce the resolution and try again.');
      return { ...base, kind:'image', ...cap(await fromImage(file, onProgress)) };
    }
    if (e === 'pdf')  return { ...base, kind:'pdf',  ...cap(await fromPDF(file)) };
    if (e === 'pptx') return { ...base, kind:'pptx', ...cap(await fromPPTX(file)) };
    if (e === 'docx') return { ...base, kind:'docx', ...cap(await fromDOCX(file)) };
    if (['txt','md','markdown','csv','tsv','rtf'].includes(e))
      return { ...base, kind:'text', ...cap({ text: clean(await readText(file)), pages:null, warning:null }) };

    if (e === 'ppt' || e === 'doc')
      throw new Error(`.${e} is the old binary Office format and cannot be read in a browser. Open it and “Save As” .${e}x, then upload that.`);
    if (e === 'pages' || e === 'key')
      throw new Error(`Apple ${e === 'pages' ? 'Pages' : 'Keynote'} files cannot be read directly. Export as PDF or Word and upload that.`);

    throw new Error(`Replan cannot read .${e} files. Supported: PDF, PowerPoint (.pptx), Word (.docx), plain text and images.`);
  }

  function cap(r){
    if (r.text && r.text.length > MAX_CHARS) {
      return { ...r, text: r.text.slice(0, MAX_CHARS),
        warning: [r.warning, `Only the first ${Math.round(MAX_CHARS/1000)}k characters were used — the file is long. Split it if the later sections matter.`].filter(Boolean).join(' ') };
    }
    return r;
  }

  return { fromFile, MAX_FILE, MAX_CHARS,
           accept: '.pdf,.pptx,.docx,.txt,.md,.csv,.tsv,.rtf,image/*' };
})();

if (typeof window !== 'undefined') window.Extract = Extract;
