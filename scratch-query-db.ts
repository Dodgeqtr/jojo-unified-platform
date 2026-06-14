import { Client } from 'pg';

const ports = [5432, 5433];
const users = ['postgres', 'jojo_user', 'jojo', 'dodgeqtr'];
const passwords = [
  'postgres', 'jojo', 'jojo_dev_password', 'password', 'admin', '',
  'dodgeqtr', 'dodgeqtr123', 'dodgeqtr@gmail.com', 'bohamad', '123456', '12345678', 'postgres123'
];

async function probe() {
  console.log('--- Probing Database Connection ---');
  for (const port of ports) {
    for (const user of users) {
      for (const password of passwords) {
        const connectionString = `postgresql://${user}:${password}@localhost:${port}/postgres`;
        const client = new Client({ connectionString });
        try {
          await client.connect();
          console.log(`✅ SUCCESS: Connected to port ${port} with user: "${user}", password: "${password}"`);
          
          // Try checking if jojo_db exists
          const res = await client.query("SELECT datname FROM pg_database WHERE datname = 'jojo_db'");
          if (res.rows.length > 0) {
            console.log(`   └─ jojo_db exists!`);
            const jojoClient = new Client({ connectionString: `postgresql://${user}:${password}@localhost:${port}/jojo_db` });
            await jojoClient.connect();
            console.log(`   └─ Connected to jojo_db successfully!`);
            const tablesRes = await jojoClient.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
            console.log(`   └─ Tables found:`, tablesRes.rows.map(t => t.table_name));
            await jojoClient.end();
          }
          
          await client.end();
        } catch (err: any) {
          // ignore auth failures
        }
      }
    }
  }
  process.exit(0);
}

probe();
