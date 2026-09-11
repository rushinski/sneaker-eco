import nextJest from "next/jest.js";
import type { Config } from "jest";

const testEnvDefaults: Record<string, string> = {
  NEXT_PUBLIC_SITE_URL: "https://example.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  SUPABASE_SECRET_KEY: "test-secret-key",
  SUPABASE_DB_URL: "postgresql://user:pass@localhost:5432/testdb",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "test-upstash-token",
  ADMIN_SESSION_SECRET: "test-admin-session-secret",
  LIGHTSPEED_ACCESS_TOKEN: "reserved-access-token",
  LIGHTSPEED_DOMAIN_PREFIX: "reserved-domain",
};

for (const [key, value] of Object.entries(testEnvDefaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  displayName: "unit",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  testMatch: [
    "<rootDir>/tests/unit/**/*.test.ts",
    "<rootDir>/tests/unit/**/*.test.tsx",
    "<rootDir>/src/**/*.test.ts",
    "<rootDir>/src/**/*.test.tsx",
  ],
};

export default createJestConfig(config);
