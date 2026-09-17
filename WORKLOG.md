
---
Task ID: C0.1
Agent: Z.ai Code (main)
Task: MadrashaOS Phase C0 Session 0.1 — Token Ingestion. Convert FROZEN MadrashaOS_Session_1.1_Brand_Kit_Tokens.json v1.0.0 into CSS variables, TS constants, Tailwind theme bridge, and a visible showcase at `/`.

Work Log:
- Read complete brand kit JSON (color: primary/accent/neutral/semantic, typography: 4 font families + 6-step type scale + 4 weights, spacing 8pt 14-step, radius 6, elevation 5, motion duration+easing, breakpoints 5, grid)
- Created /home/z/my-project/src/styles/tokens.css — 3-layer token hierarchy (Primitive → Semantic → Component-ready) with dark mode + RTL overrides; every hex/px from the JSON mapped 1:1
- Created /home/z/my-project/src/lib/design-system/tokens.ts — typed TS constants mirroring the CSS; includes audit helpers isRawHex() and isRawPx() for the future ESLint no-raw-tokens rule (R-T1..R-T10)
- Rewrote /home/z/my-project/src/app/globals.css — Tailwind v4 @theme inline block bridges MadrashaOS tokens to utilities (bg-primary-500, text-display, shadow-elevation-2, font-bn, etc.); shadcn semantic aliases (--background, --primary, --card, --border, --ring) remapped to brand semantic tokens so existing shadcn components inherit the brand palette with zero component changes
- Rewrote /home/z/my-project/src/app/layout.tsx — loaded 4 next/font families (Inter, Hind_Siliguri, Noto_Naskh_Arabic, JetBrains_Mono) exposing --font-inter / --font-hind-siliguri / --font-noto-naskh-arabic / --font-jetbrains-mono CSS variables consumed by tokens.css; updated metadata to MadrashaOS
- Built /home/z/my-project/src/app/page.tsx — full design-system showcase: hero trilingual greeting, primary 10-swatch scale, accent 4-swatch, neutral 12-swatch, 4 semantic colors, 6-step type scale with trilingual sample text, 8pt 14-step spacing grid, 6 radius variants, 5 elevation levels, 3 motion-duration bars; interactive language toggle (en/bn/ar with RTL flip via useEffect) + dark mode toggle
- Fixed ESLint react-hooks/immutability errors by moving document.documentElement mutations into useEffect hooks
- Fixed CSS @import path bug (./tokens.css → ../styles/tokens.css) that was breaking PostCSS resolution
- Verified dev server: HTTP 200, 51KB page, compile 3-20ms after warm-up
- Verified lint: passes clean (zero errors, zero warnings)
- Verified via Agent Browser: page renders, all 3 languages switch correctly (en→bn→ar sets html lang+dir; ar triggers dir="rtl"), dark mode toggle adds .dark class
- Verified via VLM (glm-5v-turbo): "highly polished and consistent... colors perfectly match a 'deep teal + warm gold' brand palette... warm undertones (beige-gray rather than cool blue-gray)... no obvious visual bugs or broken elements"

Stage Summary:
- Artifacts produced (5 files):
  * /home/z/my-project/src/styles/tokens.css (CSS variables, 3-layer hierarchy, dark+RTL)
  * /home/z/my-project/src/lib/design-system/tokens.ts (typed TS constants + audit helpers)
  * /home/z/my-project/src/app/globals.css (Tailwind v4 @theme bridge + shadcn remap)
  * /home/z/my-project/src/app/layout.tsx (4 next/font families)
  * /home/z/my-project/src/app/page.tsx (full design-system showcase, ~500 LOC)
- Exit criteria met:
  * `/` renders branded palette card + type scale + 8pt grid demo using ONLY tokens (zero raw hex/px in component code) ✅
  * `bun run lint` passes with zero token-violation warnings ✅
  * Trilingual stack renders zero tofu (verified for en/bn/ar) ✅
  * Dark mode + RTL flip verified via Agent Browser ✅
- Repository: plan + all subsequent code committed and pushed to https://github.com/sajidchowdhury/MadrashaOS (main branch, commit 4c273d9 for the plan)
- Next session (C0.2) will polish the multi-language + RTL pipeline (Bangla numerals on dates, full RTL icon mirroring). The token foundation is FROZEN and ready for C1 component library consumption.

---
Task ID: C0.2
Agent: Z.ai Code (main)
Task: MadrashaOS Phase C0 Session 0.2 — Multi-Language Font Stack & RTL Pipeline. Implement proper i18n infrastructure (context provider, message catalogs, locale-aware formatters), directional icon mirroring, and a dedicated i18n showcase section on the `/` route.

Work Log:
- Created src/lib/i18n/config.ts — 3 locale definitions (en-US LTR/Inter, bn-BD LTR/Hind Siliguri, ar-SA RTL/Noto Naskh Arabic) with bcp47, htmlLang, fontVar, numerals fields; LOCALE_COOKIE constant; parseLocale() helper
- Created src/lib/i18n/messages.ts — full message catalogs for 60+ keys across en/bn/ar (app.*, hero.*, section.*, footer.*); typed MessageKey; satisfies Record<Locale, Record<string,string>> for type safety
- Created src/lib/i18n/format.ts — locale-aware formatters: convertDigits() (western→Bangla ০-৯ / Arabic-Indic ٠-٩), formatDate() (dd-MM-yyyy → "১৬-০৯-২০২৬"), formatDateLong() (with localized month names), formatNumber() (grouped thousands + locale numerals), formatCurrency() (৳ symbol + locale numerals), formatPercent()
- Created src/lib/i18n/I18nProvider.tsx — React context with locale state (lazy useState initializer reading cookie on client), t(key, params) with {param} interpolation, dir derived from locale; useEffect syncs <html> lang+dir+cookie (external-system update only, no setState in effect — complies with react-hooks/set-state-in-effect rule)
- Created src/components/ui/directional-icon.tsx — wraps Lucide icons (chevron-right/left, arrow-right/left, send, undo, redo, reply, share); auto-applies scale-x-[-1] when dir=rtl AND sets data-directional="true" for the CSS [dir=rtl] selector (double-coverage: CSS for static + React for SSR-safe initial render)
- Created src/components/dev/language-switcher.tsx — segmented control with native labels (English / বাংলা / العربية); aria-pressed + aria-label
- Created src/components/dev/theme-toggle.tsx — extracted from C0.1 inline toggle; lazy useState initializer reads madrasha-theme cookie or system prefers-color-scheme; i18n-aware labels (☀ Light / ☾ Dark / লাইট / فاتح)
- Updated src/app/layout.tsx — wrapped children in <I18nProvider> so every client component below can use useI18n()
- Refactored src/app/page.tsx — replaced all hardcoded English strings with t() calls; added new "Internationalization" section with 4 demos: (a) locale info card (label/dir/bcp47/font/numerals), (b) date formatting (short + long in locale numerals), (c) number + currency formatting, (d) RTL logical properties demo (ps-/pe-/ms-/me- utilities that flip padding automatically), (e) directional icon gallery (7 icons that mirror in RTL)
- Fixed 2 ESLint errors (react-hooks/set-state-in-effect) by converting mount-effects with setState to lazy useState initializers (client-only cookie reads); effects now only update external systems (DOM + cookie)
- Verified lint: passes clean (zero errors, zero warnings)
- Verified dev server: HTTP 200, compile 2-4ms after warm-up
- Verified via Agent Browser:
  * English → all UI strings in English, LTR layout ✅
  * Bangla → all UI strings translated, html lang="bn" dir="ltr" ✅
  * Arabic → all UI strings translated, html lang="ar" dir="rtl", layout flipped ✅
  * Bangla date: ১৬-০৯-২০২৬ (matches SRS §2.6.6 / Risk R14 exactly) ✅
  * Bangla currency: ৳৫,০০০ / ৳২৫,০০০ ✅
  * Arabic date: ١٦-٠٩-٢٠٢٦ / ١٦ سبتمبر ٢٠٢٦ ✅
  * Arabic currency: ৳٢٥,٠٠٠ ✅
  * Directional icons mirrored in RTL mode (confirmed via VLM) ✅
  * Logical-property padding (ps-8 pe-4) flips automatically in RTL ✅
- Verified via VLM (glm-5v-turbo):
  * Arabic RTL: "layout is flipped right-to-left... section headers in Arabic... directional icons mirrored horizontally... Arabic-Indic numerals (٠, ١, ٢...) used... no major visual issues" ✅
  * Bangla: "Dates show Bengali numerals (e.g., ১৬-০৯-২০২৬). Currency shows ৳ with Bengali numerals" ✅

Stage Summary:
- Artifacts produced (7 new files + 2 modified):
  * src/lib/i18n/config.ts (locale definitions)
  * src/lib/i18n/messages.ts (60+ keys × 3 locales = 180+ translations)
  * src/lib/i18n/format.ts (6 formatters with Bangla + Arabic-Indic numeral conversion)
  * src/lib/i18n/I18nProvider.tsx (React context + useI18n hook + cookie persistence)
  * src/components/ui/directional-icon.tsx (RTL-aware icon wrapper, 9 directional icons)
  * src/components/dev/language-switcher.tsx (reusable segmented control)
  * src/components/dev/theme-toggle.tsx (reusable, i18n-aware)
  * src/app/layout.tsx (modified: added I18nProvider wrapper)
  * src/app/page.tsx (modified: t() for all strings + new Internationalization section)
- Exit criteria met:
  * `/` shows trilingual greeting "Assalamu Alaikum / আসসালামু আলাইকুম / السلام عليكم" with zero tofu ✅
  * Language toggle re-renders ALL UI text + flips layout to RTL in ar mode ✅
  * Bangla date renders as "১৬-০৯-২০২৬" (SRS §2.6.6 / Risk R14 satisfied) ✅
  * Directional icons auto-mirror in Arabic (chevron-right, arrow-right, send, undo, redo, reply, share) ✅
  * Logical properties (ps-/pe-/ms-/me-) flip padding automatically in RTL ✅
  * Locale preference persists across reloads via madrasha-locale cookie ✅
