/**
 * MadrashaOS — Mock Fixtures: Classes + Guardians + Students
 *
 * Session C0.4 — Mock-Data Layer & Seeding
 *
 * 4 classes (Class 1–5), 8 guardians, 40 students.
 * All seeded against the Dhaka branch to populate list screens realistically.
 */

import type { Class, Guardian, Student } from "../types";

export const classes: Class[] = [
  {
    id: "cls-1",
    name: "Class 1",
    nameBn: "প্রথম শ্রেণী",
    level: 1,
    branchId: "br-dhaka",
    sections: ["A", "B"],
  },
  {
    id: "cls-3",
    name: "Class 3",
    nameBn: "তৃতীয় শ্রেণী",
    level: 3,
    branchId: "br-dhaka",
    sections: ["A"],
  },
  {
    id: "cls-5",
    name: "Class 5",
    nameBn: "পঞ্চম শ্রেণী",
    level: 5,
    branchId: "br-dhaka",
    sections: ["A", "B"],
  },
  {
    id: "cls-8",
    name: "Class 8",
    nameBn: "অষ্টম শ্রেণী",
    level: 8,
    branchId: "br-dhaka",
    sections: ["A"],
  },
];

export const guardians: Guardian[] = [
  { id: "g-1", name: "Omar Faruq", nameBn: "ওমর ফারুক", phone: "+880 1711 000007", email: "omar.parent@example.com", occupation: "Business", branchId: "br-dhaka" },
  { id: "g-2", name: "Aisha Begum", nameBn: "আয়েশা বেগম", phone: "+880 1711 000010", email: "aisha.parent@example.com", occupation: "Teacher", branchId: "br-dhaka" },
  { id: "g-3", name: "Bilal Ahmed", nameBn: "বিলাল আহমেদ", phone: "+880 1711 000011", email: "bilal.parent@example.com", occupation: "Engineer", branchId: "br-dhaka" },
  { id: "g-4", name: "Khadija Sultana", nameBn: "খাদিজা সুলতানা", phone: "+880 1711 000012", email: "khadija.parent@example.com", occupation: "Doctor", branchId: "br-dhaka" },
  { id: "g-5", name: "Yusuf Khan", nameBn: "ইউসুফ খান", phone: "+880 1711 000013", email: "yusuf.parent@example.com", occupation: "Govt Service", branchId: "br-dhaka" },
  { id: "g-6", name: "Zainab Akter", nameBn: "জয়নব আক্তার", phone: "+880 1711 000014", email: "zainab.parent@example.com", occupation: "Homemaker", branchId: "br-dhaka" },
  { id: "g-7", name: "Hamza Rahman", nameBn: "হামজা রহমান", phone: "+880 1711 000015", email: "hamza.parent@example.com", occupation: "Business", branchId: "br-dhaka" },
  { id: "g-8", name: "Maryam Chowdhury", nameBn: "মরিয়ম চৌধুরী", phone: "+880 1711 000016", email: "maryam.parent@example.com", occupation: "NGO Worker", branchId: "br-dhaka" },
];

const STUDENT_FIRST_NAMES_EN = [
  "Ahmad", "Fatima", "Muhammad", "Aisha", "Omar", "Khadija", "Bilal", "Zainab",
  "Yusuf", "Maryam", "Hamza", "Hafsa", "Ibrahim", "Amina", "Ismail", "Ruqayyah",
  "Daud", "Sara", "Sulaiman", "Hawa", "Musa", "Lubaba", "Isa", "Maymunah",
  "Yahya", "Safiya", "Zakariya", "Sumayya", "Tariq", "Asma", "Khalid", "Nusaybah",
  "Salman", "Umm", "Jafar", "Kulthum", "Hasan", "Rayhana", "Husain", "Umm",
];
const STUDENT_FIRST_NAMES_BN = [
  "আহমদ", "ফাতিমা", "মুহাম্মদ", "আয়েশা", "ওমর", "খাদিজা", "বিলাল", "জয়নব",
  "ইউসুফ", "মরিয়ম", "হামজা", "হাফসা", "ইব্রাহিম", "আমিনা", "ইসমাঈল", "রুকাইয়া",
  "দাউদ", "সারা", "সুলাইমান", "হাওয়া", "মুসা", "লুবাবা", "ঈসা", "মাইমুনা",
  "ইয়াহইয়া", "সাফিয়া", "জাকারিয়া", "সুমাইয়া", "তারিক", "আসমা", "খালিদ", "নুসাইবা",
  "সালমান", "উম্ম", "জাফর", "কুলসুম", "হাসান", "রায়হানা", "হুসাইন", "উম্ম",
];
const SURNAMES = ["Hossain", "Akter", "Rahman", "Chowdhury", "Begum", "Ahmed", "Islam", "Khan"];
const SURNAMES_BN = ["হোসেন", "আক্তার", "রহমান", "চৌধুরী", "বেগম", "আহমেদ", "ইসলাম", "খান"];

function generateStudents(): Student[] {
  const students: Student[] = [];
  let roll = 1;
  // Class 1 Section A — 8 students
  for (let i = 0; i < 8; i++) {
    students.push(makeStudent(i, roll++, "cls-1", "A", "g-1"));
  }
  // Class 3 Section A — 10 students
  for (let i = 8; i < 18; i++) {
    students.push(makeStudent(i, roll++, "cls-3", "A", "g-2"));
  }
  // Class 5 Section A — 12 students (the famous Class 5-A from SRS Risk R6)
  for (let i = 18; i < 30; i++) {
    students.push(makeStudent(i, roll++, "cls-5", "A", "g-3"));
  }
  // Class 5 Section B — 10 students
  for (let i = 30; i < 40; i++) {
    students.push(makeStudent(i, roll++, "cls-5", "B", "g-4"));
  }
  return students;
}

function makeStudent(
  i: number,
  roll: number,
  classId: string,
  section: string,
  guardianId: string,
): Student {
  const gender: "male" | "female" = i % 2 === 0 ? "male" : "female";
  const firstEn = STUDENT_FIRST_NAMES_EN[i % STUDENT_FIRST_NAMES_EN.length];
  const firstBn = STUDENT_FIRST_NAMES_BN[i % STUDENT_FIRST_NAMES_BN.length];
  const surname = SURNAMES[i % SURNAMES.length];
  const surnameBn = SURNAMES_BN[i % SURNAMES_BN.length];
  const year = 2010 + (i % 6); // DOB years 2010-2015
  const month = ((i % 12) + 1).toString().padStart(2, "0");
  const day = ((i % 28) + 1).toString().padStart(2, "0");
  return {
    id: `stu-${(i + 1).toString().padStart(3, "0")}`,
    code: `MOS-2026-${(i + 1).toString().padStart(3, "0")}`,
    name: `${firstEn} ${surname}`,
    nameBn: `${firstBn} ${surnameBn}`,
    nameAr: i % 4 === 0 ? `${firstEn} بن ${surname}` : undefined,
    classId,
    section,
    guardianId,
    branchId: "br-dhaka",
    roll,
    gender,
    dob: `${year}-${month}-${day}`,
    admittedAt: "2026-01-15",
    status: "active",
  };
}

export const students: Student[] = generateStudents();

export function getStudentById(id: string): Student | undefined {
  return students.find((s) => s.id === id);
}

export function getStudentsByClass(classId: string, section?: string): Student[] {
  return students.filter(
    (s) => s.classId === classId && (!section || s.section === section),
  );
}
