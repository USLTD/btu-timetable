# Roadmap

This roadmap is developer-centric and focuses on concrete implementation steps. Experimental flags and features may evolve without notice; work here is intended to stabilize and formalize those capabilities.

## Stabilize & polish (near-term)
- Promote selected experimental features to defaults
  - Define a QA checklist per feature (happy path, edge cases, regression risks).
  - Verify feature flag fallback behavior when toggled off mid-session.
  - Add acceptance criteria and usage notes in docs.
- Accessibility & keyboard pass
  - Audit focus order and keyboard navigation across dialogs and menus.
  - Confirm focus trapping and ESC handling in modal/drawer variants.
  - Add manual a11y test steps to docs.
- Test coverage expansion
  - Unit tests for scheduler scoring, rejection reasons, and overlap rules.
  - Parser tests for HTML/JSON/CSV/Markdown imports.
  - Export tests for ICS/HTML generation (smoke-level).
  - Component tests for `SettingsPanel`, `FileUpload`, `FeatureFlagsDialog`, and `CourseList`.
  - Hook tests for `useFeatureFlags`, `useMockData`, and `useUndoRedo`.
  - Logic tests for `mock-data` enable → disable → restore cycle.
  - Build gate: ensure `pnpm test:run` passes on CI.

## Ratings integration (mid-term, prioritized)
- Data contract and storage
  - Define lecturer rating schema (rating, count, reviews, metadata).
  - Decide caching and invalidation strategy.
  - Add a versioned mock fixture for regression tests.
- API client implementation
  - Integrate with third-party API (contract, rate limits, auth if required).
  - Implement request + error handling with timeouts and retries.
  - Add local cache and offline fallback behavior.
  - Wire telemetry-free error reporting (console + UI hints).
  - Review third-party terms, privacy, and usage limits.
- UI enablement
  - Replace mock-only paths with real data flows.
  - Keep graceful fallback when data is missing or unavailable.
  - Validate filtering by rating with mixed data quality.

## Sharing enhancements (mid-term)
- Non-destructive share import
  - Add a preview dialog for shared state before applying.
  - Compute diff summary vs. current state.
  - Offer "Temporary view" and "Apply changes" actions.
  - Default to preview + automatic snapshot before apply.
- Safe apply flow
  - Automatic checkpoint before applying shared state.
  - Restore flow if user cancels or detects unexpected changes.
  - Copyable summary of changes for debugging/support.

## Import/export expansion (mid-term)
- Import quality improvements
  - Document CSV/TSV templates and provide sample files.
  - Improve file format detection and user feedback.
  - Add clear validation errors for ambiguous data.
  - Keep direct portal integration out of scope for now.
- Export variants
  - Add minimal vs. full export presets.
  - Support locale-aware export labels and timestamps.
  - Ensure exports remain stable across schema changes.

## Performance & algorithm tuning (long-term)
- Scheduler performance
  - Profile combinatorics on large datasets.
  - Add heuristics to prune early (optional toggle).
  - Document max-safe inputs and expected runtime.
- Rendering performance
  - Audit large list rendering and calendar updates.
  - Reduce unnecessary recalculations and DOM updates.

## Tech & maintenance (long-term)
- Vite 8 upgrade
  - Track plugin compatibility and update when green.
  - Validate build output across target browsers.
- CI & release guardrails
  - Add CI checks for lint/test/build stability.
  - Add documentation drift checks for core features.

## Backlog
- Notifications support
  - Push/system notifications when a timetable is selected and set.
  - Respect user permission and browser support.
  - Offline notification scheduling via service worker.
- Log viewer
  - Floating toggle button (corner overlay) that opens a dialog/drawer.
  - Show app event logs (actions, warnings, errors) for developer/power-user debugging.
  - Auto-capture key events: course file imports, schedule generation, export actions, feature flag changes.
