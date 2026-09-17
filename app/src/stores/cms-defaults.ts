/**
 * MadrashaOS — CMS Default Content (Task 8-a)
 *
 * The default content for the public website CMS, modelled on the
 * iom.edu.bd (ইসলামিক অনলাইন মাদ্রাসা) reference site.
 *
 * All copy is bilingual (English + Bangla) so the i18n locale switcher
 * can pick the right field without an extra translation lookup.
 *
 * This file is the ONLY source of truth for the default CMS state.
 * The Zustand store (cmsStore.ts) imports DEFAULT_CMS_CONTENT and
 * seeds itself on first load + on resetCms().
 *
 * Per task rules:
 *   - Uses ONLY FROZEN brand tokens where applicable (no raw hex/px).
 *     Color tokens here are plain strings so that the Theme section of
 *     the CMS admin can override them — but the defaults match the
 *     FROZEN palette (primary=#0E5C5C teal, accent=#C9A961 gold).
 *   - Does not modify i18n messages, moduleTree, or any fixtures.
 */

export type NavChild = {
  label: string;
  href: string;
  description?: string;
  icon?: string; // lucide icon name (kebab-case)
};

export type NavItem = {
  label: string;
  href: string;
  icon?: string;
  children?: NavChild[];
};

export type Program = {
  id: string;
  name: string;
  nameBn: string;
  category: string;
  duration: string;
  durationBn: string;
  description: string;
  descriptionBn: string;
  admissionFee: number;
  monthlyFee: number;
  icon: string; // lucide icon name (kebab-case)
  highlights: string[];
  seats: number;
};

export type CmsContent = {
  // Branding
  logo: {
    type: "text" | "image";
    text: string;
    textBn: string;
    monogram: string; // short Arabic / Bengali glyph e.g. "م"
    imageUrl?: string;
    tagline: string;
  };

  // Top contact bar
  topBar: {
    phone: string;
    email: string;
    links: { label: string; href: string }[];
    visible: boolean;
  };

  // Navbar
  navbar: {
    items: NavItem[];
    ctaButton: { label: string; href: string; visible: boolean };
  };

  // Hero
  hero: {
    eyebrow: string;
    eyebrowBn: string;
    title: string;
    titleBn: string;
    subtitle: string;
    subtitleBn: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    backgroundImage?: string;
  };

  // Stats
  stats: { label: string; labelBn: string; value: string; icon: string }[];

  // About section
  about: {
    eyebrow: string;
    title: string;
    titleBn: string;
    description: string;
    descriptionBn: string;
    features: string[];
    featuresBn: string[];
    imageIcon: string; // lucide icon name for the about image placeholder
  };

  // Programs / courses
  programs: Program[];

  // Alumni section
  alumni: {
    title: string;
    titleBn: string;
    description: string;
    descriptionBn: string;
    ctaLabel: string;
    ctaHref: string;
    stat: { value: string; label: string };
  };

  // Footer
  footer: {
    about: string;
    aboutBn: string;
    quickLinks: { label: string; href: string }[];
    contact: {
      address: string;
      addressBn: string;
      phone: string;
      email: string;
      hours: string;
    };
    social: { platform: string; href: string; icon: string }[];
    copyright: string;
  };

  // Theme override (defaults match FROZEN tokens — string hex values are
  // allowed here because this is editable user content, not component styling)
  theme: {
    primaryColor: string;
    accentColor: string;
  };
};

