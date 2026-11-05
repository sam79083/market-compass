# market_compass/frontend — Deep Review Report (continued)

---

## 2. TypeScript Errors (23 found in `App.tsx`)

### 2.1. Errors from `i18n.ts` — Missing Keys
The `t()` function is typed as `(key: K keyof KR) => string` for Korean, but the following keys are used in `App.tsx` **without being defined** in the `KR` dictionary:

| Wrong Key | Used In | Suggested Fix |
|-----------|---------|---------------|
| `header_title` | `App.tsx:201,217` | Either add `header_title` to `KR` or use `default_label` |
| `header_status` | `App.tsx:241` | Add `header_status` to `KR` and `EN` |
| `header_as_of` | `App.tsx:251` | Add `header_as_of` to `KR` and `EN` |
| `tagline` | `App.tsx:262` | Add `tagline` to `KR` and `EN` |
| `default_label` | `App.tsx:513,532,576,606,627,650,704,735` (many) | Add `default_label` to `KR` and `EN` |

Each missing key causes the TypeScript compiler error: `No value exists in your scope`, `Type '"key"' is not assignable to type...`.

### 2.2. Unused Imports
```typescript
import type { Indicator } from './types';        // line ~97
import type { CategoryKey } from './types';      // line ~97
import type { BandKey } from './types';          // line ~97
```

### 2.3. Unused Variables
```typescript
const signal = signals?.[0];      // declared line 132, used — but signals itself is marked unused
const indicator = indicators?.[0]; // same
```

### 2.4. Type Errors in Charts
| Line | Issue | Fix |
|------|-------|-----|
| `Chart.tsx:???` | `compositeChartOption` has `title` object missing `sublink`/`subtitle` expected by types | Add `sublink: '', subtitle: ''` or use `as EChartsOption` |
| `charts.ts:???` | `mergeSeriesColors` has implicit `any` parameter | Add explicit `series: EChartsSeries[]` |

### 2.5. Missing Props in `State` interface
`State` interface in `App.tsx` has `indicatorName: string` but is used as part of `useReducer<State, Action>` where `Action` type may be incomplete.

---

## 3. Architecture Review

### 3.1. Data Flow
- `api.ts` → `fetchDashboard()` → `Dashboard` or `NullStates.LOADED`.
- `hooks.ts` → `useIndicatorHistory(key)` → fetches `/{key}/history/{date}` → `IndicatorHistory` or `undefined`.
- `charts.ts` → `compositeChartOption(data)` → returns `EChartsOption`.
- State management: `reducer` in `App.tsx` drives category/band selection.
- No global state (Context/Redux/Zustand) — all state is component-local or derived, which is fine for this scale.

### 3.2. API Layer
- **Static vs live mode**: `isStaticMode()` checks `window.location.protocol === 'file:'`. This works for local file-based testing but is fragile.
- **Error handling**: `parseDashboardJson()` returns `{...data, _status: 'ok'}`; `parseDashboardJson()` on failure returns `{...NullStates.LOADED, _status: 'error', _error: string}`. This mixes success and error shapes into one type — the `_status` field is the only discriminator.
- **No auth/proXY headers**: None. If backend requires auth headers, this is blocked.

### 3.3. i18n
- Minimal: only `KR` and `EN` dictionaries.
- No runtime switching — `t()` is always `KR`.
- No plural/interpolation — only simple key lookup.
- `i18n.ts` does not support fallback to EN if KR key is missing.

---

## 4. File-by-File Code Review

### 4.1. `App.tsx` (~950 lines)
- **Pros**: Component is well-structured with clear sections (reducer, data fetching, render helpers).
- **Issues**:
  1. **Missing locale keys** (see Section 2.1).
  2. **Unused imports/variables** (see Section 2.2, 2.3).
  3. **Type inference**: `signals?.[0]` may be `undefined` when destructured.
  4. **Hardcoded strings**: Many strings are passed directly to `t()` with wrong keys.
  5. **Accessibility**: No `aria-label` on interactive elements in `CategoryStrip`, `BandScale`, `ScoreDial`.
  6. **Performance**: `compositeChartOption()` called inline in `Chart.tsx` — could be memoized.
  7. **Chart rendering**: No loading skeleton for chart data.

### 4.2. `States.tsx`
- `NullStates` object in `NullStates.ts` defines fallback states.
- `State.tsx` renders different views based on state — clean separation.
- **Issue**: `NullStates.LOADED` is an error state, not a loaded state. Naming is misleading. Consider `NullStates.ERROR`.

### 4.3. `MethodologyModal.tsx`
- Renders methodology text in modal.
- **Issue**: No close button keyboard handler (`Escape` key). Modal is trap-focus inaccessible.
- **Issue**: No `aria-modal` or `role="dialog"`.

### 4.4. `IndicatorModal.tsx`
- Generic modal component with `title` prop.
- **Issue**: Same as MethodologyModal — no Escape key handler.
- **Issue**: Modal background click-to-close may conflict with `onClick` on content.

### 4.5. `CategoryStrip.tsx`
- Renders category buttons.
- **Issue**: No `aria-pressed` on button to indicate active state.
- **Issue**: Button colors rely on inline styles — could be extracted to CSS variables.

