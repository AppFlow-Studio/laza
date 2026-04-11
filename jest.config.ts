import type { Config } from "jest";

const config: Config = {
	preset: "ts-jest",                // use ts-jest so TypeScript works out of the box
	testEnvironment: "node",          // not a browser — we're hitting a real database
	testMatch: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
	setupFiles: ["<rootDir>/jest.env.ts"],  // load env variables before tests run
	testTimeout: 30000,               // 30 seconds — Supabase network calls need time
	verbose: true,                    // show each test name as it runs
	moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
    },
};

export default config;