export const DEFAULT_CMS_CONTENT: CmsContent = {
  logo: {
    type: "text",
    text: "Darul Uloom Madrasha",
    textBn: "দারুল উলূম মাদরাসা",
    monogram: "م",
    tagline: "Knowledge · Faith · Character",
  },

  topBar: {
    phone: "+880 9638-113322",
    email: "info@madrashaos.org",
    links: [
      { label: "Campus Portal", href: "/dashboard" },
      { label: "Support", href: "/public/contact" },
      { label: "Fatwa", href: "/public/contact" },
    ],
    visible: true,
  },

  navbar: {
    items: [
      {
        label: "Home",
        href: "/public",
        icon: "home",
      },
      {
        label: "About",
        href: "/public#about",
        icon: "info",
        children: [
          { label: "About Us", href: "/public#about", icon: "school", description: "Our story, mission & vision" },
          { label: "Recognition", href: "/public#about", icon: "award", description: "Accreditation & affiliations" },
          { label: "Teachers", href: "/public#about", icon: "graduation-cap", description: "Meet our faculty" },
          { label: "Reviews", href: "/public#about", icon: "star", description: "What parents say" },
          { label: "Sample Class", href: "/public#about", icon: "play-circle", description: "Watch a sample lesson" },
          { label: "Rules", href: "/public#about", icon: "scroll-text", description: "Student code of conduct" },
        ],
      },
      {
        label: "Admission",
        href: "/public/admission",
        icon: "graduation-cap",
        children: [
          { label: "Alim Course", href: "/public/admission", icon: "book-open" },
          { label: "All Courses", href: "/public/programs", icon: "layout-grid" },
          { label: "Application", href: "/public/admission", icon: "clipboard-list" },
          { label: "Re-admission", href: "/public/admission", icon: "refresh-cw" },
          { label: "Poor Fund", href: "/public/donate", icon: "hand-heart" },
        ],
      },
      {
        label: "Student Corner",
        href: "/dashboard",
        icon: "user-round",
        children: [
          { label: "Campus Portal", href: "/dashboard", icon: "layout-dashboard" },
          { label: "Class Routine", href: "/dashboard", icon: "calendar-days" },
          { label: "Fee Details", href: "/fees", icon: "wallet" },
          { label: "Notice Board", href: "/public/notices", icon: "megaphone" },
          { label: "Support", href: "/public/contact", icon: "life-buoy" },
        ],
      },
      {
        label: "Activities",
        href: "/public/events",
        icon: "sparkles",
        children: [
          { label: "Ruqyah", href: "/public/events", icon: "sparkles", description: "Spiritual healing sessions" },
          { label: "Hadiya Shop", href: "/public/events", icon: "shopping-bag", description: "Books & Islamic goods" },
          { label: "E-Library", href: "/public/events", icon: "library", description: "Digital book catalog" },
          { label: "Fatwa", href: "/public/contact", icon: "scale", description: "Religious rulings" },
          { label: "Clinic", href: "/public/events", icon: "stethoscope", description: "Free weekly clinic" },
          { label: "Family Counseling", href: "/public/contact", icon: "users-round", description: "Confidential counseling" },
          { label: "Blood Directory", href: "/public/events", icon: "droplet", description: "Donor network" },
          { label: "Entrepreneur Club", href: "/public/events", icon: "briefcase", description: "Business mentorship" },
        ],
      },
      {
        label: "Notices",
        href: "/public/notices",
        icon: "megaphone",
      },
      {
        label: "Events",
        href: "/public/events",
        icon: "calendar-days",
      },
      {
        label: "Contact",
        href: "/public/contact",
        icon: "mail",
      },
      {
        label: "Donation",
        href: "/public/donate",
        icon: "heart",
      },
    ],
    ctaButton: {
      label: "Apply Now",
      href: "/public/admission",
      visible: true,
    },
  },

  hero: {
    eyebrow: "Admissions Open · 2026–2027",
    eyebrowBn: "ভর্তি চলছে · ২০২৬–২০২৭",
    title: "Darul Uloom Madrasha",
    titleBn: "এশিয়ার অন্যতম বৃহৎ ইসলামিক অনলাইন মাদরাসা",
    subtitle:
      "Knowledge · Faith · Character — nurturing the next generation of Huffaz, Ulama and upright citizens through a structured curriculum in Quran, Hadith, Fiqh and Arabic language, accessible worldwide.",
    subtitleBn:
      "জ্ঞান · ঈমান · চরিত্র — কুরআন, হাদিস, ফিকহ ও আরবি ভাষায় গঠিত পাঠ্যক্রমের মাধ্যমে বিশ্বের যেকোনো প্রান্ত থেকে পরবর্তী প্রজন্মের হাফেজ, উলামা ও চরিত্রবান নাগরিক গড়ে তোলার লক্ষ্যে কাজ করছি।",
    primaryCta: { label: "View Courses", href: "/public/programs" },
    secondaryCta: { label: "About Us", href: "/public#about" },
    backgroundImage: undefined,
  },

  stats: [
    { label: "Total Students", labelBn: "মোট শিক্ষার্থী", value: "177,119+", icon: "users" },
    { label: "Alim Students", labelBn: "আলিম শিক্ষার্থী", value: "27,252+", icon: "graduation-cap" },
    { label: "Live Courses", labelBn: "চলমান কোর্স", value: "20+", icon: "play-circle" },
    { label: "Teachers", labelBn: "শিক্ষক", value: "114+", icon: "presentation" },
  ],

  about: {
    eyebrow: "About Us",
    title: "A modern madrasha with a classical soul",
    titleBn: "ক্লাসিক ঐতিহ্যে সমৃদ্ধ আধুনিক মাদরাসা",
    description:
      "Darul Uloom Madrasha blends a classical Hifz + Alim curriculum with modern pedagogy — live online classes, recorded lectures, and a faculty of over a hundred qualified Ustadhs holding ijazah and degrees from the Islamic University of Madinah, Al-Azhar, and Darul Uloom Deoband. Since 2001 we have served students in 47 countries with free and affordable Islamic education.",
    descriptionBn:
      "দারুল উলূম মাদরাসা ক্লাসিক হিফজ + আলিম পাঠ্যক্রমের সাথে আধুনিক শিক্ষায়তন যুক্ত করেছে — লাইভ অনলাইন ক্লাস, রেকর্ডেড লেকচার, এবং একশোরও বেশি যোগ্য উস্তাদের সমন্বয়ে গঠিত শিক্ষক মণ্ডলী মদিনা বিশ্ববিদ্যালয়, আল-আজহার ও দারুল উলূম দেওবন্দ থেকে সনদপ্রাপ্ত। ২০০১ সাল থেকে আমরা ৪৭টি দেশের শিক্ষার্থীদের বিনামূল্যে ও সাশ্রয়ী ইসলামি শিক্ষা প্রদান করছি।",
    features: [
      "Live online classes with qualified Ustadhs",
      "Ijazah-certified Qirat & Hifz programs",
      "Bilingual curriculum (Arabic + native language)",
      "Free education for orphans and needy students",
      "Recorded lectures for flexible revision",
      "Recognized Alim certificate on completion",
    ],
    featuresBn: [
      "যোগ্য উস্তাদদের সাথে লাইভ অনলাইন ক্লাস",
      "ইজাযাপ্রাপ্ত কিরাত ও হিফজ প্রোগ্রাম",
      "দ্বিভাষিক পাঠ্যক্রম (আরবি + মাতৃভাষা)",
      "এতিম ও অসহায় শিক্ষার্থীদের জন্য বিনামূল্যে শিক্ষা",
      "পুনরায় পড়ার জন্য রেকর্ডেড লেকচার",
      "সমাপ্তিতে স্বীকৃত আলিম সনদ",
    ],
    imageIcon: "school",
  },

  programs: [
    {
      id: "alim",
      name: "Alim Course",
      nameBn: "আলিম কোর্স",
      category: "Alim",
      duration: "3 years",
      durationBn: "৩ বছর",
      description:
        "Comprehensive 3-year online Alim course covering Arabic grammar (Sarf & Nahw), Fiqh, Hadith, Tafsir, Aqidah and Islamic history. Final year grants the Alim certificate (Dawra-e-Hadith).",
      descriptionBn:
        "৩ বছরের ব্যাপক অনলাইন আলিম কোর্স — আরবি ব্যাকরণ (সরফ ও নহু), ফিকহ, হাদিস, তাফসির, আকীদা ও ইসলামি ইতিহাস। শেষ বর্ষে আলিম সনদ (দাওরায়ে হাদিস) প্রদান করা হয়।",
      admissionFee: 1500,
      monthlyFee: 800,
      icon: "graduation-cap",
      highlights: [
        "Curriculum aligned with Wifaq-ul-Madaris",
        "Live classes 6 days a week",
        "Final year specialization track",
      ],
      seats: 60,
    },
    {
      id: "nazera",
      name: "Nazera Quran",
      nameBn: "নাযেরা কুরআন",
      category: "Hifz",
      duration: "6 months",
      durationBn: "৬ মাস",
      description:
        "Learn to recite the Holy Quran fluently with correct Tajweed. A 6-month foundation course designed for adults and children alike — ideal for new Muslims and busy professionals.",
      descriptionBn:
        "সঠিক তাজবীদ সহ পবিত্র কুরআন সাবলীলভাবে তিলাওয়াত শিখুন। প্রাপ্তবয়স্ক ও শিশুদের জন্য ৬ মাসের ফাউন্ডেশন কোর্স — নতুন মুসলিম ও ব্যস্ত পেশাদারদের জন্য আদর্শ।",
      admissionFee: 500,
      monthlyFee: 400,
      icon: "book-open",
      highlights: [
        "Beginner-friendly pace",
        "Daily 30-minute live class",
        "Tajweed rules emphasis",
      ],
      seats: 100,
    },
    {
      id: "private",
      name: "One-to-One Private Class",
      nameBn: "একক প্রাইভেট ক্লাস",
      category: "Studies",
      duration: "1–2 years",
      durationBn: "১–২ বছর",
      description:
        "Personalized one-to-one Quran or Islamic Studies classes tailored to your goals — Hifz revision, Qirat refinement, or Arabic conversation. Schedule at your convenience.",
      descriptionBn:
        "আপনার লক্ষ্য অনুযায়ী ব্যক্তিগত একক কুরআন বা ইসলামি শিক্ষা ক্লাস — হিফজ পুনরাবৃত্তি, কিরাত চর্চা, বা আরবি কথোপকথন। আপনার সুবিধা অনুযায়ী সময়সূচি।",
      admissionFee: 1000,
      monthlyFee: 1500,
      icon: "user-round",
      highlights: [
        "Dedicated teacher",
        "Flexible scheduling",
        "Personalized learning plan",
      ],
      seats: 25,
    },
    {
      id: "hifz",
      name: "Hifz-ul-Quran",
      nameBn: "হিফজুল কুরআন",
      category: "Hifz",
      duration: "2–3 years",
      durationBn: "২–৩ বছর",
      description:
        "A structured online Hifz program with daily sabaq, weekly sabqi, and monthly manzil cycles. Students memorize the entire Quran under the supervision of a Hafiz-e-Quran teacher with ijazah.",
      descriptionBn:
        "একটি সুসংগঠিত অনলাইন হিফজ প্রোগ্রাম — প্রতিদিন সবক, সাপ্তাহিক সাবকি, এবং মাসিক মনযিল চক্র। ইজাযাপ্রাপ্ত হাফেজে কুরআন শিক্ষকের তত্ত্বাবধানে সম্পূর্ণ কুরআন মুখস্থ।",
      admissionFee: 800,
      monthlyFee: 1000,
      icon: "book-marked",
      highlights: [
        "Ijazah chain certification",
        "Daily individual revision",
        "Monthly parent–teacher review",
      ],
      seats: 40,
    },
    {
      id: "tajweed",
      name: "Tajweed Foundation",
      nameBn: "তাজবীদ ফাউন্ডেশন",
      category: "Tajweed",
      duration: "3 months",
      durationBn: "৩ মাস",
      description:
        "Master the rules of Tajweed — proper makharij, sifat, and rules of Noon Sakinah and Meem Sakinah. A short, intensive 3-month course for reciters of all levels.",
      descriptionBn:
        "তাজবীদের নিয়মাবলি আয়ত্ত করুন — সঠিক মাখরাজ, সিফাত, এবং নুন সাকিনাহ ও মীম সাকিনাহ বিধান। সব স্তরের কারীদের জন্য সংক্ষিপ্ত ও গভীর ৩ মাসের কোর্স।",
      admissionFee: 400,
      monthlyFee: 300,
      icon: "sparkles",
      highlights: [
        "Intensive 3-month course",
        "Hands-on pronunciation drills",
        "Weekend batches available",
      ],
      seats: 80,
    },
    {
      id: "arabic",
      name: "Arabic Language",
      nameBn: "আরবি ভাষা",
      category: "Language",
      duration: "1 year",
      durationBn: "১ বছর",
      description:
        "A 1-year conversational + classical Arabic course — Sarf, Nahw, modern spoken Arabic, and introductory Balagha. Ideal preparatory track for the Alim Course.",
      descriptionBn:
        "১ বছরের কথোপকথন + ক্লাসিক আরবি কোর্স — সরফ, নহু, আধুনিক কথিত আরবি, এবং প্রাথমিক বালাগা। আলিম কোর্সের জন্য আদর্শ প্রস্তুতি ট্র্যাক।",
      admissionFee: 600,
      monthlyFee: 500,
      icon: "languages",
      highlights: [
        "Grammar + conversation split",
        "Modern Standard Arabic focus",
        "Quranic vocabulary emphasis",
      ],
      seats: 70,
    },
  ],

  alumni: {
    title: "Join our global alumni network",
    titleBn: "আমাদের বিশ্বব্যাপী প্রাক্তন শিক্ষার্থী নেটওয়ার্কে যুক্ত হন",
    description:
      "Over 177,000 alumni across 47 countries — Imams, teachers, professionals, and community leaders — keeping the chain of knowledge alive. Join the network to reconnect, mentor, and serve.",
    descriptionBn:
      "৪৭টি দেশে ১,৭৭,০০০+ প্রাক্তন শিক্ষার্থী — ইমাম, শিক্ষক, পেশাদার, এবং সমাজ নেতা — জ্ঞানের ধারাবাহিকতা বজায় রেখে আসছেন। পুনরায় সংযুক্ত হতে, পরামর্শ দিতে এবং সেবা করতে নেটওয়ার্কে যুক্ত হন।",
    ctaLabel: "Join Alumni Network",
    ctaHref: "/public/contact",
    stat: { value: "177,119+", label: "alumni worldwide" },
  },

  footer: {
    about:
      "Darul Uloom Madrasha is a community madrasha offering Hifz, Alim, Qirat, Tajweed and Arabic Language programs — accessible worldwide through live online classes and in-person branches in Dhaka, Chittagong and Sylhet.",
    aboutBn:
      "দারুল উলূম মাদরাসা একটি সম্প্রদায় ভিত্তিক মাদরাসা — হিফজ, আলিম, কিরাত, তাজবীদ এবং আরবি ভাষা প্রোগ্রাম প্রদান করে — লাইভ অনলাইন ক্লাস ও ঢাকা, চট্টগ্রাম ও সিলেটে শাখার মাধ্যমে বিশ্বব্যাপী সহজলভ্য।",
    quickLinks: [
      { label: "Home", href: "/public" },
      { label: "Programs", href: "/public/programs" },
      { label: "Admission", href: "/public/admission" },
      { label: "Notices", href: "/public/notices" },
      { label: "Events", href: "/public/events" },
      { label: "Donate", href: "/public/donate" },
      { label: "Contact", href: "/public/contact" },
    ],
    contact: {
      address: "123 Bashundhara R/A, Block-C, Dhaka 1229, Bangladesh",
      addressBn: "১২৩ বসুন্ধরা আর/এ, ব্লক-সি, ঢাকা ১২২৯, বাংলাদেশ",
      phone: "+880 9638-113322",
      email: "info@madrashaos.org",
      hours: "Sat – Thu, 8:30 AM – 4:30 PM (closed Fridays)",
    },
    social: [
      { platform: "Facebook", href: "https://facebook.com", icon: "facebook" },
      { platform: "YouTube", href: "https://youtube.com", icon: "youtube" },
      { platform: "Twitter", href: "https://twitter.com", icon: "twitter" },
      { platform: "Instagram", href: "https://instagram.com", icon: "instagram" },
      { platform: "WhatsApp", href: "https://whatsapp.com", icon: "message-circle" },
    ],
    copyright: "© 2026 Darul Uloom Madrasha. All rights reserved.",
  },

  theme: {
    primaryColor: "#0E5C5C",
    accentColor: "#C9A961",
  },
};
