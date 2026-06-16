const { Client } = require('pg');

async function checkPort(port, connectionUrl) {
  console.log(`\n--- Checking Port ${port} ---`);
  const client = new Client({ connectionString: connectionUrl });
  try {
    await client.connect();
    console.log(`✅ Connected successfully to ${connectionUrl}`);
    
    // Query organizations
    const orgRes = await client.query("SELECT id, name, slug FROM organizations");
    console.log("🏢 Organizations:", orgRes.rows);

    // Query properties count
    const propRes = await client.query("SELECT COUNT(*) as count FROM properties");
    console.log("🏠 Properties count:", propRes.rows[0].count);

    // Query contacts count
    const contactRes = await client.query("SELECT COUNT(*) as count FROM contacts");
    console.log("👥 Contacts count:", contactRes.rows[0].count);

  } catch (err) {
    console.log(`❌ Failed to connect/query on port ${port}:`, err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  await checkPort(5432, "postgresql://jojo_user:jojo_dev_password@localhost:5432/jojo_db");
  await checkPort(5433, "postgresql://postgres@localhost:5433/postgres");
}

main();
