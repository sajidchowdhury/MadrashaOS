/**
 * MadrashaOS — Mock Fixtures: Organization + Branches
 *
 * Session C0.4 — Mock-Data Layer & Seeding
 *
 * Single organization (Darul Uloom Madrasha) with 3 branches matching
 * the BRANCHES constant in stores/types.ts.
 */

import type { Organization, Branch } from "../types";

export const branches: Branch[] = [
  {
    id: "br-dhaka",
    code: "dhaka",
    name: "Dhaka Main Branch",
    nameBn: "ঢাকা মূল শাখা",
    address: "123 Mirpur Road, Dhanmondi, Dhaka 1209",
    phone: "+880 2 9661234",
    establishedYear: 1998,
  },
  {
    id: "br-ctg",
    code: "chittagong",
    name: "Chittagong Branch",
    nameBn: "চট্টগ্রাম শাখা",
    address: "45 Agrabad Commercial Area, Chittagong 4100",
    phone: "+880 31 2545678",
    establishedYear: 2005,
  },
  {
    id: "br-syl",
    code: "sylhet",
    name: "Sylhet Branch",
    nameBn: "সিলেট শাখা",
    address: "78 Zindabazar, Sylhet 3100",
    phone: "+880 821 712345",
    establishedYear: 2012,
  },
];

export const organization: Organization = {
  id: "org-madrashaos",
  name: "Darul Uloom Madrasha",
  nameBn: "দারুল উলূম মাদরাসা",
  branches,
};
