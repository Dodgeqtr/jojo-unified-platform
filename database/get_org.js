const { Client } = require('pg');
const c = new Client(process.env.DATABASE_URL);
c.connect()
  .then(() => c.query('SELECT id, name, slug FROM organizations'))
  .then((r) => {
    console.log(JSON.stringify(r.rows));
    return c.end();
  })
  .catch((e) => {
    console.error(e);
    c.end();
  });
