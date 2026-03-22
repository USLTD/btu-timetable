# Easy BTU Timetable

Offline-first schedule optimizer for [BTU (Business and Technology University)](https://btu.edu.ge/) students. Upload your course data, set constraints, and find the best timetable for your week — all in the browser.

**[Try it live →](https://timetable.usltd.ge/)**

## Features

### Core

- **100% Local & Offline** — No cloud backend, no AI magic, no databases. Everything runs instantly in your browser on your device.
- **Course file upload** — drag-and-drop or browse: HTML/HTM (clean tables), JSON, CSV, or Markdown exports.
- **Manual course entry** — add courses, groups, and sessions directly in the UI.
- **Constraint engine** — per-day enable/disable/prioritize, allowed time windows, busy periods, min/max classes per day, and max overlap tolerance.
- **Commute constraints** — global round-trip commute plus per-day overrides.
- **Lecturer preferences** — prefer, neutral, or avoid specific lecturers.
- **Smart scoring** — schedules ranked by free days, gap time, commute, and lecturer fit.
- **Web Worker scheduler** — heavy combinatorics run off the main thread for a responsive UI.

### Schedule Management

- **Schedule comparison** — pin & name your favourite schedules; compare A/B and inspect different groups.
- **Collapsible schedule cards** — expand/collapse individual calendar views.
- **Statistics dashboard** — aggregate stats bar showing result count, best free days, min gaps, and score range.
- **Find similar** — 1-group-swap neighbor search to explore close variations.
- **What-if mode** — temporarily exclude courses to explore alternative plans.
- **Rejection explanations** — see why some combinations were rejected.
- **Undo / redo** — keyboard shortcuts and toolbar buttons.

### Groups & Courses

- **Group locking** — pre-select a specific group for any course.
- **Multi-group exclusion** — mark groups as occupied/unavailable.
- **Drag-and-drop ordering** — reorder courses to set priority.

### Calendar

- **Interactive calendar** — click events to see group details including room, lecturer, and all time slots.
- **Busy periods** — draw unavailable time blocks directly on the calendar.
- **Gap highlighting** — idle gaps between classes shown with duration labels.
- **Mobile day tabs** — swipe left/right to change weekday on mobile.
- **Color legend** — mobile-only dot legend mapping course names to calendar colors.

### Export

- **ICS export** — download any schedule as a `.ics` calendar file (with optional reminder).
- **HTML export** — clean HTML table grouped by day.
- **PDF print** — opens a formatted print-friendly window for the focused schedule.
- **Image export** — PNG/JPEG/SVG from a generated grid (via `html-to-image`).
- **Bulk export** — merge all pinned schedules into a single ICS download.
- **Shareable URLs** — copy or import schedule state via hash.

### UX Polish

- **Toast notifications** — success/error/info feedback for all export and share actions.
- **Local Settings Checkpoints** — snapshot settings into labeled save states.
- **Dark mode** — system-aware with manual toggle (light / dark / auto).
- **Consent banner** — dismissible banner linking to Privacy Policy and Terms of Service.
- **Scroll-to-top FAB** — floating button appears on scroll for quick navigation.
- **Animated dialogs** — smooth scale/fade transitions.
- **i18n** — English and Georgian (ქართული) via Paraglide, including full legal text.
- **PWA** — installable, works offline via Workbox service worker.
- **Keyboard shortcuts** — `G` generate, `D` theme, `P` pin, `←`/`→` navigate schedules.
- **Accessible** — ARIA labels, focus trap in modals, keyboard navigation.
- **Experimental features** — the app includes experimental flags that may change without notice.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 10+

### Install & run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
pnpm build      # extracts & compiles i18n, type-checks, then bundles
pnpm preview    # serve the production build locally
```

### Userscript

[btu-timetable-helper.user.js](http://userscripts.usltd.ge/btu-timetable-helper.user.js) is a companion userscript that exports course data from BTU's portal into clean HTML table, JSON, CSV or Markdown files this app can import.

## Tech stack

| Layer | Library |
|---|---|
| UI | Preact 10, TypeScript 5.9, UnoCSS (Tailwind Reset) |
| Build | Vike, Vite 7 |
| i18n | Paraglide JS 2 |
| PWA | vite-plugin-pwa + Workbox |
| Drag & drop | @dnd-kit/react |
| Icons | Lucide Preact |
| Mobile drawer | Vaul |
| Image export | html-to-image |
| Testing | Vitest, @testing-library/preact |

## Deployment

The app auto-deploys to GitHub Pages on every push to `main` via the workflow in `.github/workflows/deploy.yml`.

## License

[MIT](LICENSE)
