/**
 * MadrashaOS — Swagger UI Route
 *
 * Phase B9.1 — OpenAPI 3.1 Spec Generation
 *
 * GET /api/docs — Interactive API documentation (Swagger UI)
 *
 * Serves a self-contained HTML page with Swagger UI that loads the
 * OpenAPI spec from /api/docs/spec. No external dependencies —
 * uses the unpkg CDN for swagger-ui-dist.
 */

import { openApiSpec } from "@/lib/openapi/spec";

export const dynamic = "force-dynamic";

export async function GET() {
  const specJson = JSON.stringify(openApiSpec, null, 2);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MadrashaOS API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
  <style>
    body { margin: 0; }
    .swagger-ui .topbar { background-color: #0E5C5C; }
    .swagger-ui .topbar .download-url-wrapper .download-url-button { background: #C9A961; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    const spec = ${specJson};
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        docExpansion: "list",
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
      });
    };
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
