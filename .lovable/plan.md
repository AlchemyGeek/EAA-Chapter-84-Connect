

## Visual Specification Implementation Plan

The current app uses the default shadcn/ui theme (neutral grays). The visual spec calls for an aviation-inspired blue theme, mobile-first responsive layout, Inter font, and specific accessibility improvements. Here is the implementation plan.

### 1. Update color system in `src/index.css`

Replace the CSS custom properties with an aviation-blue palette:

- **Primary**: Deep navy blue (~215 70% 18%) for header, nav, primary buttons
- **Secondary**: Medium blue (~215 55% 45%) for links, active tabs
- **Accent**: Amber/orange (~35 90% 55%) for limited call-to-action emphasis and status indicators
- **Background**: Very light gray (~210 20% 97%)
- **Card**: White
- **Border**: Light gray
- **Foreground**: Near-black dark gray
- **Muted foreground**: Medium gray
- **Sidebar**: Deep navy background with white text (aligns with "header/nav bar" being primary blue)

Remove the `.dark` theme block entirely (spec says light-theme only, no dark mode).

### 2. Add Inter font

- Add `@import` for Inter from Google Fonts in `index.css`
- Set `font-family: 'Inter', system-ui, sans-serif` on `body`

### 3. Make AppLayout responsive (mobile-first)

Current layout uses a fixed 240px sidebar. The spec requires mobile-first with no sidebar on mobile.

Changes to `src/components/AppLayout.tsx`:
- On mobile: Replace sidebar with a **top header bar** containing logo and hamburger menu
- Hamburger opens a slide-out sheet/drawer with nav items
- On desktop (md+): Keep the sidebar layout
- Increase nav link tap targets to minimum 44px height
- Style sidebar/header with primary navy background and white text

### 4. Update Auth page

- Add subtle branding (small "Chapter 84" heading)
- Use proper `<label>` elements above inputs (not placeholder-only)
- Make button full-width (already done)
- Ensure 16px minimum font size on inputs

### 5. Update Members page for mobile

- On mobile: Convert table rows to **stacked cards** showing key info (name, type, standing) with a "View" link
- On desktop (md+): Keep the current table
- Ensure search input has proper label

### 6. Update MemberDetail page

- Stack cards single-column on mobile (already uses `md:grid-cols-2`, good)
- Increase field label/value text sizes to meet 14px/16px minimums

### 7. Update Import, ImportHistory, ImportReport pages for mobile

- ImportHistory/ImportReport tables: Convert to stacked cards on mobile
- Import page: Already mostly mobile-friendly, ensure tap targets are 44px+

### 8. Update Export page

- Minor: Ensure buttons are full-width on mobile

### 9. Global accessibility improvements

- Add visible focus indicators (already partially handled by shadcn ring styles)
- Ensure all form inputs have visible labels (not just placeholders)
- Badge/status indicators: Add icons alongside color (spec says no color-only indicators)

### Files to modify

| File | Changes |
|------|---------|
| `src/index.css` | New color palette, Inter font import, remove dark theme |
| `tailwind.config.ts` | Add Inter to fontFamily |
| `src/components/AppLayout.tsx` | Mobile hamburger menu + responsive sidebar |
| `src/pages/Auth.tsx` | Proper labels, sizing |
| `src/pages/Members.tsx` | Mobile card layout for member rows |
| `src/pages/MemberDetail.tsx` | Font size adjustments |
| `src/pages/Import.tsx` | Mobile tap target sizing |
| `src/pages/ImportHistory.tsx` | Mobile card layout |
| `src/pages/ImportReport.tsx` | Mobile card layout |
| `src/pages/Export.tsx` | Full-width mobile buttons |

