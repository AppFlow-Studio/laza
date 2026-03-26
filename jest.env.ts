// jest.env.ts
// This file runs before every test file.
// It loads your .env.test variables into process.env.
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });