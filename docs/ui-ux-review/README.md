# Portal UI / UX review — 24 November 2026

This increment updates the shared interface used by the existing portals and fixes specific navigation and responsive issues found during source and browser review. It does not replace every departmental screen or certify every live business workflow.

## Coverage

The browser review opens 16 role dashboards at **360, 768 and 1440 CSS pixels** (48 role/viewport combinations), then captures each desktop dashboard in dark mode. Requests are intercepted and answered with synthetic, mostly empty API fixtures. No real account, production backend, database or integration is used. Screenshots are UI evidence, not business metrics.

| Portal | Roles reviewed | Main improvements |
| --- | --- | --- |
| Super Admin | super_admin | Dedicated Workspaces section; overview stays prominent; scrollable section navigation; mobile header clearance; accessible mobile drawer |
| Administration | admin | Role-correct portal identity; mobile header clearance; keyboard-accessible mobile drawer |
| Executive | ceo | Shared readable headers, page search and mobile header clearance |
| HR | hr, it_hr | Restored mobile navigation with settings/support; stable HR theme |
| Manager | it_manager | One menu for desktop, mobile and page search; removed links to unregistered routes; stable Manager theme |
| IT | it_admin | Restored role-filtered mobile navigation and settings/support links |
| Employee | it_employee | Consistent personal-workspace theme and shared interaction improvements |
| Finance | finance_manager, finance_employee | Header actions wrap without crushing the title; search dropdowns can extend outside headers; department filter has an accessible name |
| Legal | law_head, law_employee | Restored role-filtered mobile navigation; selected project retained for heads; stable Legal theme |
| Media Head | media_head | Shared headers, page search and mobile header clearance |
| Media Sales | media_sales | Shared headers, page search and table/form improvements |
| Media Marketing | media_marketing | Shared headers, page search and table/form improvements |
| Outsourcing | freelancer | Accessible mobile drawer; closed menu links leave keyboard navigation; time-entry modal uses shared focus/scroll handling; field labels connected |

The canonical backend role set contains 16 roles. An `employee` compatibility role exists in frontend routing but is not a canonical backend User role; its shared shell is exercised through `it_employee`. Project workspaces, CRM, support and portfolio pages receive shared component changes where those components are used, but were not individually exercised end to end.

## Shared design and interaction changes

- Corrected CSS layering so explicit text/icon sizes can override base defaults. Added visible keyboard focus and readable numeric table formatting.
- Header titles and descriptions wrap instead of truncating or collapsing into a narrow column. Action controls have their own responsive space. Header dropdowns are no longer clipped by overflow.
- Added **Find a page**, a role-compatible workspace/page directory with search, current-page indication, empty results, initial focus and Escape dismissal. It uses existing routes and respects effective portal access and page-entry role eligibility.
- Shared page shells now reuse the same header. Portal colors follow the workspace being viewed rather than the visiting administrator's primary role.
- Inputs and selects have stable unique IDs, connected labels/help/errors, `aria-invalid` and error announcements. Mobile text inputs use 16px text to avoid focus zoom on iOS; physical iOS devices were not tested.
- Tables support horizontal keyboard scrolling, Enter/Space row activation, loading semantics, column scopes and partial selection indication.
- Modals and drawers render above navigation, lock background scrolling, restore focus and release timers. Nested dialogs handle Escape only in the top dialog. Mobile filters reuse the shared drawer.
- Warning buttons have readable dark text; common button sizes have minimum heights. Passive cards no longer lift on hover as if they were actions.
- Application render failures show recovery guidance instead of exposing raw technical messages in production. Development details remain expandable.

## Verification and artifacts

- `results.json`: per-role viewport results, headings, mobile navigation, page search, dark-mode and screenshot references.
- `shared-components-results.json`: real browser assertions for unique field IDs, label/error association, row keyboard activation, partial selection, modal focus, nested Escape behavior, mobile filters, scroll restoration and page overflow.
- `index.html`: local screenshot gallery. Images contain synthetic review data.
- Changed UI components/helpers pass targeted ESLint; production build passes. Vite retains its existing large-bundle warning.

To repeat locally, run Vite from `frontend` on port 4178 with `VITE_API_URL=http://127.0.0.1:5000`, then run `node scripts/reviewPortalUi.cjs` and `node scripts/reviewSharedUi.cjs` from `backend`. The scripts use the installed Puppeteer browser. `/scripts/ui-review.html` is a development fixture and is not an entry in the production router or normal production build.

## Remaining acceptance work

Use authorized staging accounts with realistic records to validate dense tables, long names, large attachment lists, permission changes, financial forms, uploads, notifications and destructive-action flows. Test Safari/iOS and assistive technology separately. Source review and synthetic Chromium checks do not establish those outcomes.
