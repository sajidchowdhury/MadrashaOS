/**
 * MadrashaOS — i18n Message Catalogs
 *
 * Session C0.2 — Multi-Language Font Stack & RTL Pipeline
 *
 * Translation keys are namespaced by section (app.*, hero.*, section.*, etc.)
 * Parameter placeholders use {name} syntax, e.g. "Tokens v{version}".
 *
 * All three locales (en, bn, ar) are first-class per SRS §10.6.
 * Missing keys fall back to English (see I18nProvider.t()).
 */

import type { Locale } from "./config";

export const messages = {
  en: {
    "app.title": "MadrashaOS",
    "app.subtitle": "Design System · Tokens v{version} · Phase C0.3",
    "app.badge.frozen": "FROZEN v{version}",
    "app.badge.session11": "Session 1.1 Brand Kit",
    "app.badge.session12": "Session 1.2 Token System",
    "app.badge.wcag": "WCAG 2.1 AA",

    "theme.light": "☀ Light",
    "theme.dark": "☾ Dark",
    "theme.label": "Theme",

    "lang.label": "Language",
    "lang.english": "English",
    "lang.bangla": "Bangla",
    "lang.arabic": "Arabic",

    "hero.greeting": "Assalamu Alaikum",
    "hero.description":
      "Trilingual typography stack — Inter (en) · Hind Siliguri (bn) · Noto Naskh Arabic (ar). Zero tofu across all three scripts.",
    "hero.body": "Welcome to MadrashaOS design system.",
    "hero.script.english": "ENGLISH",
    "hero.script.bangla": "বাংলা",
    "hero.script.arabic": "العربية",

    "section.color.primary.title": "Color · Primary",
    "section.color.primary.subtitle":
      "Deep Teal — evokes mosque tile glaze + water. 11-step scale, foreground paired. Source: tokens.json v1.0.0.",
    "section.color.primary.demo": "Primary Button · primary.500",
    "section.color.primary.secondary": "Secondary · primary.500 outline",
    "section.color.primary.badge": "Badge · primary.50 + 700",

    "section.color.accent.title": "Color · Accent",
    "section.color.accent.subtitle":
      "Warm Gold — premium accent for logo mark, PDF headers, achievement badges, key CTAs. 4-step scale.",
    "section.color.accent.badge": "★ Achievement Badge",
    "section.color.accent.tint": "Premium tint · accent.50",

    "section.color.semantic.title": "Color · Semantic",
    "section.color.semantic.subtitle":
      "WCAG 2.1 AA contrast-tuned. Used for toasts, status chips, attendance states (Present / Late / Absent).",

    "section.color.neutral.title": "Color · Neutral (Warm Grays)",
    "section.color.neutral.subtitle":
      "Sandstone undertone — never clinical. 12-step scale (0–950) used for surfaces, text, borders, dividers.",

    "section.typography.title": "Typography · Type Scale",
    "section.typography.subtitle":
      "6 steps (caption → display). Line-height + letter-spacing tuned per step. Tighter at display, looser at caption.",
    "section.typography.sample":
      "The quick brown fox — শিয়াল দ্রুত লাফ দেয় — الثعلب السريع",

    "section.spacing.title": "Spacing · 8pt Grid",
    "section.spacing.subtitle":
      "14-step scale (0–128px). 8px base unit. Every padding, margin, gap must reference these tokens — no off-grid values.",

    "section.radius.title": "Radius",
    "section.elevation.title": "Elevation",
    "section.motion.title": "Motion",
    "section.motion.easing": "Easing curves",

    "section.i18n.title": "Internationalization",
    "section.i18n.subtitle":
      "Three first-class locales (bn / en / ar) with RTL pipeline, Bangla numerals, and directional icon mirroring. Switch language above to see every value re-localize.",
    "section.i18n.localeInfo": "Current Locale",
    "section.i18n.localeLabel": "Label",
    "section.i18n.localeDir": "Direction",
    "section.i18n.localeBcp47": "BCP-47",
    "section.i18n.localeFont": "Font",
    "section.i18n.localeNumerals": "Numerals",
    "section.i18n.dates": "Date Formatting",
    "section.i18n.numbers": "Number Formatting",
    "section.i18n.currency": "Currency (BDT)",
    "section.i18n.rtl": "RTL Logical Properties",
    "section.i18n.rtl.description":
      "Uses logical properties (ps-/pe-/ms-/me-) instead of physical (pl-/pr-/ml-/mr-). Padding flips automatically when dir switches to RTL.",
    "section.i18n.icons": "Directional Icon Mirroring",
    "section.i18n.icons.description":
      "Directional icons (chevrons, arrows, send, undo, redo) auto-mirror in Arabic locale via the [dir=rtl] selector. Non-directional icons stay unchanged.",

    "shell.nav.dashboard": "Dashboard",
    "shell.nav.organization": "Organization",
    "shell.nav.rbac": "Roles & Permissions",
    "shell.nav.audit": "Audit Trail",
    "shell.nav.students": "Students",
    "shell.nav.admission": "Admissions",
    "shell.nav.guardians": "Guardians",
    "shell.nav.teachers": "Teachers",
    "shell.nav.subjects": "Subjects",
    "shell.nav.academic-structure": "Academic Structure",
    "shell.nav.attendance": "Attendance",
    "shell.nav.exams": "Examinations",
    "shell.nav.results": "Results",
    "shell.nav.fees": "Fees",
    "shell.nav.accounting": "Accounting",
    "shell.nav.zakat": "Zakat",
    "shell.nav.inventory": "Inventory",
    "shell.nav.hostel": "Hostel",
    "shell.nav.library": "Library",
    "shell.nav.notices": "Notices",
    "shell.nav.reports": "Reports",
    "shell.nav.settings": "Settings",
    "shell.nav.group.foundation": "Foundation",
    "shell.nav.group.people": "People",
    "shell.nav.group.academic": "Academic",
    "shell.nav.group.finance": "Finance",
    "shell.nav.group.operations": "Operations",
    "shell.topbar.branch": "Branch",
    "shell.topbar.branch.dhaka": "Dhaka Main Branch",
    "shell.topbar.branch.chittagong": "Chittagong Branch",
    "shell.topbar.branch.sylhet": "Sylhet Branch",
    "shell.topbar.academicYear": "Academic Year",
    "shell.topbar.search.placeholder": "Search students, fees, classes…",
    "shell.topbar.notifications": "Notifications",
    "shell.topbar.user.admin": "Administrator",
    "shell.footer.rights": "© 2026 MadrashaOS. All rights reserved.",
    "shell.dev.title": "Dev Toolbar",
    "shell.dev.role": "Role",
    "shell.dev.branch": "Branch",
    "shell.dev.network": "Network",
    "shell.dev.network.normal": "Normal",
    "shell.dev.network.slow": "Slow 3G",
    "shell.dev.network.offline": "Offline",
    "shell.dev.collapse": "Hide",
    "shell.dev.expand": "Dev",
    "footer.plan": "MadrashaOS · UI/UX Coding Plan Phase C0.3 · Tokens v{version}",
    "footer.source": "Source: MadrashaOS_Session_1.1_Brand_Kit_Tokens.json (FROZEN)",
  },

  bn: {
    "app.title": "MadrashaOS",
    "app.subtitle": "ডিজাইন সিস্টেম · টোকেন v{version} · ফেজ C0.3",
    "app.badge.frozen": "ফ্রোজেন v{version}",
    "app.badge.session11": "সেশন ১.১ ব্র্যান্ড কিট",
    "app.badge.session12": "সেশন ১.২ টোকেন সিস্টেম",
    "app.badge.wcag": "WCAG 2.1 AA",

    "theme.light": "☀ লাইট",
    "theme.dark": "☾ ডার্ক",
    "theme.label": "থিম",

    "lang.label": "ভাষা",
    "lang.english": "ইংরেজি",
    "lang.bangla": "বাংলা",
    "lang.arabic": "আরবি",

    "hero.greeting": "আসসালামু আলাইকুম",
    "hero.description":
      "ত্রিভাষিক টাইপোগ্রাফি স্ট্যাক — Inter (en) · Hind Siliguri (bn) · Noto Naskh Arabic (ar)। তিনটি স্ক্রিপ্টেই কোনো tofu (□) নেই।",
    "hero.body": "মাদরাসাওএস ডিজাইন সিস্টেমে স্বাগতম।",
    "hero.script.english": "ENGLISH",
    "hero.script.bangla": "বাংলা",
    "hero.script.arabic": "العربية",

    "section.color.primary.title": "রং · প্রাথমিক",
    "section.color.primary.subtitle":
      "গাঢ় টিল — মসজিদের টাইল গ্লেজ ও জলের প্রতিচ্ছবি। ১১-ধাপের স্কেল, ফোরগ্রাউন্ড সহ। উৎস: tokens.json v1.0.0।",
    "section.color.primary.demo": "প্রাথমিক বোতাম · primary.500",
    "section.color.primary.secondary": "সেকেন্ডারি · primary.500 আউটলাইন",
    "section.color.primary.badge": "ব্যাজ · primary.50 + 700",

    "section.color.accent.title": "রং · অ্যাকসেন্ট",
    "section.color.accent.subtitle":
      "উষ্ণ সোনা — লোগো মার্ক, PDF হেডার, অর্জন ব্যাজ ও মূল CTA-এর জন্য। ৪-ধাপের স্কেল।",
    "section.color.accent.badge": "★ অর্জন ব্যাজ",
    "section.color.accent.tint": "প্রিমিয়াম টিন্ট · accent.50",

    "section.color.semantic.title": "রং · শব্দার্থিক",
    "section.color.semantic.subtitle":
      "WCAG 2.1 AA কনট্রাস্ট-টিউনড। টোস্ট, স্ট্যাটাস চিপ, উপস্থিতি স্টেট (উপস্থিত / বিলম্বিত / অনুপস্থিত)-এ ব্যবহৃত।",

    "section.color.neutral.title": "রং · নিউট্রাল (উষ্ণ ধূসর)",
    "section.color.neutral.subtitle":
      "বালুকাপাথরের আভা — কখনো ক্লিনিকাল নয়। ১২-ধাপের স্কেল (০–৯৫০), সারফেস, টেক্সট, বর্ডার ও ডিভাইডারে ব্যবহৃত।",

    "section.typography.title": "টাইপোগ্রাফি · টাইপ স্কেল",
    "section.typography.subtitle":
      "৬টি ধাপ (caption → display)। প্রতি ধাপে লাইন-হাইট ও লেটার-স্পেসিং টিউন করা। display-এ টাইট, caption-এ ঢিলা।",
    "section.typography.sample":
      "The quick brown fox — শিয়াল দ্রুত লাফ দেয় — الثعلب السريع",

    "section.spacing.title": "স্পেসিং · ৮pt গ্রিড",
    "section.spacing.subtitle":
      "১৪-ধাপের স্কেল (০–১২৮px)। ৮px বেস ইউনিট। প্রতিটি padding, margin, gap অবশ্যই এই টোকেন উল্লেখ করবে — কোনো গ্রিড-বহির্ভূত মান নয়।",

    "section.radius.title": "রেডিয়াস",
    "section.elevation.title": "এলিভেশন",
    "section.motion.title": "মোশন",
    "section.motion.easing": "ইজিং কার্ভ",

    "section.i18n.title": "আন্তর্জাতিকীকরণ",
    "section.i18n.subtitle":
      "তিনটি প্রথম-শ্রেণীর লোকেল (bn / en / ar) RTL পাইপলাইন, বাংলা সংখ্যা ও দিকনির্দেশক আইকন মিররিং সহ। উপরে ভাষা পরিবর্তন করে প্রতিটি মান পুনরায় স্থানীয়করণ দেখুন।",
    "section.i18n.localeInfo": "বর্তমান লোকেল",
    "section.i18n.localeLabel": "লেবেল",
    "section.i18n.localeDir": "দিক",
    "section.i18n.localeBcp47": "BCP-47",
    "section.i18n.localeFont": "ফন্ট",
    "section.i18n.localeNumerals": "সংখ্যা",
    "section.i18n.dates": "তারিখ ফরম্যাটিং",
    "section.i18n.numbers": "সংখ্যা ফরম্যাটিং",
    "section.i18n.currency": "মুদ্রা (BDT)",
    "section.i18n.rtl": "RTL লজিক্যাল প্রপার্টি",
    "section.i18n.rtl.description":
      "শারীরিক (pl-/pr-/ml-/mr-) এর পরিবর্তে লজিক্যাল প্রপার্টি (ps-/pe-/ms-/me-) ব্যবহার করে। dir RTL-এ পরিবর্তন হলে প্যাডিং স্বয়ংক্রিয়ভাবে উল্টে যায়।",
    "section.i18n.icons": "দিকনির্দেশক আইকন মিররিং",
    "section.i18n.icons.description":
      "দিকনির্দেশক আইকন (চেভরন, তীর, পাঠান, আনডু, রিডো) আরবি লোকেলে [dir=rtl] সিলেক্টরের মাধ্যমে স্বয়ংক্রিয়ভাবে মিরর হয়। অ-দিকনির্দেশক আইকন অপরিবর্তিত থাকে।",

    "shell.nav.dashboard": "ড্যাশবোর্ড",
    "shell.nav.organization": "প্রতিষ্ঠান",
    "shell.nav.rbac": "ভূমিকা ও অনুমতি",
    "shell.nav.audit": "অডিট ট্রেইল",
    "shell.nav.students": "শিক্ষার্থী",
    "shell.nav.admission": "ভর্তি",
    "shell.nav.guardians": "অভিভাবক",
    "shell.nav.teachers": "শিক্ষক",
    "shell.nav.subjects": "বিষয়",
    "shell.nav.academic-structure": "শ্রেণি কাঠামো",
    "shell.nav.attendance": "উপস্থিতি",
    "shell.nav.exams": "পরীক্ষা",
    "shell.nav.results": "ফলাফল",
    "shell.nav.fees": "ফি",
    "shell.nav.accounting": "হিসাবনিকাশ",
    "shell.nav.zakat": "যাকাত",
    "shell.nav.inventory": "ইনভেন্টরি",
    "shell.nav.hostel": "হোস্টেল",
    "shell.nav.library": "লাইব্রেরি",
    "shell.nav.notices": "নোটিশ",
    "shell.nav.reports": "রিপোর্ট",
    "shell.nav.settings": "সেটিংস",
    "shell.nav.group.foundation": "ফাউন্ডেশন",
    "shell.nav.group.people": "মানুষ",
    "shell.nav.group.academic": "একাডেমিক",
    "shell.nav.group.finance": "ফিন্যান্স",
    "shell.nav.group.operations": "অপারেশনস",
    "shell.topbar.branch": "শাখা",
    "shell.topbar.branch.dhaka": "ঢাকা মূল শাখা",
    "shell.topbar.branch.chittagong": "চট্টগ্রাম শাখা",
    "shell.topbar.branch.sylhet": "সিলেট শাখা",
    "shell.topbar.academicYear": "শিক্ষাবর্ষ",
    "shell.topbar.search.placeholder": "শিক্ষার্থী, ফি, ক্লাস খুঁজুন…",
    "shell.topbar.notifications": "বিজ্ঞপ্তি",
    "shell.topbar.user.admin": "প্রশাসক",
    "shell.footer.rights": "© ২০২৬ MadrashaOS. সর্বস্বত্ব সংরক্ষিত।",
    "shell.dev.title": "ডেভ টুলবার",
    "shell.dev.role": "ভূমিকা",
    "shell.dev.branch": "শাখা",
    "shell.dev.network": "নেটওয়ার্ক",
    "shell.dev.network.normal": "স্বাভাবিক",
    "shell.dev.network.slow": "ধীর 3G",
    "shell.dev.network.offline": "অফলাইন",
    "shell.dev.collapse": "লুকান",
    "shell.dev.expand": "ডেভ",
    "footer.plan": "MadrashaOS · UI/UX কোডিং প্ল্যান ফেজ C0.3 · টোকেন v{version}",
    "footer.source": "উৎস: MadrashaOS_Session_1.1_Brand_Kit_Tokens.json (FROZEN)",
  },

  ar: {
    "app.title": "MadrashaOS",
    "app.subtitle": "نظام التصميم · الرموز v{version} · المرحلة C0.3",
    "app.badge.frozen": "مجمّد v{version}",
    "app.badge.session11": "الجلسة 1.1 مجموعة العلامة",
    "app.badge.session12": "الجلسة 1.2 نظام الرموز",
    "app.badge.wcag": "WCAG 2.1 AA",

    "theme.light": "☀ فاتح",
    "theme.dark": "☾ داكن",
    "theme.label": "السمة",

    "lang.label": "اللغة",
    "lang.english": "الإنجليزية",
    "lang.bangla": "البنغالية",
    "lang.arabic": "العربية",

    "hero.greeting": "السلام عليكم",
    "hero.description":
      "مكدس طباعة ثلاثي اللغات — Inter (en) · Hind Siliguri (bn) · Noto Naskh Arabic (ar). صفر مربعات tofu في جميع النصوص الثلاثة.",
    "hero.body": "مرحبًا بك في نظام تصميم مدرسة أوس.",
    "hero.script.english": "ENGLISH",
    "hero.script.bangla": "বাংলা",
    "hero.script.arabic": "العربية",

    "section.color.primary.title": "اللون · الأساسي",
    "section.color.primary.subtitle":
      "أخضر مزرق عميق — يستحضر طلاء بلاط المسجد والماء. مقياس من 11 خطوة مع لون أمامي مقترن. المصدر: tokens.json v1.0.0.",
    "section.color.primary.demo": "زر أساسي · primary.500",
    "section.color.primary.secondary": "ثانوي · primary.500 محدد",
    "section.color.primary.badge": "شارة · primary.50 + 700",

    "section.color.accent.title": "اللون · التمييز",
    "section.color.accent.subtitle":
      "ذهبي دافئ — لمسة مميزة للشعار وترويسات PDF وشارات الإنجاز وأزرار CTA الرئيسية. مقياس من 4 خطوات.",
    "section.color.accent.badge": "★ شارة الإنجاز",
    "section.color.accent.tint": "صبغة مميزة · accent.50",

    "section.color.semantic.title": "اللون · الدلالي",
    "section.color.semantic.subtitle":
      "مضبوط وفق تباين WCAG 2.1 AA. يُستخدم في التنبيهات ورقائق الحالة وحالات الحضور (حاضر / متأخر / غائب).",

    "section.color.neutral.title": "اللون · المحايد (رمادي دافئ)",
    "section.color.neutral.subtitle":
      "لمسة حجرية رملية — لا تكون سريرية أبدًا. مقياس من 12 خطوة (0–950) للأسطح والنصوص والحدود والفواصل.",

    "section.typography.title": "الطباعة · مقياس النوع",
    "section.typography.subtitle":
      "6 خطوات (caption → display). ارتفاع السطر وتباعد الحروف مضبوطان لكل خطوة. أضيق عند display وأوسع عند caption.",
    "section.typography.sample":
      "The quick brown fox — শিয়াল দ্রুত লাফ দেয় — الثعلب السريع",

    "section.spacing.title": "التباعد · شبكة 8pt",
    "section.spacing.subtitle":
      "مقياس من 14 خطوة (0–128px). وحدة أساسية 8px. كل padding وmargin وgap يجب أن يشير إلى هذه الرموز — لا قيم خارج الشبكة.",

    "section.radius.title": "نصف القطر",
    "section.elevation.title": "الارتفاع",
    "section.motion.title": "الحركة",
    "section.motion.easing": "منحنيات التسهيل",

    "section.i18n.title": "التدويل",
    "section.i18n.subtitle":
      "ثلاث لغات من الفئة الأولى (bn / en / ar) مع خط أنابيب RTL وأرقام بنغالية وعكس الأيقونات الاتجاهية. بدّل اللغة بالأعلى لرؤية كل قيمة تُعاد ترجمتها.",
    "section.i18n.localeInfo": "اللغة الحالية",
    "section.i18n.localeLabel": "التسمية",
    "section.i18n.localeDir": "الاتجاه",
    "section.i18n.localeBcp47": "BCP-47",
    "section.i18n.localeFont": "الخط",
    "section.i18n.localeNumerals": "الأرقام",
    "section.i18n.dates": "تنسيق التاريخ",
    "section.i18n.numbers": "تنسيق الأرقام",
    "section.i18n.currency": "العملة (BDT)",
    "section.i18n.rtl": "خصائص RTL المنطقية",
    "section.i18n.rtl.description":
      "يستخدم خصائص منطقية (ps-/pe-/ms-/me-) بدلاً من المادية (pl-/pr-/ml-/mr-). تنقلب المسافات الداخلية تلقائيًا عند التحويل إلى RTL.",
    "section.i18n.icons": "عكس الأيقونات الاتجاهية",
    "section.i18n.icons.description":
      "الأيقونات الاتجاهية (الأسهم، الشيفرونات، إرسال، تراجع، إعادة) تنعكس تلقائيًا في اللغة العربية عبر محدد [dir=rtl]. الأيقونات غير الاتجاهية تبقى دون تغيير.",

    "shell.nav.dashboard": "لوحة التحكم",
    "shell.nav.organization": "المؤسسة",
    "shell.nav.rbac": "الأدوار والصلاحيات",
    "shell.nav.audit": "سجل التدقيق",
    "shell.nav.students": "الطلاب",
    "shell.nav.admission": "القبول",
    "shell.nav.guardians": "أولياء الأمور",
    "shell.nav.teachers": "المعلمون",
    "shell.nav.attendance": "الحضور",
    "shell.nav.exams": "الامتحانات",
    "shell.nav.results": "النتائج",
    "shell.nav.fees": "الرسوم",
    "shell.nav.accounting": "المحاسبة",
    "shell.nav.zakat": "الزكاة",
    "shell.nav.inventory": "المخزون",
    "shell.nav.hostel": "السكن",
    "shell.nav.library": "المكتبة",
    "shell.nav.notices": "الإشعارات",
    "shell.nav.reports": "التقارير",
    "shell.nav.settings": "الإعدادات",
    "shell.nav.group.foundation": "الأساسيات",
    "shell.nav.group.people": "الأشخاص",
    "shell.nav.group.academic": "الأكاديمي",
    "shell.nav.group.finance": "المالية",
    "shell.nav.group.operations": "العمليات",
    "shell.topbar.branch": "الفرع",
    "shell.topbar.branch.dhaka": "فرع دكا الرئيسي",
    "shell.topbar.branch.chittagong": "فرع تشيتاغونغ",
    "shell.topbar.branch.sylhet": "فرع سيلهت",
    "shell.topbar.academicYear": "السنة الدراسية",
    "shell.topbar.search.placeholder": "ابحث عن الطلاب والرسوم والفصول…",
    "shell.topbar.notifications": "الإشعارات",
    "shell.topbar.user.admin": "المدير",
    "shell.footer.rights": "© ٢٠٢٦ MadrashaOS. جميع الحقوق محفوظة.",
    "shell.dev.title": "شريط المطور",
    "shell.dev.role": "الدور",
    "shell.dev.branch": "الفرع",
    "shell.dev.network": "الشبكة",
    "shell.dev.network.normal": "عادي",
    "shell.dev.network.slow": "بطيء 3G",
    "shell.dev.network.offline": "غير متصل",
    "shell.dev.collapse": "إخفاء",
    "shell.dev.expand": "مطور",
    "footer.plan": "MadrashaOS · خطة برمجة واجهة المستخدم المرحلة C0.3 · الرموز v{version}",
    "footer.source": "المصدر: MadrashaOS_Session_1.1_Brand_Kit_Tokens.json (مجمّد)",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type MessageKey = keyof typeof messages.en;

/** All message keys (used for type-safe `t()` calls). */
export const messageKeys = Object.keys(messages.en) as MessageKey[];
