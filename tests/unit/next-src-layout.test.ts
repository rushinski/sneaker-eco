import { existsSync } from "node:fs";
import { resolve } from "node:path";

describe("Next.js source layout", () => {
  it("keeps application discovery roots under src", () => {
    expect(existsSync(resolve("src/app/layout.tsx"))).toBe(true);
    expect(existsSync(resolve("src/proxy.ts"))).toBe(true);
    expect(existsSync(resolve("app"))).toBe(false);
    expect(existsSync(resolve("proxy.ts"))).toBe(false);
  });
});
