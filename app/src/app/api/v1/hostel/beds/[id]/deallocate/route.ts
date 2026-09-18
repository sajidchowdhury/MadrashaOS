/**
 * MadrashaOS — Hostel Bed Deallocate API
 *
 * Phase B7.3
 *
 * POST /api/v1/hostel/beds/:id/deallocate — vacate bed (perm: hostel.allocate)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withPermission("hostel.allocate", async (_req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id: bedId } = await ctx.params;

  const bed = await db.hostelBed.findFirst({
    where: { id: bedId, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      room: { select: { room_number: true } },
      student: { select: { id: true, name: true } },
    },
  });
  if (!bed) return errorResponse("Bed not found", 404);

  if (bed.status !== "occupied") {
    return errorResponse(`Bed is already ${bed.status}. Cannot deallocate.`, 409);
  }

  await db.hostelBed.update({
    where: { id: bedId },
    data: {
      student_id: null,
      status: "vacant",
      vacated_at: new Date(),
      updated_by: tenantCtx.user_id,
    } as never,
  });

  await db.auditLog.create({
    data: {
      organization_id: tenantCtx.organization_id,
      branch_id: tenantCtx.branch_id ?? null,
      entity_type: "hostel_beds",
      entity_id: bedId,
      action: "deallocate",
      old_values: { status: "occupied", student_id: bed.student_id, student_name: bed.student?.name },
      new_values: { status: "vacant", student_id: null },
      actor_id: tenantCtx.user_id,
    } as never,
  });

  return successResponse(
    { bed_id: bedId, bed_number: bed.bed_number, room_number: bed.room.room_number, status: "vacant" },
    `Bed ${bed.bed_number} in room ${bed.room.room_number} vacated. Student ${bed.student?.name ?? "unknown"} deallocated.`,
  );
});
