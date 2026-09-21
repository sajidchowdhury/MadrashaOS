/**
 * MadrashaOS — Onboarding Workflow Steps
 *
 * Sequential setup checklist for new users.
 * Each step links to a real page where the user performs a real action.
 */

export type OnboardingStep = {
  id: string;
  title: string;
  instruction: string;
  route: string;
  buttonLabel: string;
  checkType:
    | "students"
    | "attendance"
    | "fees"
    | "exams"
    | "notices"
    | "rbac";
  icon: string;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "step-1",
    title: "১. শিক্ষার্থী যোগ করুন",
    instruction: "মাদ্রাসার শিক্ষার্থীদের তালিকায় গিয়ে Add Student বোতামে ক্লিক করুন। অন্তত একজন শিক্ষার্থীর তথ্য দিন।",
    route: "/students",
    buttonLabel: "শিক্ষার্থী তালিকায় যান",
    checkType: "students",
    icon: "🎓",
  },
  {
    id: "step-2",
    title: "২. উপস্থিতি নিন",
    instruction: "Take Attendance পেজে গিয়ে একটি ক্লাসের উপস্থিতি নিন। প্রতিটি শিক্ষার্থীর নামের পাশে ট্যাপ করে উপস্থিত/অনুপস্থিত চিহ্নিত করুন, তারপর Submit করুন।",
    route: "/attendance/take",
    buttonLabel: "উপস্থিতি নিতে যান",
    checkType: "attendance",
    icon: "✅",
  },
  {
    id: "step-3",
    title: "৩. ফি আদায় করুন",
    instruction: "ফি পেজে গিয়ে Collect Payment বোতামে ক্লিক করুন। একজন শিক্ষার্থীর কিস্তি নির্বাচন করে পরিমাণ ও পদ্ধতি দিন, তারপর Confirm করুন।",
    route: "/fees",
    buttonLabel: "ফি আদায়ে যান",
    checkType: "fees",
    icon: "💰",
  },
  {
    id: "step-4",
    title: "৪. পরীক্ষার নম্বর দিন",
    instruction: "পরীক্ষা পেজে গিয়ে Enter Marks বোতামে ক্লিক করুন। শিক্ষার্থীদের নম্বর দিন এবং Save & Submit করুন।",
    route: "/exams",
    buttonLabel: "নম্বর দিতে যান",
    checkType: "exams",
    icon: "📝",
  },
  {
    id: "step-5",
    title: "৫. নোটিশ পাঠান",
    instruction: "নোটিশ পেজে গিয়ে Compose বোতামে ক্লিক করুন। একটি নোটিশ লিখুন এবং অভিভাবকদের জন্য পাঠান।",
    route: "/notices",
    buttonLabel: "নোটিশ পেজে যান",
    checkType: "notices",
    icon: "📢",
  },
  {
    id: "step-6",
    title: "৬. ভূমিকা ও অনুমতি সেট করুন",
    instruction: "কে কী করতে পারবে তা নির্ধারণ করুন। প্রতিটি ভূমিকার জন্য অনুমতি চালু/বন্ধ করে Save Matrix বোতামে সংরক্ষণ করুন।",
    route: "/rbac",
    buttonLabel: "অনুমতি সেট করতে যান",
    checkType: "rbac",
    icon: "🔐",
  },
];
