import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const EXCLUDED = new Set([
  "docs/superpowers/plans/2026-09-11-retired-integrations-removal.md",
  "docs/superpowers/specs/2026-09-11-retired-integrations-removal-design.md",
  "src/types/db/database.types.ts",
  "tests/unit/retired-integrations-structure.test.ts",
]);

const FORBIDDEN =
  /stripe|payrilla|lightspeed|@aws-sdk\/client-(?:sesv2?|ssm)|nodemailer|nofraud|here[_ -]?maps?|shippo|@vercel\/(?:analytics|speed-insights)|vercel-scripts|vercel telemetry|NEXT_TELEMETRY_DISABLED|VERCEL_ANALYTICS|VERCEL_SPEED_INSIGHTS|ziptax/i;

describe("retired integrations", () => {
  it("contains no retired integration references outside immutable history", () => {
    const files = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard"],
      { encoding: "utf8" },
    )
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((file) => !file.startsWith("supabase/migrations/"))
      .filter((file) => !EXCLUDED.has(file));

    const violations = files.flatMap((file) => {
      let source: string;
      try {
        source = readFileSync(file, "utf8");
      } catch {
        return [];
      }

      const normalized = source
        .replaceAll("LIGHTSPEED_ACCESS_TOKEN", "")
        .replaceAll("LIGHTSPEED_DOMAIN_PREFIX", "");

      return FORBIDDEN.test(normalized) ? [file] : [];
    });

    expect(violations).toEqual([]);
  });
});