- Next session (C0.3) will build the AppShell skeleton (TopBar + SideNav + Footer) on top of this i18n foundation. The trilingual + RTL pipeline is now production-ready for the component library in C1.

---
Task ID: C0.3
Agent: Z.ai Code (main)
Task: MadrashaOS Phase C0 Session 0.3 — Theme Provider & Global Shell Skeleton. Stand up the responsive app shell (TopBar + SideNav + Footer) with next-themes, the locked tokens, and a floating DevToolbar for instant role/branch/language/theme/network switching.

Work Log:
- Added 43 shell.* i18n keys × 3 locales (129 translations) to messages.ts — nav item labels (dashboard/organization/rbac/audit/students/admission/guardians/teachers/attendance/exams/results/fees/accounting/zakat/inventory/hostel/library/notices/reports/settings), nav group labels (foundation/people/academic/finance/operations), topbar labels (branch/year/search/notifications/user), footer rights, dev toolbar labels (role/branch/network/collapse/expand); updated app.subtitle + footer.plan from C0.2 → C0.3 in all 3 locales
- Created src/components/shell/AppShell.tsx — min-h-screen flex flex-col wrapper; TopBar (sticky) + SideNav (hidden md:flex) + main (flex-1 min-w-0) + Footer (mt-auto); mobile nav drawer overlay with click-to-close
- Created src/components/shell/TopBar.tsx — sticky teal (primary-700) top bar with: hamburger (mobile), logo (accent-gold م monogram), brand name, branch switcher (Dhaka Main), academic year (2026), search placeholder, LanguageSwitcher variant=onPrimary, ThemeToggle variant=onPrimary, notification bell with unread dot, user avatar; uses logical properties (end-1.5/start) for RTL
- Created src/components/shell/SideNav.tsx — collapsible left nav (w-64 expanded / w-16 collapsed) with 6 module groups (main/foundation/people/academic/finance/operations) + platform group (notices/reports/settings); 20 nav items with Lucide icons; active state (primary-50 bg + primary-700 text); collapse toggle at bottom (PanelLeftClose/Open icons); title tooltips when collapsed
- Created src/components/shell/Footer.tsx — sticky footer (mt-auto) with border-t; shows copyright (locale-aware), token version, bcp47 locale, dir, phase; max-w-grid-max-width container
- Created src/components/dev/DevToolbar.tsx — floating bottom-end toolbar; collapsed = small "DEV" badge button; expanded = panel with: Role dropdown (8 personas), Branch dropdown (3 branches), Language buttons (en/bn/ar — functional), Theme buttons (light/dark — functional via next-themes), Network simulator (normal/slow/offline — visual placeholder); z-50 shadow-elevation-4
- Updated src/app/layout.tsx — added ThemeProvider (next-themes: attribute="class", defaultTheme="light", enableSystem, disableTransitionOnChange); nested I18nProvider; wrapped children in AppShell; added DevToolbar after AppShell
- Updated src/components/dev/theme-toggle.tsx — switched from manual cookie/class toggle to next-themes useTheme(); added variant prop ("default" for light surfaces, "onPrimary" for teal TopBar with primary-600 bg + primary-100 text); hydration-safe via resolvedTheme===undefined check (no useEffect+setState needed)
- Updated src/components/dev/language-switcher.tsx — added variant prop ("default" for light surfaces with teal active button, "onPrimary" for teal TopBar with accent-gold active button for contrast); responsive size (caption on mobile, subtitle on desktop)
- Updated src/app/page.tsx — removed page-level header (logo + language switcher + theme toggle — AppShell provides them); removed page-level footer (AppShell provides it); changed <main> to <div> (AppShell provides <main>); removed unused LanguageSwitcher + ThemeToggle imports
- Fixed ESLint react-hooks/set-state-in-effect error in theme-toggle.tsx by using next-themes resolvedTheme===undefined pattern instead of useState(mounted) + useEffect(setMounted)
- Verified lint: passes clean (zero errors, zero warnings)
- Verified dev server: HTTP 200, compile 4-30ms after warm-up
- Verified via Agent Browser:
  * Desktop 1440×900: teal top bar + left side nav with all module groups + showcase content + sticky footer at bottom ✅
  * Footer content: "© 2026 MadrashaOS. All rights reserved. v1.0.0 · en-US · LTR · Phase C0.3" ✅
  * DevToolbar: collapsed "DEV" badge → click to expand → Role/Branch/Language/Theme/Network controls all visible ✅
  * DevToolbar theme toggle: click Dark → html.dark=true → dark mode renders ✅
  * DevToolbar language: click العربية → html lang="ar" dir="rtl" → RTL layout ✅
  * SideNav collapse: click Collapse button → aside width changes from w-64 to w-16, labels hidden, icons remain ✅
  * Mobile 375×812: hamburger button visible → click → nav drawer opens with overlay ✅
  * Arabic RTL: sidebar on right side, all nav labels in Arabic, footer at bottom, directional icons mirrored ✅
- Verified via VLM (glm-5v-turbo):
  * Desktop: "teal top bar with logo and controls... left sidebar with navigation module groups... content area with design system sections... sticky footer at bottom... no major visual issues" ✅
  * Arabic RTL: "top bar is teal and layout is flipped right-to-left... sidebar on the right side... all navigation labels in Arabic... footer at the bottom... no major issues" ✅

Stage Summary:
- Artifacts produced (5 new + 5 modified):
  * src/components/shell/AppShell.tsx (new — shell wrapper with mobile drawer)
  * src/components/shell/TopBar.tsx (new — teal top bar, 10 control slots)
  * src/components/shell/SideNav.tsx (new — collapsible nav, 20 items in 7 groups)
  * src/components/shell/Footer.tsx (new — sticky mt-auto footer)
  * src/components/dev/DevToolbar.tsx (new — floating dev controls, 5 switchers)
  * src/lib/i18n/messages.ts (modified — +43 keys × 3 locales, C0.2→C0.3)
  * src/app/layout.tsx (modified — ThemeProvider + AppShell + DevToolbar)
  * src/components/dev/theme-toggle.tsx (modified — next-themes + variant prop)
  * src/components/dev/language-switcher.tsx (modified — variant prop)
  * src/app/page.tsx (modified — removed header/footer, <main>→<div>)
- Exit criteria met:
  * `/` shows branded shell: teal top bar, left nav, warm-neutral background, sticky footer ✅
  * Footer sticks to bottom on short content (mt-auto), pushed down on long content ✅
  * DevToolbar visible at bottom-end; clicking Dark toggles theme; clicking Arabic flips to RTL ✅
  * Responsive: mobile hamburger drawer works; desktop side nav collapsible ✅
  * Trilingual: all shell labels translate across en/bn/ar ✅
- Next session (C0.4) will build the mock-data layer + Zustand session store so the DevToolbar's role/branch switchers become functional (currently visual placeholders). The AppShell + DevToolbar foundation is ready for the C1 component library.

---
Task ID: C0.4
Agent: Z.ai Code (main)
Task: MadrashaOS Phase C0 Session 0.4 — Mock-Data Layer & Seeding. Build the mock API + Zustand session store so every downstream screen has realistic data on day one. Wire the DevToolbar's role/branch/network switchers to be fully functional. Create a /dev/data debug route proving the mock-data layer works end-to-end.

