/**
 * MadrashaOS — API Response Helpers
 *
 * Phase B3.1 — Standard JSON response helpers for all API routes.
 */

export function jsonResponse(data: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(data, { status, headers });
}

export function errorResponse(error: string, status = 400, details?: unknown): Response {
  return jsonResponse({ error, details }, status);
}

export function successResponse(data: unknown, message?: string): Response {
  return jsonResponse({ success: true, message, data });
}

export function paginatedResponse(data: unknown[], total: number, page: number, pageSize: number): Response {
  return jsonResponse({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

/** Parse pagination params from URL search params. */
export function parsePagination(url: URL): { page: number; pageSize: number; skip: number; take: number } {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}
