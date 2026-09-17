/**
 * MadrashaOS — Mock Fixtures: Users (8 personas)
 *
 * Session C0.4 — Mock-Data Layer & Seeding
 *
 * One user per persona from Session 0.2 (SRS §8.1).
 * Names are scaffolded [placeholder] — real interview data fills them later.
 */

import type { User } from "../types";

export const users: User[] = [
  {
    id: "usr-superadmin",
    role: "super-admin",
    name: "Super Admin",
    nameBn: "সুপার অ্যাডমিন",
    email: "superadmin@madrashaos.org",
    phone: "+880 1711 000001",
    branchId: "br-dhaka",
    avatarInitial: "S",
  },
  {
    id: "usr-authority",
    role: "authority",
    name: "Principal Ahmad",
    nameBn: "অধ্যক্ষ আহমদ",
    email: "principal@madrashaos.org",
    phone: "+880 1711 000002",
    branchId: "br-dhaka",
    avatarInitial: "A",
  },
  {
    id: "usr-administrator",
    role: "administrator",
    name: "Administrator Karim",
    nameBn: "প্রশাসক করিম",
    email: "admin@madrashaos.org",
    phone: "+880 1711 000003",
    branchId: "br-dhaka",
    avatarInitial: "K",
  },
  {
    id: "usr-accountant",
    role: "accountant",
    name: "Accountant Rahman",
    nameBn: "হিসাবরক্ষক রহমান",
    email: "accounts@madrashaos.org",
    phone: "+880 1711 000004",
    branchId: "br-dhaka",
    avatarInitial: "R",
  },
  {
    id: "usr-teacher",
    role: "teacher",
    name: "Teacher Bilal",
    nameBn: "শিক্ষক বিলাল",
    email: "bilal@madrashaos.org",
    phone: "+880 1711 000005",
    branchId: "br-dhaka",
    avatarInitial: "B",
  },
  {
    id: "usr-storekeeper",
    role: "storekeeper",
    name: "Storekeeper Yusuf",
    nameBn: "স্টোরকিপার ইউসুফ",
    email: "store@madrashaos.org",
    phone: "+880 1711 000006",
    branchId: "br-dhaka",
    avatarInitial: "Y",
  },
  {
    id: "usr-guardian",
    role: "guardian",
    name: "Guardian Omar",
    nameBn: "অভিভাবক ওমর",
    email: "omar.parent@example.com",
    phone: "+880 1711 000007",
    branchId: "br-dhaka",
    avatarInitial: "O",
  },
  {
    id: "usr-student",
    role: "student",
    name: "Student Fatima",
    nameBn: "ছাত্রী ফাতিমা",
    email: "fatima@student.madrashaos.org",
    phone: "+880 1711 000008",
    branchId: "br-dhaka",
    avatarInitial: "F",
  },
];

export function getUserByRole(role: string): User | undefined {
  return users.find((u) => u.role === role);
}

export function getUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}