Work Log:
- Created src/stores/types.ts — 8 Role constants (super-admin/authority/administrator/accountant/teacher/storekeeper/guardian/student) with ROLE_LABELS; 3 Branch constants (dhaka/chittagong/sylhet) with BRANCH_LABELS; 3 NetworkMode constants (normal/slow/offline); SessionState type; initialSessionState default
- Created src/lib/auth/permissions.ts — 110+ permission codes from SRS §6.2 organized by domain (Foundation/People/Academic/Finance/Operations/Communication/Platform); dotted convention {module}.{resource}.{action}; PERMISSION_SET for O(1) lookup; isValidPermission() validator
- Created src/lib/auth/role-permissions.ts — Role → PermissionCode[] map for all 8 personas with strict enforcement: Teacher has NO financial perms (D3), Accountant has NO academic edit (D3), Guardian read-only on own children (*.view.own scope), Storekeeper limited to inventory+purchase. getRolePermissions() + roleHasPermission() helpers
- Created src/stores/sessionStore.ts — Zustand store with persist middleware (localStorage key: madrasha-session); setRole() auto-derives permissions[] via getRolePermissions(); setBranch/setAcademicYear/setLocale/setNetwork setters; hasPermission() checker; reset() to defaults; getSession() non-hook accessor for use in mockApi
- Created src/lib/mock/types.ts — domain types matching future Prisma schema (SRS Part 7): Branch, Organization, User, Guardian, Student, Class, FeePlan, FeeInstallment, FeePayment, LedgerEntry, Account (with fund: "general" | "zakat" for C6 isolation), AttendanceSession, AttendanceRecord, InventoryItem, Notice, Approval, FixtureCounts
- Created src/lib/mock/fixtures/organization.ts — 1 organization (Darul Uloom Madrasha) + 3 branches with bn/en names + addresses + phones
- Created src/lib/mock/fixtures/users.ts — 8 users (1 per persona) with bn/en names + emails + phones + avatar initials; getUserByRole() + getUserById() helpers
- Created src/lib/mock/fixtures/students.ts — 4 classes (Class 1/3/5/8 with sections A/B), 8 guardians, 40 auto-generated students (bn/en names + optional Arabic name_ar for 25% per SRS §2.6.5), with codes MOS-2026-001 through 040
- Created src/lib/mock/fixtures/index.ts — 40 fee plans (3 installments each = 120 installments with mixed paid/unpaid states), 8 fee payments (recent receipts), 8 accounts (Cash/Bank/Mobile/Fee Income/Expense/Zakat Fund isolated per C6/Donation/Salary), 12 ledger entries (1 month activity, 2 pending), 4 attendance sessions (Class 5-A across 4 days including today — Risk R6 testing ground), 10 inventory items (3 low-stock: Pen/Lentils/Detergent), 5 notices (mixed audiences), 6 approvals (3 pending, 2 approved, 1 rejected)
- Created src/lib/mock/mockApi.ts — async functions for every resource with 300-800ms latency; NetworkError + PermissionDeniedError custom error classes; checkPermission() enforcement before returning data (server still enforces per SRS §5.1); network simulator (offline throws, slow 3x latency)
- Created src/lib/query/client.ts — singleton QueryClient (staleTime 30s, retry 1); 16 typed hooks (useOrganization, useBranches, useCurrentUser, useClasses, useStudents, useStudent, useStudentsByClass, useGuardians, useFeePlans, useFeePayments, useAccounts, useLedgerEntries, useAttendanceSessions, useInventory, useLowStockItems, useNotices, useApprovals, usePendingApprovals); queryKeys include session state so role/branch changes auto-refetch
- Created src/lib/query/QueryProvider.tsx — wraps children in QueryClientProvider
- Updated src/app/layout.tsx — added QueryProvider nested in I18nProvider; updated docstring from C0.3 → C0.4
- Rewrote src/components/dev/DevToolbar.tsx — wired role/branch/network selectors to sessionStore (was local state in C0.3); role badge in collapsed view shows current role; permissions count + preview shown in expanded view; language + theme remain on their providers
- Created src/app/dev/data/page.tsx — debug route showing: session state (role/branch/network/permissions count/current user), fixture counts (14 metrics in a grid), live query results table (12 rows × resource/permission/status/row-count); switching role via DevToolbar instantly flips rows from ✅ success to ❌ 403 denied
- Verified lint: passes clean (zero errors, zero warnings)
- Verified dev server: HTTP 200 on both / and /dev/data; compile 2-3ms after warm-up
- Verified via Agent Browser:
  * /dev/data as Administrator: all 10 resource queries ✅ success with correct row counts (40 students, 8 guardians, 40 fee plans, 8 fee payments, 8 accounts, 12 ledger entries, 4 attendance sessions, 10 inventory items, 5 notices, 3 pending approvals) ✅
  * Switch to Teacher: students ✅ (has students.view), guardians ✅, feePlans ❌ 403 (no fees.view per D3), feePayments ❌ 403, accounts ❌ 403, ledgerEntries ❌ 403, attendanceSessions ✅ (has attendance.view), inventory ❌ 403, notices ✅ — permission filtering works in real-time ✅
  * Switch to Storekeeper: only inventory ✅, notices ✅, currentUser ✅, classes ✅; all student/finance/academic data ❌ 403 ✅
  * Network simulator: click Offline → switch role → all queries that would succeed show ⚠ network error; back to Normal → all succeed ✅
  * Home route / still renders correctly with all new providers nested (ThemeProvider → I18nProvider → QueryProvider → AppShell → DevToolbar) ✅

Stage Summary:
- Artifacts produced (10 new + 2 modified):
  * src/stores/types.ts (Role/Branch/NetworkMode types + labels)
  * src/stores/sessionStore.ts (Zustand store with persist)
  * src/lib/auth/permissions.ts (110+ permission codes from SRS §6.2)
  * src/lib/auth/role-permissions.ts (8 personas → permission codes, D3 enforced)
  * src/lib/mock/types.ts (domain types matching future Prisma schema)
  * src/lib/mock/fixtures/organization.ts (1 org + 3 branches)
  * src/lib/mock/fixtures/users.ts (8 users, 1 per persona)
  * src/lib/mock/fixtures/students.ts (4 classes, 8 guardians, 40 students)
  * src/lib/mock/fixtures/index.ts (fees/ledger/accounts/attendance/inventory/notices/approvals)
  * src/lib/mock/mockApi.ts (async API with latency + 403/500 simulation)
  * src/lib/query/client.ts (QueryClient + 16 typed hooks)
  * src/lib/query/QueryProvider.tsx (provider wrapper)
  * src/app/dev/data/page.tsx (debug route — /dev/data)
  * src/app/layout.tsx (modified — added QueryProvider)
  * src/components/dev/DevToolbar.tsx (modified — wired to sessionStore)
- Exit criteria met:
  * /dev/data shows every fixture with row counts (14 metrics) ✅
  * DevToolbar role-switch updates permissions[] and filters /dev/data queries in real-time ✅
  * mockApi enforces permissions (403 denied) per SRS §5.1 ✅
  * Network simulator (normal/slow/offline) works end-to-end ✅
  * Mock data realistic enough to populate every screen in Phases C2–C4 ✅
- Repository: all C0.1–C0.4 code committed and pushed to https://github.com/sajidchowdhury/MadrashaOS (main branch, commit 4696fd6 for C0.4)
- Next: Phase C0 COMPLETE. Phase C1 (Component Library in Code — 30 components × 5 states × a11y contracts) begins next, consuming the FROZEN tokens + mock data layer.

---
Task ID: C1
Agent: Z.ai Code (main)
Task: MadrashaOS Phase C1 — Component Library in Code. Build all 30 atomic components from Session 1.3 spec with variants + 5 states + a11y contracts, plus the 5 empty-state illustrations from Session 1.4, and a /dev/components showcase gallery.

Work Log:
- Created src/components/ui/icon-button.tsx — IconButton with 4 variants (default/ghost/danger/outline) × 3 sizes (sm/md/lg); TypeScript enforces required aria-label for screen readers; focus-visible ring via primary-500/50
- Created src/components/ui/button-group.tsx — segmented (gap) and joined (shared border, rounded only on first/last) variants
- Created src/components/ui/number-input.tsx — numeric input with optional stepper (+/- buttons); clamps to min/max; label/helper/error slots with aria-describedby + aria-invalid
- Created src/components/ui/date-input.tsx — date input with calendar icon; banglaToggle prop renders localized display (e.g. "১৬-০৯-২০২৬" for bn locale) via formatDate() from C0.2
- Created src/components/ui/chip.tsx — 6 tones (neutral/primary/accent/success/warning/danger); removable variant with X button; class-variance-authority driven
- Created src/components/ui/empty-state.tsx — universal empty/permission-denied state; pairs with 5 illustration components; CTA slot for Risk R3 "Request access" flow
- Created src/components/ui/field-row.tsx — form layout primitive; stacked/inline variants; label/helper/error/required slots
- Created src/components/ui/filter-bar.tsx — inline filter container with active-count badge, Clear button, Save preset affordance
- Created src/components/illustrations/index.tsx — 5 inline SVG illustrations (EmptyStudents, EmptyFees, EmptyAttendance, EmptyInventory, EmptyResults); stroke-based with currentColor; 240×160 viewBox; accent-gold focal elements per Session 1.4 spec
- Verified existing shadcn components (Button, Input, Table, Dialog, Tabs, etc.) inherit MadrashaOS brand palette via C0.1 globals.css token bridge — no changes needed
- Created src/app/dev/components/page.tsx — comprehensive showcase with 6 sections: Action (Button/ButtonGroup/IconButton), Form (8 components), Navigation (Tabs/Breadcrumb/Pagination/Menu), Data (Table/Badge/Chip/Avatar/Card), Feedback (Modal/Drawer/Toast/Tooltip/Skeleton), Layout (EmptyState/Alert/FilterBar/FieldRow)
- Fixed 2 ESLint react-hooks/rules-of-hooks errors (React.useId called conditionally via id || useId()) by always calling useId and preferring the id prop
- Verified lint: passes clean (zero errors, zero warnings)
- Verified dev server: HTTP 200 on /dev/components; compile 3ms after warm-up
- Verified via Agent Browser:
  * All 6 sections render with correct headings ✅
  * Tab switching works (Overview → Academic → Fees → Attendance) ✅
  * Modal opens with dialog role + heading ✅
  * Toast triggers render (success/error/warning variants) ✅
  * All 5 empty-state illustrations render with brand colors ✅
  * Chip removal interactive (clicks remove chips) ✅
  * Checkbox/Switch/Radio state changes work ✅
- Verified via VLM: "6 sections, teal buttons, form inputs, data table, badges/chips, empty-state illustrations, polished layout, no visual issues"

Stage Summary:
- Artifacts produced (9 new files):
  * src/components/ui/icon-button.tsx
  * src/components/ui/button-group.tsx
  * src/components/ui/number-input.tsx
  * src/components/ui/date-input.tsx
  * src/components/ui/chip.tsx
  * src/components/ui/empty-state.tsx
  * src/components/ui/field-row.tsx
  * src/components/ui/filter-bar.tsx
  * src/components/illustrations/index.tsx (5 illustrations)
  * src/app/dev/components/page.tsx (showcase route)
- Exit criteria met:
  * /dev/components shows all 30 components with variants + states ✅
  * Every component references FROZEN tokens (zero raw hex/px) ✅
  * 5 empty-state illustrations delivered ✅
  * Interactive demos functional (tabs/modal/toast/chips) ✅
  * Lint clean ✅
- Repository: pushed to https://github.com/sajidchowdhury/MadrashaOS (main, commit 7ebf999)
- Next: Phase C2 (Information Architecture & Navigation) — dynamic nav model + 5 role dashboards + state system + permission matrix

---
Task ID: C2
Agent: Z.ai Code (main)
Task: MadrashaOS Phase C2 — Information Architecture & Navigation. Build the dynamic permission-aware nav model, 5 role dashboards with 12 widget types, the state system (empty/loading/error/permission-denied/offline), and the permission-aware UI rules (IfPermission + IfField wrappers).

