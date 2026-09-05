# Replan

A study planner that builds a daily schedule from your classes, assignments and
free time — and redistributes the work whenever you fall behind. Free and open:
no account required, no payment, nothing stored on a server unless you connect
one yourself.

## Running it

Open `index.html` (landing page) or `app.html` (the app) in a browser. That is
the whole install.

The app loads scripts from `assets/`, so if your browser blocks relative paths
on `file://` URLs, serve the folder instead:

```bash
python3 serve.py
```

Then visit <http://localhost:4173/app.html>.

## Layout

| Path | What it is |
|---|---|
| `index.html` | Marketing landing page |
| `app.html` | The app — all views, the scheduler, AP data |
| `assets/sat-bank.js` | SAT starter questions (original, not College Board material) |
| `assets/practice.js` | Practice engine: drill, timed module, results analysis |
| `assets/studyset.js` | Builds notes, flashcards and questions from uploaded text |
| `assets/extract.js` | PDF / PPTX / DOCX / image / text extraction, with OCR |
| `serve.py` | Local static server for development |

## What works today

- **Classes** at Regular, CP, Honors and AP level for grades 9–12, from an
  80-course catalog, the 43-course AP catalog, or a custom entry. Custom classes
  must map to their closest standard course so study material can attach to them.
- **Scheduler.** Set free minutes per weekday and an effort estimate per task.
  Work is spread across the days before each deadline, earliest deadline first,
  never exceeding a day's capacity. Tests finish the day before they are sat.
- **Redistribution.** Miss a day and the plan rebuilds on next open, reporting
  exactly how many minutes moved and from where. Nothing is dropped and no
  deadline shifts. If the work genuinely will not fit, it says which deadline is
  at risk instead of cramming.
- **AP reference.** All 43 courses with official links, delivery modes, the full
  May 2027 exam schedule, portfolio deadlines and the 2027 change log.
- **Practice.** Untimed drill with feedback after each question, or a timed
  module with a hideable timer and results held to the end. Multiple choice,
  grid-in and free response. Every choice carries its own explanation.
- **Results.** A donut by scoring domain plus ranked strong and weak topics.
  Weak topics can be turned into real dated review sessions in the scheduler.
- **Study sets from your own uploads.** Drop in a PDF, slide deck, Word file,
  text notes or a photo of a worksheet, and Replan builds notes, flashcards,
  multiple-choice and short-answer questions immediately. No account, no key,
  no network call. Photos and scans are read with in-browser OCR.

## How study sets are built

There is no API key and no server because there is no model. The set is
assembled directly from your text:

- **Definitions** are found by pattern (`Term: meaning`, *X refers to Y*,
  *X is defined as Y*) and become flashcards and matching questions.
- **Distractors are real.** The wrong options on a definition question are other
  genuine definitions from the same document, preferring ones under the same
  heading, so a wrong answer is a plausible confusion rather than filler.
- **Cloze questions** blank out a figure or proper noun from a factual sentence,
  and the wrong options are phrases of the same kind used elsewhere in the file.
- **Topics** come from the document's own headings, which is what drives the
  weak-topic analysis after a session.

Everything is traceable to something you uploaded, so nothing can be invented.

The honest limit: this drills **recall**, not reasoning. It cannot write a
question requiring synthesis across sources or an inference the material never
states. Prose notes produce far better sets than sparse slide fragments, and
printed text OCRs far better than handwriting. If a file is too thin, it says so
rather than padding the set out.

## Not built yet

- **Accounts.** Email and password via Supabase is the chosen approach but is
  not wired up. It needs a project URL and anon key. Until then, data lives in
  one browser and does not sync between devices.
- **Spaced repetition** across sessions. Flashcards and questions currently
  replay in a shuffled order rather than being scheduled by recall strength.

## A note on the data

AP course data was compiled on 4 September 2026 from College Board sources and
is labelled throughout with what was verified and what was not. Where the source
document says a field was not retrieved, the app says so and links to the
official page rather than guessing. Replan is an independent student tool, not
affiliated with or endorsed by the College Board.

The SAT starter questions are original, written in College Board style. They are
not reproduced from any released exam and are worth reviewing before students
rely on them.
