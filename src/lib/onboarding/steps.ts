/**
 * MadrashaOS — Setup Checklist (one-time configuration)
 *
 * This is NOT about daily tasks. This is about whether the SOFTWARE ITSELF
 * is ready to use — has the admin configured all the foundational pieces?
 *
 * Each step checks if a specific configuration entity exists in the DB.
 * Steps must be done in order — you can't set up attendance before classes.
 *
 * When all steps are ✅, the software is fully configured and ready
 * for daily operations.
 */

export type SetupStep = {
  id: string;
  title: string;
  instruction: string;
  route: string;
  buttonLabel: string;
  /** API endpoint to check if this step is done */
  checkEndpoint: string;
  /** Field in the response to check (supports nested: "data.length") */
  checkField: string;
  /** Minimum value to consider "done" */
  checkMin: number;
  icon: string;
};

export const SETUP_STEPS: SetupStep[] = [
  {
    id: "setup-1",
    title: "১. প্রতিষ্ঠানের তথ্য যাচাই করুন",
    instruction:
      "মাদ্রাসার নাম, ঠিকানা, ফোন, ইমেইল ঠিকানা ঠিক আছে কিনা দেখুন। প্রয়োজনে পরিবর্তন করুন।",
    route: "/organization",
    buttonLabel: "প্রতিষ্ঠান পেজে যান",
    checkEndpoint: "/api/v1/organizations",
    checkField: "id",
    checkMin: 1,
    icon: "🏛️",
  },
  {
    id: "setup-2",
    title: "২. শাখা যাচাই করুন",
    instruction:
      "মাদ্রাসার শাখাগুলো (যেমন: ঢাকা, চট্টগ্রাম, সিলেট) ঠিক আছে কিনা দেখুন। প্রতিটি শাখার নাম ও কোড যাচাই করুন।",
    route: "/organization",
    buttonLabel: "শাখা দেখতে যান",
    checkEndpoint: "/api/v1/branches?pageSize=1",
    checkField: "data.length",
    checkMin: 1,
    icon: "🏢",
  },
  {
    id: "setup-3",
    title: "৩. ক্লাস ও সেকশন তৈরি করুন",
    instruction:
      "মাদ্রাসায় কোন কোন ক্লাস আছে তা নির্ধারণ করুন। প্রতিটি ক্লাসের জন্য সেকশন (ক, খ, গ) তৈরি করুন। যেমন: ক্লাস ১ - সেকশন ক, ক্লাস ৫ - সেকশন ক ও খ।",
    route: "/academic/structure",
    buttonLabel: "ক্লাস সেটআপে যান",
    checkEndpoint: "/api/v1/classes?pageSize=1",
    checkField: "data.length",
    checkMin: 1,
    icon: "📚",
  },
  {
    id: "setup-4",
    title: "৪. ব্যবহারকারী ও ভূমিকা সেট করুন",
    instruction:
      "প্রিন্সিপাল, অ্যাডমিনিস্ট্রেটর, হিসাবরক্ষক, শিক্ষক, স্টোরকিপার — প্রত্যেকের জন্য একটি ইউজার অ্যাকাউন্ট তৈরি করুন। কে কী করতে পারবে তা নির্ধারণ করতে ভূমিকা ও অনুমতি পেজে যান।",
    route: "/rbac",
    buttonLabel: "অনুমতি সেট করতে যান",
    checkEndpoint: "/api/v1/roles?pageSize=1",
    checkField: "data.length",
    checkMin: 1,
    icon: "👤",
  },
  {
    id: "setup-5",
    title: "৫. শিক্ষক যোগ করুন",
    instruction:
      "প্রতিটি ক্লাসের জন্য শিক্ষক নিযুক্ত করুন। কোন শিক্ষক কোন ক্লাসে পড়াবেন তা নির্ধারণ করুন।",
    route: "/teachers",
    buttonLabel: "শিক্ষক পেজে যান",
    checkEndpoint: "/api/v1/teachers?pageSize=1",
    checkField: "data.length",
    checkMin: 1,
    icon: "👨‍🏫",
  },
  {
    id: "setup-6",
    title: "৬. শিক্ষার্থী ভর্তি করুন",
    instruction:
      "বিদ্যমান শিক্ষার্থীদের তালিকায় যোগ করুন বা নতুন ভর্তি গ্রহণ করুন। প্রতিটি শিক্ষার্থীর নাম, ক্লাস, সেকশন, রোল, অভিভাবকের তথ্য দিন।",
    route: "/students",
    buttonLabel: "শিক্ষার্থী পেজে যান",
    checkEndpoint: "/api/v1/students?pageSize=1",
    checkField: "data.length",
    checkMin: 1,
    icon: "🎓",
  },
  {
    id: "setup-7",
    title: "৭. ফি পরিকল্পনা তৈরি করুন",
    instruction:
      "প্রতিটি ক্লাসের জন্য বার্ষিক ফি নির্ধারণ করুন। কয়টি কিস্তিতে পরিশোধ করতে হবে তা নির্ধারণ করুন। যেমন: বার্ষিক ১২,০০০ টাকা, ৩ কিস্তিতে।",
    route: "/fees",
    buttonLabel: "ফি পেজে যান",
    checkEndpoint: "/api/v1/fees/plans?pageSize=1",
    checkField: "data.length",
    checkMin: 1,
    icon: "💰",
  },
  {
    id: "setup-8",
    title: "৮. হিসাব খাতা সেট করুন",
    instruction:
      "আয়-ব্যয়ের জন্য অ্যাকাউন্ট তৈরি করুন। অন্তত একটি নগদ অ্যাকাউন্ট, একটি ব্যাংক অ্যাকাউন্ট, এবং একটি যাকাত তহবিল অ্যাকাউন্ট রাখুন।",
    route: "/accounting",
    buttonLabel: "হিসাব খাতায় যান",
    checkEndpoint: "/api/v1/accounts?pageSize=1",
    checkField: "data.length",
    checkMin: 1,
    icon: "📊",
  },
  {
    id: "setup-9",
    title: "৯. নিরাপত্তা নীতি নির্ধারণ করুন",
    instruction:
      "পাসওয়ার্ড কত দিন পর পরিবর্তন করতে হবে, কতবার ভুল লগইনে অ্যাকাউন্ট লক হবে — এই নিয়মগুলো নির্ধারণ করুন। দ্বি-স্তরীয় প্রমাণীকরণ (MFA) চালু করা আছে কিনা দেখুন।",
    route: "/security",
    buttonLabel: "নিরাপত্তা পেজে যান",
    checkEndpoint: "/api/v1/security/policy",
    checkField: "id",
    checkMin: 1,
    icon: "🔒",
  },
  {
    id: "setup-10",
    title: "১০. ব্যাকআপ নিন",
    instruction:
      "একবার ব্যাকআপ নিন যাতে সব তথ্য সুরক্ষিত থাকে। ভবিষ্যতে নিয়মিত ব্যাকআপের জন্য cron job সেট করুন (DEPLOYMENT.md দেখুন)।",
    route: "/backup",
    buttonLabel: "ব্যাকআপ পেজে যান",
    checkEndpoint: "/api/v1/backup?pageSize=1",
    checkField: "data.length",
    checkMin: 1,
    icon: "💾",
  },
];