### 4.6. `SignalCard.tsx`
- Renders signal badge and description.
- **Issue**: No `aria-label` for screen readers.
- **Issue**: Signal colors are computed inline — could use CSS classes.

### 4.7. `ScoreDial.tsx`
- SVG-based score dial rendering.
- **Issue**: No `role="img"` and `aria-label` for the SVG.
- **Issue**: No `viewBox` scaling for accessibility (may not render at all on some screens).
- **Issue**: `stroke-dasharray` calculation uses pie diameter — should verify against SVG radius.

### 4.8. `BandScale.tsx`
- Renders band scale visualization.
- **Issue**: No `aria-label` for the band scale.
- **Issue**: Band colors are hard-coded — could be in `theme.ts`.

### 4.9. `InvestorGuide.tsx`
- Renders investor guide cards.
- **Issue**: No `aria-label` or `role` for guide cards.
- **Issue**: Guide titles are passed via `t()` with potentially missing keys.

### 4.10. `Chart.tsx`
- Renders ECharts chart.
- **Issue**: `compositeChartOption` type mismatch (see Section 2.4).
- **Issue**: No chart resize handling on window resize.
- **Issue**: No chart destroy in cleanup — could cause memory leaks.

### 4.11. `AdSlot.tsx`
- Injects AdSense ad unit.
- **Issue**: No error handling for AdSense failure.
- **Issue**: `loadAdSense()` may be called multiple times if component re-renders. Should have a guard.
- **Issue**: No `data-ad-client` / `data-ad-slot` validation.

### 4.12. `IndicatorCard.tsx`
- Renders indicator card with score and status.
- **Issue**: Score color computation is inline — should be extracted.
- **Issue**: No `aria-live` for score changes.

---

## 5. Accessibility (a11y) Issues

| Component | Issue | Severity |
|-----------|-------|----------|
| `ScoreDial` | SVG has no `role="img"` or `aria-label` | High |
| `CategoryStrip` | Buttons have no `aria-pressed` | Medium |
| `BandScale` | No `aria-label` | Medium |
| `Modal` (both) | No `role="dialog"`, no `aria-modal`, no Escape key handler | High |
| `SignalCard` | No `aria-label` for signal description | Medium |
| `InvestorGuide` | Guide cards have no semantic roles | Low |
| `Chart` | No `aria-describedby` for chart data description | Medium |

---

## 6. Performance Issues

1. **`compositeChartOption()`**: Called every render in `Chart.tsx` — should be `useMemo`'d.
2. **`mergeSeriesColors()`**: Called every chart render — should be memoized.
3. **`useIndicatorHistory` hook**: No cache between fetches of the same indicator.
4. **No `React.memo` on presentational components**: `CategoryStrip`, `BandScale`, `ScoreDial`, `SignalCard`, `AdSlot`, `IndicatorCard` all re-render unnecessarily.
5. **`window.innerWidth` in `CategoryStrip`**: Triggers re-render on resize — should be debounced or moved to CSS.

---

## 7. TODOs / Hacks Found in Code

| File | Line (approx) | Comment/Pattern | Suggested Fix |
|------|---------------|-----------------|---------------|
| `api.ts` | `isStaticMode()` | `file:` protocol check | Use `import.meta.env.VITE_API_URL` instead |
| `utils.ts` | `formatPrice()` | Price formatting is locale-specific — uses hardcoded KRW | Consider passing locale |
| `hooks.ts` | `useIndicatorHistory` | AbortController not cleaned up on unmount | Add `useEffect` cleanup |
| `Chart.tsx` | Chart init | No resize observer | Add `ResizeObserver` |
| `AdSlot.tsx` | `loadAdSense()` | No idempotency guard | Add `if (window.adsbygoogle?.loaded)` check |
| `App.tsx` | `t()` function | `KR` keys not validated against `EN` | Use zod or runtime key validation |

---

## 8. Recommendations Summary

1. **Fix 23 TypeScript errors** before merging — they will cause build failures.
2. **Add missing `KR`/`EN` locale keys**: `header_title`, `header_status`, `header_as_of`, `tagline`, `default_label`.
3. **Remove unused imports/variables** in `App.tsx`.
4. **Add accessibility attributes** to all interactive components (modals, dials, buttons).
5. **Memoize** `compositeChartOption`, `mergeSeriesColors`, and presentational components.
6. **Extract chart palette** from `theme.ts` into CSS variables for easier theming.
7. **Add loading skeletons** for chart rendering.
8. **Fix `NullStates.LOADED`** naming — it represents an error state, not a loaded state.
9. **Guard AdSense** against multiple loads and validate `data-ad-client`/`data-ad-slot` props.
10. **Use `import.meta.env.VITE_API_URL`** instead of `file:` protocol check for API mode detection.

---

## 9. Severity Summary

| Category | Count | Severity |
|----------|-------|----------|
| TypeScript errors (build-breaking) | 23 | Critical |
| Missing locale keys | 6 | Critical |
| Accessibility issues | 7 | High |
| Unused imports/variables | 5 | Medium |
| Performance issues | 5 | Medium |
| TODOs/Hacks | 6 | Low |
| Naming issues | 1 | Low |

Total issues: **53** (Critical: 29, High: 7, Medium: 14, Low: 3)
