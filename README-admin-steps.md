# W.H. Academy — Admin panel: Steps question type (build step 2)

The admin panel now authors **and** grades the Boss-Battle "steps" question
type, natively integrated into the existing Boss Papers builder and the grading
screen. This is plan build-step **2**.

## What changed in `index.html`
- **Builder:** a new **`+ Steps question`** button. A steps question shows: the
  question text (with a live KaTeX preview), a list of step rows — each with its
  text, a **distractor** checkbox, ↑/↓ reorder and ✕ remove, and a per-row live
  preview — a **+ Add step** button, and a **Grading** control (Manual, or Auto
  with optional *marks/step* and *distractor penalty*).
- **Grading screen:** for a steps answer it shows the **student's built
  sequence** (distractors left in are flagged), the **correct sequence**, and —
  when the paper was set to Auto — an **auto-grade suggestion** with a *Use
  suggestion* button. The marks box pre-fills from the suggestion; you can
  always override before releasing. Save-draft / release work exactly as before.
- KaTeX is **self-hosted** (`assets/vendor/katex/…`) and loaded in `<head>`,
  because the admin CSP forbids a CDN. A small `assets/js/katex-render.js`
  renders mixed text + `$…$` math.

## Deploy (your separate admin repo)
Upload, keeping paths:
```
index.html                              (replaces your current one)
assets/js/katex-render.js               (new)
assets/vendor/katex/katex.min.js        (new)
assets/vendor/katex/katex.min.css       (new)
assets/vendor/katex/fonts/*.woff2       (new — 20 files)
```
No backend change here — the backend (`BossBattle.gs`) already handles the steps
shape and returns the auto-grade suggestion.

## Authoring flow
1. Boss Papers → set Level / Class / Subject / title → **+ Steps question**.
2. Type the question (math in `$…$`). Write the **real steps top-to-bottom in
   the correct order**; tick the wrong/extra ones as **distractor**. You do
   **not** enter a correct order — the order you type *is* the answer.
3. Set marks. Pick **Manual** or **Auto** grading. **Save & activate**.
4. Grading → open a submission → steps questions show the suggestion; accept or
   override, add feedback, release.

> The output your panel POSTs to `bossbattle/admin/createPaper` for a steps
> question is exactly:
> `{ type:'steps', text, marks, steps:[{text,distractor}], grading:{mode[,perStep][,distractorPenalty]} }`
> — the shape the backend expects.
