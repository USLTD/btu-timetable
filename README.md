# Easy BTU Timetable

Offline-first schedule optimizer for [BTU (Business and Technology University)](https://btu.edu.ge/) students. Upload your course data, set constraints, and find the best timetable for your week — all in the browser.

**[Try it live →](https://timetable.usltd.ge/)**

## Features

### Core

- **Course file upload** — drag-and-drop or browse to load HTML course pages exported from BTU's portal (or use the companion userscript)
- **Constraint engine** — per-day enable/disable/prioritize, allowed time windows, busy periods, min/max classes per day, max overlap tolerance, per-day commute budgets
- **Lecturer preferences** — prefer, neutral, or avoid specific lecturers
- **Smart scoring** — schedules ranked by free days, gap time, commute cost, and lecturer fit
- **Web Worker scheduler** — heavy combinatorics run off the main thread for a responsive UI

### Schedule Management

- **Schedule comparison** — pin & name your favourite schedules; side-by-side stat comparison
- **Collapsible schedule cards** — expand/collapse individual calendar views
- **Accordion results** — collapse the entire results section to quickly reach the footer
- **Statistics dashboard** — aggregate stats bar showing result count, best free days, min gaps, and score range
- **Find similar** — 1-group-swap neighbor search to explore close variations
- **What-if mode** — temporarily exclude courses to explore alternative plans

### Groups & Courses

- **Group locking** — pre-select a specific group for any course
- **Multi-group exclusion** — mark groups as occupied/unavailable
- **Drag-and-drop ordering** — reorder courses to set priority

### Calendar

- **Interactive calendar** — click events to see group details including room, lecturer, and all time slots
- **Busy periods** — draw unavailable time blocks directly on the calendar
- **Commute visualization** — before/after-class commute blocks shown on calendar
- **Gap highlighting** — idle gaps between classes shown with duration labels
- **Mobile day tabs** — swipe left/right to change weekday on mobile
- **Color legend** — mobile-only dot legend mapping course names to calendar colors

### Export

- **ICS export** — download any schedule as a `.ics` calendar file (with optional reminder)
- **HTML export** — clean HTML table grouped by day
- **PDF print** — opens a formatted print-friendly window for the focused schedule
- **Image export** — capture the calendar view as a PNG via `html-to-image`
- **Bulk export** — merge all pinned schedules into a single ICS download

### UX Polish

- **Toast notifications** — success/error/info feedback for all export and share actions
- **URL sharing** — snapshot settings into a shareable link or compact hash
- **Dark mode** — system-aware with manual toggle (light / dark / auto)
- **Consent banner** — dismissible banner linking to Privacy Policy and Terms of Service
- **Scroll-to-top FAB** — floating button appears on scroll for quick navigation
- **Empty state guide** — 3-step "How it works" onboarding for new users
- **Animated dialogs** — smooth scale/fade open/close transitions on desktop modals
- **i18n** — English and Georgian (ქართული) via Lingui, including full legal text
- **PWA** — installable, works offline via Workbox service worker
- **Keyboard shortcuts** — `G` generate, `D` theme, `P` pin, `←`/`→` navigate schedules
- **Accessible** — ARIA labels, focus-visible rings, focus trap in modals, keyboard navigation

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

[btu-timetable-helper.user.js](http://userscripts.usltd.ge/btu-timetable-helper.user.js) is a companion userscript that exports course data from BTU's portal into clean HTML table, JSON, CSV or Markdown files this app can import.

## Tech stack

| Layer | Library |
|---|---|
| UI | React 19, TypeScript 5.9, Tailwind CSS 4 |
| Build | Vite 8, React Compiler |
| i18n | Lingui 5 (.po catalogs) |
| PWA | vite-plugin-pwa + Workbox |
| Drag & drop | @dnd-kit/react |
| Icons | Lucide React |
| Mobile drawer | Vaul |
| Image export | html-to-image |

## Deployment

The app auto-deploys to GitHub Pages on every push to `main` via the workflow in `.github/workflows/deploy.yml`.

## License

[MIT](LICENSE)
