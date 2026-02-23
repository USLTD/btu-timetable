# Easy BTU Timetable

Offline-first schedule optimizer for [BTU (Business and Technology University)](https://btu.edu.ge/) students. Upload your course data, set constraints, and find the best timetable for your week — all in the browser.

**[Try it live →](https://timetable.usltd.ge/)**

## Features

- **Course file upload** — drag-and-drop or browse to load HTML course pages exported from BTU's portal (or use the companion userscript)
- **Constraint engine** — per-day enable/disable/prioritize, allowed time windows, busy periods, min/max classes per day, max overlap tolerance, commute budgets
- **Instructor preferences** — prefer, neutral, or avoid specific lecturers
- **Smart scoring** — schedules ranked by free days, gap time, commute cost, and instructor fit
- **Web Worker scheduler** — heavy combinatorics run off the main thread for a responsive UI
- **Undo / Redo** — full settings history with Ctrl+Z / Ctrl+Y
- **What-if mode** — temporarily exclude courses to explore alternative plans
- **Group locking** — pre-select a specific group for any course
- **Drag-and-drop ordering** — reorder courses to set priority
- **Busy periods** — draw unavailable time blocks directly on the calendar
- **Schedule comparison** — pin & name your favourite schedules; side-by-side view
- **ICS export** — download any schedule as a `.ics` calendar file
- **URL sharing** — snapshot settings into a shareable link or compact hash
- **Dark mode** — system-aware with manual toggle (light / dark / auto)
- **i18n** — English and Georgian (ქართული) via Lingui
- **PWA** — installable, works offline via Workbox service worker
- **Keyboard shortcuts** — `G` generate, `D` theme, `P` pin, `←`/`→` browse schedules
- **Print-friendly** — clean CSS `@media print` layout
- **Accessible** — ARIA labels, focus-visible rings, keyboard navigation

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 10+

### Install & run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
pnpm build      # extracts & compiles i18n, type-checks, then bundles
pnpm preview    # serve the production build locally
```

### Userscript

[export-btu-timetable.user.js](export-btu-timetable.user.js) is a companion userscript that exports course data from BTU's portal into JSON files this app can import.

## Tech stack

| Layer | Library |
|---|---|
| UI | React 19, TypeScript 5.9, Tailwind CSS 4 |
| Build | Vite 8, React Compiler |
| i18n | Lingui 5 (.po catalogs) |
| PWA | vite-plugin-pwa + Workbox |
| Drag & drop | @dnd-kit/react |
| Icons | Lucide React |

## Deployment

The app auto-deploys to GitHub Pages on every push to `main` via the workflow in `.github/workflows/deploy.yml`.

## License

[MIT](LICENSE)
