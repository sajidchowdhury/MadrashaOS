import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * MadrashaOS — Custom ESLint rule: madrasha/no-raw-tokens
 *
 * Phase C7.2 · Task 7-b · Part 3
 *
 * Warns on raw hex colors (e.g. `#0E5C5C`) and raw px values (e.g.
 * `12px`) inside JSX `className` attributes. Component code MUST
 * consume the FROZEN design tokens via Tailwind utilities
 * (`bg-primary-500`, `p-4`, `text-display`, `shadow-elevation-2`, …)
 * instead. See `docs/DESIGN_QA_CONTRACT.md` QA-01 + QA-02.
 *
 * Excludes:
 *   - src/styles/tokens.css         (the token definitions)
 *   - src/lib/pdf/templates/**       (PDF templates need raw hex for
 *                                     @react-pdf/renderer StyleSheet)
 *   - src/lib/design-system/tokens.ts (TS token constants mirror)
 *   - src/lib/pdf/brand.ts           (PDF brand palette)
 *
 * The rule is "warn" so it surfaces in `bun run lint` output without
 * failing the build. The strict binary gate is `bun run qa:design`
 * (scripts/design-qa.ts), which exits 1 on any violation.
 */
const madrashaNoRawTokensRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow raw hex colors and raw px values in JSX className attributes — use FROZEN design tokens instead.",
      url: "https://github.com/sajidchowdhury/MadrashaOS/blob/main/docs/DESIGN_QA_CONTRACT.md",
    },
    schema: [],
    messages: {
      rawHex:
        'Raw hex color "{{value}}" in className — use a FROZEN color token instead (bg-primary-500, text-accent, etc.). See docs/DESIGN_QA_CONTRACT.md QA-01.',
      rawPx:
        'Raw px value "{{value}}" in className — use a FROZEN spacing/radius token instead (p-4, gap-2, rounded-lg, etc.). See docs/DESIGN_QA_CONTRACT.md QA-02.',
    },
  },
  create(context) {
    const filename = context.filename ?? "";

    // Skip the FROZEN token source files.
    if (
      filename.includes("/src/styles/") ||
      filename.includes("/src/lib/design-system/") ||
      filename.includes("/src/lib/pdf/templates/") ||
      filename.includes("/src/lib/pdf/brand.ts") ||
      filename.includes("\\src\\styles\\") ||
      filename.includes("\\src\\lib\\design-system\\") ||
      filename.includes("\\src\\lib\\pdf\\templates\\") ||
      filename.includes("\\src\\lib\\pdf\\brand.ts")
    ) {
      return {};
    }

    const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
    const PX_RE = /\b\d+(?:\.\d+)?px\b/g;

    /**
     * Scan a string literal for raw hex / raw px and report.
     */
    function scanString(value, node) {
      if (typeof value !== "string") return;
      HEX_RE.lastIndex = 0;
      let m;
      while ((m = HEX_RE.exec(value)) !== null) {
        context.report({
          node,
          messageId: "rawHex",
          data: { value: m[0] },
        });
      }
      PX_RE.lastIndex = 0;
      while ((m = PX_RE.exec(value)) !== null) {
        context.report({
          node,
          messageId: "rawPx",
          data: { value: m[0] },
        });
      }
    }

    return {
      // <Component className="…">
      JSXAttribute(node) {
        if (!node.name || node.name.name !== "className") return;
        const valueNode = node.value;
        if (!valueNode) return;

        // className="…"
        if (valueNode.type === "Literal" && typeof valueNode.value === "string") {
          scanString(valueNode.value, valueNode);
          return;
        }

        // className={"…"}  /  className={clsx("…", "…")}
        if (valueNode.type === "JSXExpressionContainer") {
          const expr = valueNode.expression;
          if (!expr) return;
          if (expr.type === "Literal" && typeof expr.value === "string") {
            scanString(expr.value, expr);
            return;
          }
          if (expr.type === "TemplateLiteral") {
            for (const quasi of expr.quasis) {
              scanString(quasi.value.raw, quasi);
            }
            // Also scan expressions inside ${} that are themselves string
            // literals (rare but possible).
            for (const ex of expr.expressions) {
              if (ex.type === "Literal" && typeof ex.value === "string") {
                scanString(ex.value, ex);
              }
            }
            return;
          }
          // clsx("…", "…")  /  cn("…", "…")
          if (
            (expr.type === "CallExpression" || expr.type === "NewExpression") &&
            expr.arguments
          ) {
            for (const arg of expr.arguments) {
              if (arg.type === "Literal" && typeof arg.value === "string") {
                scanString(arg.value, arg);
              } else if (arg.type === "TemplateLiteral") {
                for (const quasi of arg.quasis) {
                  scanString(quasi.value.raw, quasi);
                }
              }
            }
          }
        }
      },
    };
  },
};

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  plugins: {
    madrasha: {
      rules: {
        "no-raw-tokens": madrashaNoRawTokensRule,
      },
    },
  },
  rules: {
    // TypeScript rules
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/prefer-as-const": "off",
    "@typescript-eslint/no-unused-disable-directive": "off",
    
    // React rules
    "react-hooks/exhaustive-deps": "off",
    "react-hooks/purity": "off",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",
    
    // Next.js rules
    "@next/next/no-img-element": "off",
    "@next/next/no-html-link-for-pages": "off",
    
    // MadrashaOS design-token rules (Phase C7.2 · Task 7-b)
    "madrasha/no-raw-tokens": "warn",
    
    // General JavaScript rules
    "prefer-const": "off",
    "no-unused-vars": "off",
    "no-console": "off",
    "no-debugger": "off",
    "no-empty": "off",
    "no-irregular-whitespace": "off",
    "no-case-declarations": "off",
    "no-fallthrough": "off",
    "no-mixed-spaces-and-tabs": "off",
    "no-redeclare": "off",
    "no-undef": "off",
    "no-unreachable": "off",
    "no-useless-escape": "off",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills", "app/**"],
}];

export default eslintConfig;
