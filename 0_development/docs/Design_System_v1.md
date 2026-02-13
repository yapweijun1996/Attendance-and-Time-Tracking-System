# SATTS Design System v1

- Version: 1.0
- Date: 2026-02-12
- Scope: PC + Mobile + Tablet layout visual closure

## Attention Points (AP)
1. MUST keep interactions lightweight (transition <= 150ms, no continuous animation loops).
2. MUST keep camera/model usage scoped to verify/enrollment pages only.
3. MUST use shared visual tokens and utility classes for consistency.
4. MUST preserve readability across 390px mobile, ~768px tablet, and desktop widths.

## 1) Design Tokens
Defined in `/src/index.css` using CSS variables:

- Typography:
  - `--font-sans`: `"Sora", "Manrope", "Avenir Next", "Segoe UI", sans-serif`
- Core colors:
  - `--color-bg`: app background
  - `--color-surface`: primary card surface
  - `--color-surface-soft`: muted panel surface
  - `--color-border`: neutral border
  - `--color-text`: primary text
  - `--color-text-soft`: secondary text
- Semantic colors:
  - `--color-brand`, `--color-brand-hover`
  - `--color-success`, `--color-success-hover`
  - `--color-danger`, `--color-danger-hover`
  - `--color-info`, `--color-info-hover`
- Shape/elevation:
  - `--radius-md`, `--radius-lg`
  - `--shadow-soft`

## 2) Shared UI Utility Classes
Defined in `/src/index.css` (`@layer components`):

- Layout:
  - `.ui-shell`
  - `.ui-container`
- Surface:
  - `.ui-card`
  - `.ui-card-soft`
- Text:
  - `.ui-kicker`
  - `.ui-title`
  - `.ui-text`
- Controls:
  - `.ui-btn`
  - `.ui-btn-primary`
  - `.ui-btn-success`
  - `.ui-btn-danger`
  - `.ui-btn-info`
  - `.ui-btn-ghost`
  - `.ui-input`
  - `.ui-pill`
  - `.ui-nav-item`
- Page and flow layout:
  - `.ui-page-mobile`
  - `.ui-page-flow`
  - `.ui-main-mobile`
  - `.ui-main-flow`
  - `.ui-back-btn`
- Data and status:
  - `.ui-table-shell`
  - `.ui-table`
  - `.ui-thead`
  - `.ui-th`
  - `.ui-row`
  - `.ui-td`
  - `.ui-soft-item`
  - `.ui-note`
  - `.ui-note-xs`
  - `.ui-note-warn`
  - `.ui-note-error`
  - `.ui-progress-track`
  - `.ui-progress-bar`
  - `.ui-status-ok`
  - `.ui-status-pending`
  - `.ui-banner-error`
  - `.ui-banner-success`
  - `.ui-tab-shell`
  - `.ui-tab-list`
  - `.ui-tab-btn`

## 3) Tri-Platform Layout Rules

### Mobile (default)
- Staff routes: `/m/*`
- Bottom tab navigation
- Single-column task-first screens

### Tablet (`md` and above on Staff)
- Staff pages increase content width and spacing (`max-w-6xl`, left rail spacing)
- `MobileTabBar` switches to persistent vertical rail for touch ergonomics
- Home page uses two-column split (actions + recent events)

### PC Desktop (`lg` and above on Admin)
- Admin routes: `/admin/*`
- Left fixed sidebar + top header + content workspace
- Logs table shows desktop columns; mobile/tablet falls back to card list

## 4) IA Entry Points
- `/`: tri-platform landing
- `/m/home`: Staff app start
- `/admin/logs`: Admin app start

## 5) Updated Components (v1 closure)
- App shell:
  - `/src/app/AppRouter.tsx`
  - `/src/app/pages/LandingPage.tsx`
- Admin:
  - `/src/admin/AdminApp.tsx`
  - `/src/admin/components/AdminSidebar.tsx`
  - `/src/admin/components/AdminTopNav.tsx`
  - `/src/admin/pages/*`
- Staff shared UI refresh:
  - `/src/mobile/components/ActionButtonPair.tsx`
  - `/src/mobile/components/TopStatusBar.tsx`
  - `/src/mobile/components/MobileTabBar.tsx`
  - `/src/mobile/components/SyncBadge.tsx`
  - `/src/mobile/pages/HomePage.tsx`
  - `/src/mobile/pages/HistoryPage.tsx`
  - `/src/mobile/pages/ProfilePage.tsx`
  - `/src/mobile/pages/ResultPage.tsx`
  - `/src/mobile/pages/VerifyPage.tsx`
  - `/src/mobile/pages/EnrollConsentPage.tsx`
  - `/src/mobile/pages/EnrollCapturePage.tsx`
  - `/src/mobile/pages/EnrollLivenessPage.tsx`

## 6) Definition of Done
- `npm run lint` passes
- `npm run build` passes
- Tri-platform routing works:
  - `/` opens landing
  - `/m/home` opens staff layout
  - `/admin/logs` opens admin layout
- Visual style is tokenized, not ad-hoc per page

## 7) Next Design Steps
1. Add Playwright screenshot baseline for mobile/tablet/desktop core pages.
2. Add accessibility snapshot checklist (focus ring, contrast, keyboard flow).
3. Track bundle delta from design-token growth and cap non-critical CSS.