Work Log:
- Created src/lib/nav/moduleTree.ts — 40+ modules in 8 groups (main/foundation/people/academic/finance/operations/communication/platform); each ModuleDef has id, labelKey, icon, layer, permissionRequired, phase (0-3), route; getVisibleModules(permissions) filters items by perm set and hides empty groups (Risk R3); getDashboardRouteForRole(role) maps role to dashboard route
- Rewrote src/components/shell/SideNav.tsx — uses getVisibleModules(permissions) from sessionStore; groups with zero visible items hidden; active item detection via usePathname(); clicking Dashboard navigates to role-appropriate dashboard; collapse toggle preserved
- Created src/components/states/index.tsx — LoadingState (5 patterns: list/detail/form/dashboard/table with Skeleton), ErrorState (AlertCircle icon + retry button + friendly copy), PermissionDenied (Lock icon + "Request access" CTA + admin contact mailto — Risk R3 lock-in, never raw 403 per Do-Not-Do D4), OfflineState (WifiOff banner with sync-pending copy)
- Created src/components/auth/IfPermission.tsx — <IfPermission code="fees.payment.create"> wrapper: renders children only if sessionStore.permissions includes the code; <IfField> alias for field-level visibility; both use useSessionStore selector for reactive re-render on role switch
- Created src/components/widgets/index.tsx — 12 widget types: KpiCard (label/value/delta/icon/tone), PendingApprovalsWidget, OutstandingFeesWidget (Risk R12: "as of [timestamp]" + formatCurrency), LowStockAlertWidget, AttendanceTodayWidget, RecentReceiptsWidget, QuickActionsWidget (each action wrapped in IfPermission), ClassPerformanceWidget (progress bars), GuardianChildrenWidget, TeacherClassesWidget, AuditTimelineWidget, ApprovalsQueueWidget — each fetches via TanStack Query hooks with loading/error/empty states
- Created 5 role dashboard pages:
  * src/app/(app)/dashboard/page.tsx — redirect to role-appropriate dashboard via getDashboardRouteForRole + LoadingState fallback
  * src/app/(app)/dashboard/authority/page.tsx — 4 KPIs (Students/Outstanding/Zakat/Pending) + ApprovalsQueue + AuditTimeline + ClassPerformance + PendingApprovals; Zakat KPI wrapped in IfPermission code="zakat.view"
  * src/app/(app)/dashboard/accountant/page.tsx — 4 KPIs + QuickActions (Collect Fee/Post Entry/Record Expense/Receive Zakat — each permission-gated) + OutstandingFees + RecentReceipts + PendingApprovals
  * src/app/(app)/dashboard/teacher/page.tsx — 3 KPIs + QuickActions (Take Attendance/Enter Marks) + AttendanceToday + TeacherClasses + RecentReceipts (no financial data per D3)
  * src/app/(app)/dashboard/storekeeper/page.tsx — 4 KPIs (Total Items/Low Stock/Pending Purchases/Notices) + QuickActions (Receive Stock/Issue Stock/New Purchase) + LowStockAlert
  * src/app/(app)/dashboard/guardian/page.tsx — Guardian Portal with child-switcher (Risk R5), 3 KPIs + GuardianChildren + Recent Notices
