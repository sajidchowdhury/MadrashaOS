/**
 * MadrashaOS — API Validation Schemas
 *
 * Phase B3.1 — Organization & Multi-Branch API
 *
 * Zod schemas for request body validation. Every API endpoint that
 * accepts a body validates against a schema from this file.
 */

import { z } from "zod";

/* --- Organization --- */

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  name_bn: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  address: z.string().max(1000).optional(),
  logo_url: z.string().url().optional(),
  website_url: z.string().url().optional(),
  established_year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  settings: z.record(z.unknown()).optional(),
});

/* --- Branch --- */

export const createBranchSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Code must be lowercase alphanumeric with dashes"),
  name: z.string().min(1).max(255),
  name_bn: z.string().min(1).max(255),
  address: z.string().max(1000).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  established_year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const updateBranchSchema = createBranchSchema.partial().extend({
  is_active: z.boolean().optional(),
});

/* --- Branch Switch (Risk R1) --- */

export const switchBranchSchema = z.object({
  branch_id: z.string().uuid(),
});
