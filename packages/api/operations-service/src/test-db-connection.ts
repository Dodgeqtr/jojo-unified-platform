import { configDotenv } from "dotenv";
configDotenv();

import { query } from "../../shared/core/db";

async function test() {
  console.log("DATABASE_URL in env:", process.env.DATABASE_URL);
  try {
    const res = await query("SELECT COUNT(*) as count FROM properties");
    console.log("Query success! Properties count:", res[0]);
    const details = await query("SELECT id, name, org_id FROM properties");
    console.log("Properties details:", details);
    const orgs = await query("SELECT id, name FROM organizations");
    console.log("Organizations:", orgs);
  } catch (err: any) {
    console.error("Database query failed:", err.message);
  }
}

test();