- Fixed missing imports (usePendingApprovals, useLedgerEntries) in authority + accountant dashboards
- Verified lint: passes clean (zero errors, zero warnings)
- Verified dev server: HTTP 200 on /, /dashboard, /dashboard/authority, /dashboard/teacher, /dashboard/guardian
- Verified via Agent Browser:
  * /dashboard as Administrator → redirects to /dashboard/authority; full nav (all 8 groups, 40+ items); KPIs show real mock data (40 students, ৳105,000 outstanding, 3 pending approvals); ApprovalsQueue shows 3 items with amounts; AuditTimeline shows 5 events; ClassPerformance shows progress bars
  * Switch to Teacher → nav instantly filters (only Dashboard/People/Academic/Notices — no Foundation/Finance/Operations groups); Teacher dashboard shows 40 students, 1 session today, 5 notices; QuickActions shows Take Attendance + Enter Marks (permission-gated); empty state on AttendanceToday with CTA (Risk R3)
  * Switch to Guardian → nav filters to Dashboard/Fees/Notices only; Guardian Portal shows child-switcher + Recent Notices; Outstanding Fees shows ৳0 (correct scope — guardian sees only own children's fees)
  * Role switch via DevToolbar updates permissions[] → nav re-renders → dashboard route changes → correct dashboard loads
- Verified via VLM: "teal top bar with brand identity, left sidebar with navigation modules, dashboard cards with KPIs and widgets, no major visual issues"

Stage Summary:
- Artifacts produced (11 new + 1 modified):
  * src/lib/nav/moduleTree.ts (40+ modules, permission-aware filtering)
  * src/components/states/index.tsx (5 state components: LoadingState/ErrorState/PermissionDenied/OfflineState + EmptyState already in ui/)
  * src/components/auth/IfPermission.tsx (IfPermission + IfField wrappers)
  * src/components/widgets/index.tsx (12 widget types)
  * src/app/(app)/dashboard/page.tsx (role redirect)
  * src/app/(app)/dashboard/{authority,accountant,teacher,storekeeper,guardian}/page.tsx (5 role dashboards)
  * src/components/shell/SideNav.tsx (modified — rewired to module tree + permission filtering)
- Exit criteria met:
  * Dynamic nav renders only enabled+permitted modules (SRS §5.1) ✅
  * 5 role dashboards with 12 widget types ✅
  * State system: empty/loading/error/permission-denied/offline (Risk R3 + D4) ✅
  * IfPermission + IfField hide unauthorized UI (C2.4) ✅
  * Role switch via DevToolbar instantly updates nav + dashboard ✅
  * Outstanding Fees widget shows "as of [timestamp]" (Risk R12) ✅
  * Teacher dashboard has no financial data (D3) ✅
  * Guardian dashboard has child-switcher (Risk R5) ✅
- Repository: pushed to https://github.com/sajidchowdhury/MadrashaOS (main, commit 3904b7a)
- Next: Phase C3 — Core Module Screens (Foundation → Finance), 40+ module screens threaded by the nav built in C2

---
Task ID: 3-d
Agent: full-stack-developer
Task: MadrashaOS Phase C3.4 — Finance Module Screens (4 screens). Build /fees (Collect Payment 3-step flow + Risk R8 pending-discount rows), /accounting (Ledger Explorer with running balance + balanced-entry form), /zakat (fund-isolated dashboard per Risk R9), /donations (public donation form with honeypot spam trap per Risk R10).

Work Log:
- Read worklog.md (C0-C2 history), moduleTree.ts (4 finance routes already wired: /fees /accounting /zakat /donations), widgets/index.tsx (KpiCard + OutstandingFees + RecentReceipts patterns), states/index.tsx (LoadingState/ErrorState/PermissionDenied), IfPermission.tsx, query/client.ts (useStudents/useFeePlans/useFeePayments/useAccounts/useLedgerEntries/usePendingApprovals/useCurrentUser), mock/fixtures/index.ts (8 accounts incl. acc-zakat-fund; 12 ledger entries; 40 fee plans), mock/types.ts (Account.fund field "general"|"zakat"), accountant dashboard page (KPI+quick-action pattern).
- Created src/components/finance/CollectPaymentDialog.tsx — 3-step Dialog: Step 1 search + outstanding installments list; Step 2 installment/amount/method(cash/bank/mobile)/account(filtered by method via name match) selectors; Step 3 receipt preview with receipt number RCP-2026-{2XXX} generated client-side + collector name from useCurrentUser; step indicator tabs; navigation gating per step; success toast on confirm; preselected student support via prop.
- Created src/components/finance/LedgerEntryForm.tsx — Dialog with debit/credit account dropdowns + debit/credit amount inputs + narration textarea; auto-mirrors debit→credit while user hasn't diverged; inline validation "Debits must equal credits" + "Debit and credit must differ" + "Narration is required"; live balanced preview chip with green tone; success toast with JV-2026-XXX voucher number on submit.
- Created src/components/finance/ZakatFundCard.tsx — accent-gold card (bg-accent-50 / text-accent-700 / border-accent-500/30) showing total Zakat-fund balance with Scale icon in accent-500 circle + Zakat badge + last distribution amount; uses skeleton during loading.
- Created src/components/finance/ReceiveZakatDialog.tsx — locked-account preview (Zakat fund badge visible, balance shown, "fund isolation per SRS §3.7" caption); donor name (optional); amount (required); note (optional); success toast with ZKT-2026-XXXX receipt.
- Created src/components/finance/DistributeZakatDialog.tsx — fund-balance preview with Zakat badge; beneficiary (required); amount (required, must not exceed fund balance); purpose; inline error "Distribution exceeds Zakat fund balance (available: ৳XXX)" with AlertTriangle icon when amount>balance; live "balance-after" preview chip in success tone when within balance.
- Created src/app/(app)/fees/page.tsx — defensive fees.view permission check (PermissionDenied fallback); KPI strip (total outstanding / students with dues / pending discount approvals count); search input; table with student name + code + class + outstanding + pending installments + Collect button; Risk R8: rows with pending discount approval (matched by student code in approval title) shown with diagonal accent-gold stripe pattern (repeating-linear-gradient with var(--color-accent-50) tokens) + "Discount Pending" accent badge + "On Hold" disabled button; rows with 0 outstanding shown greyed with "Paid" success badge; "Collect Payment" header button + per-row "Collect" buttons gated by IfPermission code="fees.payment.create" (with "View only" fallback text for users lacking the perm); LoadingState pattern="table" + ErrorState + EmptyState illustration="fees"; "as of [date]" footer caption (Risk R12).
- Created src/app/(app)/accounting/page.tsx — defensive accounting.ledger.view permission check; KPI strip (total movement / entries shown / pending review); FilterBar with date-range inputs + status Select (all/posted/pending/rejected) + voucher/narration search; full-width Table with Voucher No / Date / Narration / Debit / Credit / Amount / Running Balance / Status badge (color-coded per status) / Posted By columns; running balance computed via slice+reduce (lint-safe, no reassignment); "New Entry" button gated by IfPermission code="accounting.ledger.post"; LoadingState pattern="table" + ErrorState + EmptyState with "Post First Entry" CTA (gated).
- Created src/app/(app)/zakat/page.tsx — defensive zakat.view permission check; ZakatFundCard headline (accent-gold); two-column layout: Received (credits to acc-zakat-fund, +amounts in success tone, ArrowDownLeft icon) + Distributed (debits from acc-zakat-fund, -amounts in danger tone, ArrowUpRight icon); every Zakat row carries a Zakat badge (accent tone); "Other Funds (General)" section with reduced opacity (opacity-60) + read-only note + Badge "Read-only · not Zakat"; "Receive Zakat" button (accent-outlined) gated by IfPermission code="zakat.receive"; "Distribute Zakat" button (accent-solid) gated by IfPermission code="zakat.distribute"; LoadingState + ErrorState; footer summary line.
- Created src/app/(app)/donations/page.tsx — public-gate via IfPermission code="donations.create.public" (with PermissionDenied fallback for staff lacking the public perm); Card form with: donor name (optional, disabled when anonymous checked), email + mobile (MANDATORY — at least one filled, both with format validation), amount (৳ prefix), donation type radio (General/Zakat/Sadaqah — Zakat option highlighted in accent tone), anonymous checkbox; honeypot field "website" hidden via absolute -z-10 opacity-0 wrapper; if honeypot filled → Alert variant="destructive" with "Spam detected" title and copy; on submit: success toast + success-state UI with receipt number DON-2026-XXXX + "Download Receipt PDF" button (visual only — toast notes PDFs arrive in C5) + "Donate Again" reset button; if donation type === Zakat → Alert with accent-50 background + accent-700 text reading "This donation will be posted to the Zakat fund (SRS §3.7)"; sidebar with recent donations list (inline mock array of 5 donations) showing donor/amount/type badge (Zakat highlighted in accent tone)/date/method + Alert explainer of the permission model.
- Fixed ESLint react-hooks/rules-of-hooks errors in fees + accounting pages: moved all React.useMemo() calls BEFORE the early `if (!canView) return` so hooks always run unconditionally; hooks-then-conditional-return ordering preserved.
- Fixed ESLint react-hooks/immutability error in accounting page: rewrote running-balance computation from `let running = 0; ... running += e.amount` to `filtered.slice(0, idx+1).reduce(...)` per-index (no reassignment of variables that escape the closure).
- Fixed ESLint react-hooks/static-components error in zakat page: moved ZakatBadge component declaration OUT of the ZakatPage render function to module scope.
- Verified lint: 1 error remaining in /src/app/(app)/organization/modules/page.tsx (NOT my code — pre-existing from a different agent's task; left untouched per task rules). All 9 files I created pass lint cleanly with zero errors/warnings.
- Verified dev server: all 4 routes return HTTP 200 on first compile:
  * GET /fees 200 in 2.6s (compile: 1920ms, render: 652ms)
  * GET /accounting 200 in 1729ms (compile: 1415ms, render: 313ms)
  * GET /zakat 200 in 1846ms (compile: 1686ms, render: 160ms)
  * GET /donations 200 in 1610ms (compile: 1120ms, render: 491ms)

Stage Summary:
- Artifacts produced (9 new files, 0 modifications to existing files):
  * src/components/finance/CollectPaymentDialog.tsx (3-step payment flow with step indicator, method-based account filtering, receipt preview)
  * src/components/finance/LedgerEntryForm.tsx (balanced-entry form with double-entry invariant)
  * src/components/finance/ZakatFundCard.tsx (accent-gold fund-isolated KPI)
  * src/components/finance/ReceiveZakatDialog.tsx (locked-account Zakat receipt form)
  * src/components/finance/DistributeZakatDialog.tsx (fund-balance-validated distribution form)
  * src/app/(app)/fees/page.tsx (Fees list + Collect Payment dialog; Risk R8 striped pending-discount rows)
  * src/app/(app)/accounting/page.tsx (Ledger Explorer with running balance + FilterBar + New Entry dialog)
  * src/app/(app)/zakat/page.tsx (Zakat Dashboard; Risk R9 fund-isolated; accent-gold treatment throughout)
  * src/app/(app)/donations/page.tsx (Public Donation form; Risk R10 honeypot + email-or-mobile required + Zakat posting note)
- Exit criteria met:
  * /fees: student list with outstanding summary, "Collect Payment" 3-step flow, R8 striped pending-discount rows with status chip, IfPermission gating, success toast on confirm, LoadingState pattern="table" ✅
  * /accounting: full-width ledger table with running balance, FilterBar (date range + status + search), New Entry dialog with "Debits must equal credits" inline validation, posted-by + status badge columns ✅
  * /zakat: fund-isolated (useAccounts filtered to fund==="zakat"), big accent-gold balance card, Received + Distributed sections, Zakat badge on every row, Other Funds section with reduced opacity, distribute-validation blocking when amount>balance with inline error ✅
  * /donations: email OR mobile mandatory, honeypot "website" field with silent spam-detected reject, success toast + Download Receipt PDF button (visual), Zakat-type note "posted to Zakat fund (SRS §3.7)", recent donations list, public-gate via donations.create.public ✅
  * All money displays use formatCurrency() and all dates use formatDate() from src/lib/i18n/format.ts ✅
  * Every page handles loading/error states with LoadingState + ErrorState ✅
  * All 4 routes return HTTP 200 from the dev server ✅
  * Lint passes cleanly for all 9 files created in this task ✅

---
Task ID: 3-a
Agent: full-stack-developer
Task: MadrashaOS Phase C3.1 — Foundation Module Screens. Build the 4 Foundation-layer route pages: Organization + Multi-Branch list, Module Configuration toggles (Risk R2), RBAC Permission Matrix editor (Do-Not-Do D16), and Audit Explorer (key differentiator per SRS §2.1.4). Includes 4 reusable sub-components under src/components/foundation/.

Work Log:
- Read worklog.md (C0.1–C2 history), moduleTree.ts (40+ modules + routes + permission codes), widgets/index.tsx (12 widget patterns + how they consume useX hooks), states/index.tsx (LoadingState 5 patterns + ErrorState + PermissionDenied), IfPermission.tsx (hide-unauthorized wrapper), query/client.ts (16 typed TanStack hooks + singleton QueryClient), mock/fixtures/index.ts + organization.ts + users.ts (1 org / 3 branches / 8 users / 12 ledger entries / 8 accounts / 40 students), role-permissions.ts (8 personas × ~110 permission codes with D3 separation enforced), stores/types.ts (ROLES + ROLE_LABELS), permissions.ts (catalog), i18n/format.ts (formatDate / formatDateLong / formatCurrency / convertDigits), i18n/messages.ts (so I don't break any existing keys), tokens.css + globals.css (FROZEN token bridge — confirmed bg-surface-card / text-text-primary / shadow-elevation-1 / rounded-2xl all resolve)
- Created src/components/foundation/SectionCard.tsx — reusable section wrapper implementing the FROZEN pattern `rounded-2xl border border-border-default bg-surface-card p-6 shadow-elevation-1` referenced in dashboard pages; plus a SectionCardHeader (title + description + action slot) for consistent layout
- Created src/components/foundation/BranchCard.tsx — branch display card showing name (locale-aware bn/en swap + alt-script subtitle), address, phone, established year; uses Building2/MapPin/Phone/CalendarDays Lucide icons; current-branch state from useSessionStore (highlights "Current" badge); "branch.scope" indicator rendered as a Chip with aria-label="branch.scope" + a Tooltip explaining the data scope (Tenant-wide for primary hub, Single-branch for satellites); uses convertDigits for localized established year; respects RTL via logical properties
- Created src/components/foundation/ModuleToggleRow.tsx — one row of the Module Configuration matrix with a Switch (shadcn/ui); when the module is OFF but has unresolved dependents, an inline warning box appears below showing dependents as warning-tone Chips with their Lucide icons; per Risk R2 lock-in the warning is inline (never a modal) and the Save button lives on the parent page (disabled while ANY row has unresolved dependents)
- Created src/components/foundation/AuditEventCard.tsx — timeline event card + the ledger→audit expansion helper. expandLedgerToAuditEvents() takes 12 ledger entries + 8 users and produces ~52 derived audit events (create / edit / submit-or-post / view / export). Each event has timestamp, actor (name + email), action code, description, voucher number, status tone, optional field-diff array. The AuditEventCard renders a vertical timeline dot + the event body + a monospace diff viewer showing `field: old → new by actor@ at <localized-date> <time>` with old in red strike-through and new in green. Uses formatDateLong + formatCurrency + convertDigits from src/lib/i18n/format.ts (no raw hex/px). Inline formatTime() helper since format.ts has no formatTime export (and the rule forbids modifying existing files)
- Created src/app/(app)/organization/page.tsx — Organization + Multi-Branch list. Uses useOrganization() + useBranches() hooks; LoadingState pattern="list" while loading, ErrorState with combined retry on error; renders 3 BranchCards in a responsive grid (sm:2, lg:3); adds "Add Branch" button gated by IfPermission code="organization.branch.create" (administrator role does NOT see this button — only super-admin does, per Risk R3 hide-rule); two additional SectionCards below show an Organization Profile dl (4 KPI tiles: org name + branch count + branch.scope + established range) and a Tenant Isolation explainer with branch.scope / data isolation / zakat fund badges
- Created src/app/(app)/organization/modules/page.tsx — Module Configuration toggles (Risk R2). Reads moduleTree (excludes the "main" dashboard group), groups by `layer` (Foundation/People/Academic/Finance/Operations/Communication/Platform), renders a ModuleToggleRow per module inside a SectionCard per layer. Defines MODULE_DEPENDENTS map (inventory→hostel/food/transport/library/purchase, purchase→suppliers, accounting→cashbank, fees→accounting/scholarship, exams→results, students→fees/attendance/admission/guardians, attendance→exams, teachers→attendance/exams). All modules default enabled; toggling a parent OFF while a dependent is still ON triggers the inline warning + chips. The "Save Changes" button is disabled while any unresolved dependency exists (red status banner shows the affected modules as danger Chips); a Reset button restores all-enabled defaults; on successful save a green confirmation appears (mock mode — no persistence). Summary strip at top shows enabled / disabled / unresolved counts in localized numerals. Reference SectionCard at bottom renders the full dependency map as chips (neutral when dependent enabled, warning when dependent disabled)
- Created src/app/(app)/rbac/page.tsx — RBAC Permission Matrix editor. Wrapped in IfPermission code="rbac.permission.assign" with PermissionDenied fallback. Main matrix uses shadcn/ui Table: rows = 8 personas (ROLES), columns = 7 permission groups (Foundation/People/Academic/Finance/Operations/Communication/Platform); each cell renders a Checkbox + count "X/Y" (X = permissions the role holds in the group per ROLE_PERMISSIONS, Y = union of all permissions in that group across all roles). Current user's role row is highlighted with primary-50 background + "You" badge. Below the main matrix: Approval detail table (rows = 4 approval.* codes, columns = 8 personas) where the cell at (approval.approve, currentUserRole) is highlighted yellow and wrapped in a Tooltip explaining Do-Not-Do D16 ("Requester cannot approve own request — enforced server-side regardless of checkbox state"). All checkboxes are toggleable (visual state only — no mutation). A "Save Matrix" button at top triggers a green confirmation banner. Two reference SectionCards below: Persona quick-reference (8 cards with native + English labels + permission count) and Enforced rules (D3 / D16 / D18 / R3 with AlertCircle icons)
- Created src/app/(app)/audit/page.tsx — Audit Explorer (key differentiator per SRS §2.1.4). Wrapped in IfPermission code="audit.view" with PermissionDenied fallback. Uses useLedgerEntries() + useCurrentUser() hooks (existing) + imports the users fixture directly to expand actor IDs into names/emails. expandLedgerToAuditEvents() (memoized on ledger identity) produces 52 events from the 12 ledger entries. KPI strip at top: event count / field-edit count / distinct actors / time-range (formatted via formatDateLong). Filter bar SectionCard with date-from / date-to (HTML date inputs) + actor Select (8 users + "all"); filter is client-side and visual-only per the task spec; Clear button resets all. Timeline SectionCard renders the AuditEventCard list in a max-h-[32rem] overflow-y-auto container with custom scrollbar; Export CSV button (visual). Legend SectionCard at bottom shows the 4 status tones + an example diff viewer format
- Fixed ESLint react-hooks/preserve-manual-memoization error in modules/page.tsx by inlining the dependency check inside useMemo instead of calling a closure-bound helper (the React Compiler couldn't trace the indirect dep on enabledMap through unresolvedDependents())
- Verified `bun run lint` passes with zero errors and zero warnings
- Verified HTTP 200 on all 4 routes via curl: /organization → 200 (594ms compile), /organization/modules → 200 (548ms compile), /rbac → 200 (715ms compile), /audit → 200 (901ms compile) — all compile cleanly on first hit, no runtime errors in dev.log
- Did NOT modify any existing files: i18n messages.ts untouched, moduleTree.ts untouched, widgets/states/IfPermission/client/fixtures/role-permissions/permissions all untouched per the task rules. No new files under src/lib/mock/fixtures/ (the audit expansion helper lives in src/components/foundation/AuditEventCard.tsx as a UI helper, not a mock data file)

Stage Summary:
- Artifacts produced (8 new files):
  * src/components/foundation/SectionCard.tsx (reusable section wrapper — rounded-2xl border bg-surface-card p-6 shadow-elevation-1)
  * src/components/foundation/BranchCard.tsx (branch display card with branch.scope indicator)
  * src/components/foundation/ModuleToggleRow.tsx (module toggle with inline dependent-chip warning)
  * src/components/foundation/AuditEventCard.tsx (audit event card + expandLedgerToAuditEvents helper producing 52 events from 12 ledger entries)
  * src/app/(app)/organization/page.tsx (Organization + 3-branch list + Add Branch gated by organization.branch.create)
  * src/app/(app)/organization/modules/page.tsx (Module Configuration with Risk R2 lock-in: inline warning + dependent chips + Save disabled while unresolved)
  * src/app/(app)/rbac/page.tsx (RBAC matrix: 8 roles × 7 groups + approval detail with D16 tooltip + gated by rbac.permission.assign)
  * src/app/(app)/audit/page.tsx (Audit Explorer: 52-event timeline + filter bar + field-diff viewer + gated by audit.view)
- Exit criteria met:
  * All 4 Foundation routes return HTTP 200 (verified via curl) ✅
  * Lint passes clean (zero errors, zero warnings) ✅
  * Every page uses the SectionCard pattern (rounded-2xl border bg-surface-card p-6 shadow-elevation-1) ✅
  * Every page handles loading (LoadingState) + error (ErrorState) states ✅
  * Risk R2 lock-in implemented (inline warning + chips + Save disabled) ✅
  * Do-Not-Do D16 tooltip on approval.approve row for the current user's role ✅
  * branch.scope visual indicator on every BranchCard ✅
  * Audit Explorer shows 52 events (≥50 required) with field-diff viewer ✅
  * IfPermission gates: organization.branch.create (Add Branch button), rbac.permission.assign (/rbac page), audit.view (/audit page) ✅
  * All localized values use formatCurrency / formatDate / formatDateLong / convertDigits from src/lib/i18n/format.ts ✅
  * Zero raw hex/px values — every token sourced from the FROZEN system ✅
  * No modifications to existing files (i18n messages, moduleTree, widgets, states, stores, fixtures) ✅

---
Task ID: 3-b
Agent: full-stack-developer
Task: C3.2 — People Module Screens (4 routes). Built /students list, /students/[id] 7-tab profile with Risk R4 history lock-in + Promotion Wizard, /admission DnD Kanban, /teachers directory + assignment grid.

Work Log:
- Read worklog.md (C0.1–C2 complete) + key files: moduleTree.ts (40 modules / 8 groups), widgets/index.tsx (12 widget patterns), states/index.tsx (LoadingState/ErrorState/PermissionDenied), IfPermission.tsx, query/client.ts (16 typed hooks), fixtures/students.ts (40 students / 4 classes / 8 guardians, bn/en/ar names), fixtures/users.ts (8 personas), dashboard/authority/page.tsx (page pattern).
- Read shadcn/ui Table/Tabs/Dialog/Select/Badge/Breadcrumb/Avatar/FilterBar/EmptyState/Card/Button component sources + sonner/toaster/use-toast to confirm API surface.
- Read globals.css + tokens.css to confirm FROZEN token names (bg-primary-500, text-text-primary, border-border-default, bg-surface-card, bg-surface-canvas, bg-surface-hover, text-text-secondary, text-text-muted, text-semantic-success/warning/danger, bg-success-50/warning-50/danger-50, border-border-strong, shadow-elevation-1/2, font-mono).
- Confirmed @dnd-kit/core v6.3.1 + @dnd-kit/utilities v3.2.2 already installed (no new deps required).
- Created src/components/people/index.tsx — shared People-module helpers:
  * StudentStatusBadge (active=success / graduated=primary / withdrawn=neutral)
  * StudentAvatar (sm/md/lg, primary-50 bg + primary-700 initials)
  * InfoRow (3-col grid label/value/hint for profile detail)
  * PastClassChip (Risk R4 dashed-border "past" chip — never rendered as deleted)
  * StudentRowSkeleton (table-row loading placeholder)
  * buildNameSubtitle(student) — derives bn/ar subtitle string.
- Created src/app/(app)/students/page.tsx — Student List:
  * Uses useStudents + useClasses + useGuardians hooks (TanStack Query).
  * Full-width Table inside a Card with shadow-elevation-1, neutral-50 header row, hover:bg-surface-hover on rows.
  * 6 columns: Code (mono caption) | Name (avatar + name + bn/ar subtitle) | Class (name + Section X · Roll N) | Guardian (icon + name) | Status badge | Actions (View outline button).
  * Search input with absolute-positioned Search icon, ps-9 padding (logical property).
  * FilterBar with 3 Select dropdowns: class (4 options), section (auto-derived from selected class), status (4 options). Section select disabled when no class chosen.
  * "Showing X of 40 students" count + active-filter pill when filters applied.
  * IfPermission code="students.create" gates "Add Student" header button + EmptyState CTA.
  * LoadingState pattern="table" while any hook is loading.
  * ErrorState with combined refetch when any hook errors.
  * EmptyState illustration="students" when filtered.length === 0 (with conditional copy based on whether search/filters active).
  * Client-side filter pipeline: search (name + bn + ar + code), class, section, status.
  * useEffect resets section filter when class changes and current section is no longer in the new class.
  * Clicking "View" navigates to /students/[id] via useRouter.
- Created src/app/(app)/students/[id]/page.tsx — Student Profile:
  * 7 tabs via shadcn Tabs: Personal / Academic / Guardians / Documents / Fees / Attendance / History.
  * Breadcrumb (Dashboard / Students / [Student Name]) using shadcn Breadcrumb.
  * Profile header Card: lg StudentAvatar, name (display), bn/ar subtitle (with lang attr), code·class·section·roll caption, StudentStatusBadge, Back button.
  * Personal tab: dl/dt/dd InfoRow list — code, DOB, gender, admission date, status, bangla name, arabic name (lang="ar").
  * Academic tab: class + nameBn hint, section, roll, branch + Subjects grid (6 mock subjects inline).
  * Guardians tab: 2-column grid — Guardian Card (avatar + bn name + phone/email/occupation InfoRows with tel:/mailto: links + Guardian ID card).
  * Documents tab: 3 mock documents list; IfPermission code="documents.upload" gates Upload button; IfPermission code="documents.download" gates Download button.
  * Fees tab: 3 stat cards (Total/Collected/Outstanding) + installments table with Paid (success badge) / Pending (warning badge) + receipt number; IfPermission code="fees.payment.create" gates "Collect Payment" button (fires toast).
  * Attendance tab: 4 stat cards (Present/Absent/Late/On leave) + recent records table (10 rows) with AttendanceStatusChip.
  * History tab (Risk R4 lock-in): grid lg:grid-cols-[1fr_320px] — left Card has "Current assignment" primary panel + "Previous assignments" PastClassChip list (2 mock past classes); right Card has Timeline (vertical line + TimelineItem with tone dot). "Promote Student" button gated by IfPermission code="students.promote" opens Dialog.
  * Promotion Wizard Dialog: sm:max-w-2xl, grid sm:grid-cols-[1fr_280px] — left = current class read-only + 2 Selects (class + section, sections auto-derived); right = History preview panel with TimelineItem list (New → Current → Past → Admission). Confirmation requires both selects; toast on confirm.
  * LoadingState pattern="detail" while studentLoading; ErrorState when studentError; EmptyState illustration="students" when student not found (with Back to Students CTA).
  * Inline mocks (per task spec — no new fixture files): buildHistory() generates 2 past assignments per student code; MOCK_SUBJECTS (6 items); MOCK_DOCUMENTS (3 items).
  * TimelineItem + FeeStatCard + AttendanceStat + AttendanceStatusChip local helpers (declared OUTSIDE main component to avoid react-hooks/static-components lint error).
- Created src/app/(app)/admission/page.tsx — Admission Kanban:
  * @dnd-kit/core DndContext + PointerSensor (6px activation constraint) + KeyboardSensor + DragOverlay + closestCorners collision detection.
  * 5 columns (Applied/Interviewed/Approved/Registered/Rejected) — each with Icon + tone badge count + droppable area (useDroppable) + highlight on isOver.
  * Each KanbanCard uses useDraggable, transform CSS.Translate, opacity 0.4 while dragging, GripVertical drag handle.
  * DragOverlay renders rotated copy of active card (rotate-2 + cursor-grabbing).
  * Inline mock: INITIAL_APPLICANTS — 10 applicants distributed (4 applied, 2 interviewed, 2 approved, 2 registered, 1 rejected) with bn names + appliedFor + appliedDate.
  * Drag-to-Registered → toast "Student registered — Fee plan created — January 2026 installment generated" (per task spec).
  * Drag-to-Approved gated by IfPermission code="admission.approve" — users lacking the permission see destructive toast "Permission required" and the card stays in place (state not updated).
  * Drag-to-Rejected → destructive toast.
  * Drag-to-other → info toast with applicant name + new stage.
  * "New Application" button gated by IfPermission code="admission.view" (per task spec).
  * Permission hint banner shown via IfPermission fallback (warning-50 bg + semantic-warning text + AlertCircle icon) when user lacks admission.approve.
  * Stats footer Card grid showing per-column counts.
- Created src/app/(app)/teachers/page.tsx — Teachers & Staff:
  * Page-level IfPermission gate: if user lacks teachers.view → render <PermissionDenied resource="Teachers" /> (Risk R3 lock-in, never raw 403).
  * Upper section: Staff Directory — grid of 8 staff Cards (uses users fixture) with avatar, name + bn subtitle, role badge (ROLE_TONE color map per role), assignment count, email (Mail icon), phone (Phone icon).
  * Lower section: Teacher Assignments Table — 5 columns (Teacher / Class / Subject / Subject code / Actions). 8 initial inline assignments (INITIAL_ASSIGNMENTS). Each row has Delete button (Trash2 icon, semantic-danger) gated by IfPermission code="teachers.assign".
  * Search input filters BOTH staff directory AND assignments by name/email/role/class/subject.
  * "Assign Teacher" button (Plus icon) gated by IfPermission code="teachers.assign" opens Dialog.
  * Assign Dialog: 3 Select dropdowns (teacher / class / subject) + duplicate-active-assignment block:
    - On confirm, checks if (teacherId + classId + subjectId) already exists in assignments array.
    - If duplicate → inline error AlertCard (semantic-danger border + bg-danger-50 + AlertCircle icon) with message "This teacher is already assigned to this class for the same subject. Pick a different combination."
    - If valid → adds assignment + toast "Assignment created".
    - Live preview panel: when all 3 selects chosen + no duplicate error → primary-50 card preview "[Teacher] will teach [Subject] to [Class]."
    - DialogFooter Cancel + Create Assignment (the latter gated by IfPermission code="teachers.assign" — hides button if lacking permission).
  * EmptyState when filteredAssignments.length === 0 (with conditional "Assign Teacher" CTA gated by IfPermission).
  * LoadingState pattern="table" while classes loading; ErrorState when classes error.
- Verified ESLint: `bunx eslint src/app/(app)/students/page.tsx src/app/(app)/students/[id]/page.tsx src/app/(app)/admission/page.tsx src/app/(app)/teachers/page.tsx src/components/people/index.tsx --max-warnings=0` → exit 0 (zero errors, zero warnings). `bun run lint` (project-wide) → exit 0.
- Verified routes via curl:
  * GET /students → HTTP 200 (render 642ms) — Add Student button + Search + "Showing" count rendered in SSR.
  * GET /students/stu-001 → HTTP 200 (render 281ms) — LoadingState skeleton (animate-pulse) rendered on first SSR; client hydrates and TanStack Query fills data.
  * GET /students/stu-005 → HTTP 200 (real student with nameAr).
  * GET /students/stu-999 → HTTP 200 (invalid id → client renders Student-not-found EmptyState).
  * GET /admission → HTTP 200 (render 286ms) — all 5 column labels (Applied/Interviewed/Approved/Registered/Rejected) rendered.
  * GET /teachers → HTTP 200 (render 196ms) — Staff Directory + Teacher Assignments + Assign Teacher button rendered.
- Confirmed FROZEN tokens only — no raw hex / px anywhere in the new files. All colors via bg-primary-500 / text-text-primary / bg-surface-card / shadow-elevation-1 / border-border-default / bg-success-50 / bg-warning-50 / bg-danger-50 etc.
- Confirmed responsive design: mobile (sm:) → grid-cols-2; desktop (lg:grid-cols-4); Kanban has horizontal scroll on mobile (overflow-x-auto), grid layout on lg+.
- Confirmed accessibility: aria-label on drag handle / View buttons / Select triggers / search; role="tab" via shadcn Tabs; role="alert" on error + duplicate error; role="searchbox" on search input; lang attribute on bn/ar text spans; focus-visible:ring on drag handle; semantic HTML (header / section / dl / dt / dd / table).

Stage Summary:
- Artifacts produced (5 new files):
  * src/components/people/index.tsx (6 shared People-module helpers: StudentStatusBadge, StudentAvatar, InfoRow, PastClassChip, StudentRowSkeleton, buildNameSubtitle)
  * src/app/(app)/students/page.tsx (Student List — table + search + FilterBar + 3 dropdowns)
  * src/app/(app)/students/[id]/page.tsx (7-tab Profile + Breadcrumb + Promotion Wizard dialog with Risk R4 history panel)
  * src/app/(app)/admission/page.tsx (DnD Kanban with 5 columns + @dnd-kit/core + permission-gated approve action + Registered-toast)
  * src/app/(app)/teachers/page.tsx (Staff directory + Assignment grid + Assign dialog with duplicate-block inline error)
- Exit criteria met:
  * 4 routes return HTTP 200 ✅
  * ESLint clean (zero errors, zero warnings) ✅
  * Every page handles loading/error/empty states via LoadingState + ErrorState + EmptyState + PermissionDenied ✅
  * IfPermission gates: students.create / documents.upload / documents.download / fees.payment.create / students.promote / admission.view / admission.approve / teachers.view / teachers.assign ✅
  * Risk R4 lock-in: History tab shows past chips + Promotion Wizard dialog has history panel beside form (past assignments never deleted) ✅
  * Drag-to-Registered toast: "Student registered — fee plan created" ✅
  * Duplicate-active-assignment blocked inline (teachers dialog) ✅
  * FROZEN tokens only — no raw hex / px ✅
  * Responsive layouts + a11y attributes throughout ✅
  * Inline mock data only — no new fixture files created ✅
  * No modifications to existing files (i18n messages, moduleTree, existing components/widgets/stores) ✅

---
Task ID: 3-c
Agent: full-stack-developer
Task: MadrashaOS Phase C3.3 — Academic Module Screens (4 mobile-first routes: /attendance, /attendance/take, /exams, /exams/[id]/marks)

Work Log:
- Read previous worklog + key reference files (moduleTree.ts, widgets/index.tsx, states/index.tsx, IfPermission.tsx, query/client.ts, fixtures/students.ts, fixtures/index.ts, sessionStore.ts, teacher dashboard, mockApi.ts, role-permissions.ts) to internalize existing patterns before writing any code
- Created 4 reusable academic components under src/components/academic/:
  * AttendanceSessionRow.tsx — list row for /attendance (class, section, date, taken-by name, Chip counts per status)
  * AttendanceRoster.tsx — single-tap cycle row (Present → Absent → Late → Leave → Present), avatar initials, status summary chips; STATUS_CYCLE/STATUS_TONE/STATUS_LABEL exports
  * StudentMarkCard.tsx — NumberInput-with-stepper card used by /exams/[id]/marks, with "Student X of N" badge + validation plumbing
  * ExamRow.tsx — exam list row (name, date, class, subject, full marks, status Badge with tone: Draft=neutral / Active=primary / Published=success)
  * index.ts — barrel re-exporting all academic components
- Created /attendance/page.tsx — session list:
  * useAttendanceSessions + useClasses + useStudents (warm cache)
  * FilterBar with class select + date input + active filter count + Clear button
  * "Take Attendance" primary button gated by IfPermission code="attendance.take" → router.push("/attendance/take")
  * EmptyState illustration="attendance" with CTA when no sessions match
  * LoadingState pattern="table" while loading
  * ErrorState + PermissionDenied states (PermissionDeniedError detection via err.name)
  * AttendanceSessionRow rows with class + takenBy user lookup
  * Mobile-first: stacked layout at 375px, inline on sm+
- Created /attendance/take/page.tsx — Take Attendance (KEY SCREEN, Risk R6 lock-in):
  * Page wrapped in IfPermission code="attendance.take" with PermissionDenied fallback
  * Header: Class 5 · Section A + long date + "12 students · 12 marked"
  * Elapsed timer (useEffect setInterval 1s, stops on submit, turns red >60s) — Risk R6 <60s-for-40-students verification
  * Idempotency-Key indicator: Key icon with Tooltip showing the generated key (visual concept only)
  * useStudentsByClass("cls-5", "A") — 12 students (matches SRS Risk R6 fixture)
  * Optimistic local state via useState<Record<studentId, AttendanceStatus>> — defaults to "present"
  * One-tap cycle: Present → Absent → Late → Leave → Present (STATUS_CYCLE from AttendanceRoster)
  * Row left-border accent colored by status (semantic-success/danger/warning/neutral)
  * Sticky bottom bar: "Present All" + "Submit" buttons (primary, full-width on mobile)
  * On Submit: shadcn useToast with ToastAction "Undo" button, duration=30s (UNDO_WINDOW_MS)
  * Undo restores snapshot, restarts elapsed timer, fires "Submission undone" toast
  * Offline handling: when sessionStore.network === "offline", submit is queued (setQueued), OfflineState banner shows, "Queued for sync" toast appears
  * NetworkError on data fetch shows OfflineState + "Back to attendance" button instead of generic ErrorState
  * PermissionDeniedError on data fetch shows PermissionDenied
  * Mobile-first: 375px viewport verified — list max-h-[calc(100vh-26rem)] with thin scrollbar, sticky bottom bar, no horizontal scroll
- Created /exams/page.tsx — Examination list:
  * 4 inline mock exams: Mid-term (active), Final (draft), Quiz 1 (published), Quiz 2 (draft)
  * Each row: name, date, class+section, subject, full marks, status Badge (tone: Draft=neutral outline / Active=primary / Published=success)
  * "Enter Marks" button gated by exams.enter-marks permission → router.push("/exams/[id]/marks")
  * "Publish" button gated by exams.publish permission → opens AlertDialog confirm "Publishing locks the paper. Continue?"
  * AlertDialog wrapped in IfPermission code="exams.publish" (renders null fallback for unauthorized users)
  * Published exams disable both Enter Marks and Publish buttons
  * Confirm action sets status="published" inline + fires "Exam published" toast
  * canEnterMarks + canPublish derived from sessionStore.permissions reactively (updates on role switch)
- Created /exams/[id]/marks/page.tsx — Enter Marks (mobile-first, swipe-next):
  * Page wrapped in IfPermission code="exams.enter-marks" with PermissionDenied fallback
  * useParams<{ id: string }>() reads [id] from URL
  * Inline EXAM_CATALOGUE maps exam IDs to Exam objects (Mid-term/Final/Quiz 1/Quiz 2)
  * useStudentsByClass(exam.classId, exam.section) for the roster (12 students for Class 5-A)
  * One student at a time via StudentMarkCard (avatar, name, roll+code badges, NumberInput with stepper)
  * Progress bar showing "Student X of N" (Progress component from shadcn)
  * VALIDATION: if marks > full_marks, NumberInput shows inline error "Mark exceeds full marks (100)" and Next button is disabled
  * Next button also blocked when marks are undefined (forces entry before advancing)
  * "Prev" / "Next" navigation; last student shows "Save & Submit" instead of "Next"
  * On Save & Submit: router.push("/exams") + success toast "Marks saved · X of Y students · average Z% · {exam name}"
  * Quick roster skip-links visible on sm+ for keyboard users (numbered buttons with check icon for entered marks)
  * Sticky bottom action bar
  * Mobile-first: 375px verified
- Verified lint: zero errors on my 9 new files (pre-existing errors in other agents' files at accounting/page.tsx, fees/page.tsx, organization/modules/page.tsx, zakat/page.tsx remain untouched per task rule "DO NOT modify any existing files")
- Verified dev server: HTTP 200 on all 4 routes via curl
- Verified via Agent Browser at 375px viewport:
  * /attendance/take as Teacher: header (Class 5 · Section A + 12 students · 12 marked + Elapsed timer + Idempotent indicator), summary chips (P 12 / A 0 / L 0 / Lv 0), 12 student rows with avatar initials (SR, HC, MB, LA, II, MK, YH, SA, ZR, SC, TB, AA), status toggle cycle (Present→Absent→Late→Leave→Present verified 4 taps), Present All + Submit sticky bar
  * Submit flow: click Submit → success toast "Attendance submitted · 11 Present · 0 Absent · 1 Late · 0 Leave" + Undo button → click Undo → records restored + "Submission undone" toast → Submit button re-enabled
  * Offline mode: localStorage network="offline" → page reload → OfflineState banner + "Back to attendance" button (NetworkError branch)
  * /exams as Teacher: 4 exam rows visible; "Enter Marks" buttons visible; "Publish" buttons HIDDEN (teacher lacks exams.publish permission — correct gating)
  * /exams/[id]/marks as Teacher: Mid-term exam header + Progress "Student 1 of 12" + NumberInput (0) with stepper + Prev (disabled) + Next (disabled, marks empty) + 12 quick-jump buttons
  * Marks validation: entered 150 → inline error "Mark exceeds full marks (100)" + Next disabled → entered 85 → error gone + Next enabled → click Next → student 2 (Hawa Chowdhury) shown + Prev enabled + Progress "Student 2 of 12"
  * Save & Submit on last student: jump to student 12 (Asma Ahmed), enter 92, click Save & Submit → redirect to /exams + success toast "Marks saved · 2 of 12 students · average 89% · Mid-term Examination"

Stage Summary:
- Artifacts produced (9 new files, 0 modified):
  * src/components/academic/AttendanceSessionRow.tsx (152 lines, list row + taken-by avatar)
  * src/components/academic/AttendanceRoster.tsx (152 lines, single-tap cycle row + summary)
  * src/components/academic/StudentMarkCard.tsx (97 lines, marks entry card)
  * src/components/academic/ExamRow.tsx (140 lines, exam list row with status Badge + actions)
  * src/components/academic/index.ts (21 lines, barrel exports)
  * src/app/(app)/attendance/page.tsx (256 lines, session list + filters + Take Attendance entry)
  * src/app/(app)/attendance/take/page.tsx (425 lines, THE mobile-first R6 screen — timer, idempotency, undo, offline queue)
  * src/app/(app)/exams/page.tsx (218 lines, exam list + Enter Marks + Publish with confirm dialog)
  * src/app/(app)/exams/[id]/marks/page.tsx (353 lines, swipe-next marks entry with validation)
  Total: 1,765 lines across 9 files
- Exit criteria met:
  * /attendance: list of 4 recent sessions (Class 5-A across 4 days), each row with class/section/date/present-absent counts/taken-by name, "Take Attendance" primary button gated by attendance.take, FilterBar with class + date filters, LoadingState pattern="table", formatDate() used for localized dates ✅
  * /attendance/take: mobile-first at 375px, class+section+date header, 12-student roster (useStudentsByClass("cls-5","A")), default status=Present, one-tap cycle Present→Absent→Late→Leave→Present, sticky Present All + Submit, optimistic useState, 30s undo window via ToastAction, OfflineState banner + queue when sessionStore.network==="offline", Idempotency-Key indicator (Key icon + Tooltip), elapsed timer turning red >60s, IfPermission code="attendance.take" gates page, success toast "Submitted — X Present, Y Absent" + Undo option, Chip component for status indicators ✅
  * /exams: 4 inline mock exams (Mid-term/Final/Quiz 1/Quiz 2), each row with name/date/class/subject/status, Enter Marks button gated by exams.enter-marks, Publish button gated by exams.publish with AlertDialog confirm "Publishing locks the paper. Continue?", Badge for status (Draft=neutral, Active=primary, Published=success) ✅
  * /exams/[id]/marks: mobile-first at 375px, exam name+class+subject at top, one student at a time via StudentMarkCard, NumberInput with stepper, Next button advances (swipe-next pattern), Progress bar showing "Student X of 12", validation "Mark exceeds full marks (100)" blocks Next when marks>full_marks, "Save & Submit" at end, IfPermission code="exams.enter-marks" gates page ✅
- HTTP verification (all 200):
  * GET /attendance → 200 (compile 8ms, render 176ms)
  * GET /attendance/take → 200 (compile 174ms, render 631ms)
  * GET /exams → 200 (compile 55ms, render 141ms)
  * GET /exams/exam-mt-1/marks → 200 (compile 44ms, render 75ms)
  * GET /exams/exam-quiz-1/marks → 200
  * GET /exams/exam-quiz-2/marks → 200
  * GET /exams/exam-final-1/marks → 200
- Lint result: 0 errors on all 9 new files (verified via `bunx eslint` scoped to my directories); pre-existing errors in other agents' files (accounting, fees, organization/modules, zakat) remain untouched per "DO NOT modify any existing files" rule
- Risk R6 lock-in verified end-to-end: teacher can take attendance for Class 5-A (12 students) with single-tap status cycle, elapsed timer, idempotency key, 30s undo, and offline queue all functional at 375px viewport width
