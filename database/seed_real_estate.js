const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://jojo_user:jojo_dev_password@localhost:5432/jojo_db';

async function seed() {
  console.log('🌱 Starting Real Estate Database Seeding...');
  console.log(`Connection URL: ${DATABASE_URL}`);
  
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    console.log('✅ Connected to database.');

    // 1. Get Organization (Jojo Main)
    const orgRes = await client.query("SELECT id FROM organizations WHERE slug = 'jojo-main' LIMIT 1");
    if (orgRes.rows.length === 0) {
      console.error('❌ Organization "jojo-main" not found. Please run migrations first.');
      process.exit(1);
    }
    const orgId = orgRes.rows[0].id;
    console.log(`🏢 Found Organization ID: ${orgId}`);

    // 2. Get Users (Admin/User)
    const userRes = await client.query("SELECT id, email FROM users LIMIT 2");
    if (userRes.rows.length === 0) {
      console.error('❌ Users not found. Please run migrations first.');
      process.exit(1);
    }
    const adminUser = userRes.rows.find(u => u.email === 'admin@jojo.local') || userRes.rows[0];
    const normalUser = userRes.rows[1] || adminUser;
    console.log(`👤 Admin User ID: ${adminUser.id}, normal user ID: ${normalUser.id}`);

    // 3. Clear existing properties and contacts (optional/soft)
    await client.query("DELETE FROM properties WHERE org_id = $1", [orgId]);
    await client.query("DELETE FROM contacts WHERE org_id = $1", [orgId]);
    console.log('🗑️  Cleared old properties and contacts.');

    // 4. Seed Contacts (Clients)
    const contacts = [
      {
        org_id: orgId,
        first_name: 'جاسم',
        last_name: 'الكواري',
        email: 'jassim.alkwari@example.qa',
        phone: '+974 5550 1122',
        company: 'شركة قطر العقارية',
        position: 'مدير تنفيذي',
        contact_type: 'buyer',
        source: 'referral',
        classification: 'hot',
        preferred_type: 'villa',
        preferred_location: 'اللؤلؤة، الدوحة',
        budget_min: 3000000,
        budget_max: 6000000,
        assigned_to: adminUser.id,
      },
      {
        org_id: orgId,
        first_name: 'فاطمة',
        last_name: 'المهندي',
        email: 'fatima.almohannadi@example.qa',
        phone: '+974 6661 2233',
        company: 'مستثمر مستقل',
        position: 'مستثمر',
        contact_type: 'buyer',
        source: 'website',
        classification: 'warm',
        preferred_type: 'apartment',
        preferred_location: 'لوسيل، الدوحة',
        budget_min: 1500000,
        budget_max: 3000000,
        assigned_to: normalUser.id,
      },
      {
        org_id: orgId,
        first_name: 'خالد',
        last_name: 'البنعلي',
        email: 'khaled.albanali@example.qa',
        phone: '+974 7772 3344',
        company: 'بنك الدوحة',
        position: 'مستشار مالي',
        contact_type: 'tenant',
        source: 'instagram',
        classification: 'cold',
        preferred_type: 'apartment',
        preferred_location: 'السد، الدوحة',
        budget_min: 8000,
        budget_max: 15000,
        assigned_to: adminUser.id,
      },
      {
        org_id: orgId,
        first_name: 'حمد',
        last_name: 'ال ثاني',
        email: 'hamad.althani@example.qa',
        phone: '+974 3334 5566',
        company: 'الديوان العقاري',
        position: 'مالك عقار',
        contact_type: 'seller',
        source: 'partner',
        classification: 'hot',
        assigned_to: adminUser.id,
      }
    ];

    for (const c of contacts) {
      await client.query(
        `INSERT INTO contacts (
          org_id, first_name, last_name, email, phone, company, position, 
          contact_type, source, classification, preferred_type, preferred_location, 
          budget_min, budget_max, assigned_to
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          c.org_id, c.first_name, c.last_name, c.email, c.phone, c.company, c.position,
          c.contact_type, c.source, c.classification, c.preferred_type, c.preferred_location,
          c.budget_min, c.budget_max, c.assigned_to
        ]
      );
    }
    console.log(`👥 Seeded ${contacts.length} Contacts successfully.`);

    // 5. Seed Properties
    const properties = [
      {
        org_id: orgId,
        name: 'فيلا فاخرة مطلة على البحر',
        location: 'حي اللؤلؤة، الدوحة، قطر',
        property_type: 'فيلا',
        address: 'شارع رقم 12، بورتو أرابيا',
        city: 'الدوحة',
        country: 'قطر',
        size_sqm: 450.00,
        bedrooms: 5,
        bathrooms: 6,
        price: 5200000.00,
        currency: 'QAR',
        status: 'متاح',
        agent_id: adminUser.id,
        latitude: 25.3713,
        longitude: 51.5492,
      },
      {
        org_id: orgId,
        name: 'شقة عصرية في أبراج لوسيل',
        location: 'مدينة لوسيل، قطر',
        property_type: 'شقة',
        address: 'برج المارينا، الطابق 15',
        city: 'لوسيل',
        country: 'قطر',
        size_sqm: 180.50,
        bedrooms: 3,
        bathrooms: 3,
        price: 2400000.00,
        currency: 'QAR',
        status: 'متاح',
        agent_id: normalUser.id,
        latitude: 25.3908,
        longitude: 51.5239,
      },
      {
        org_id: orgId,
        name: 'مكتب تجاري مجهز بالكامل',
        location: 'الخليج الغربي، الدوحة',
        property_type: 'مكتب',
        address: 'برج السلام، منطقة الأبراج',
        city: 'الدوحة',
        country: 'قطر',
        size_sqm: 220.00,
        bedrooms: 0,
        bathrooms: 2,
        price: 18000.00,
        currency: 'QAR',
        status: 'مؤجر',
        agent_id: adminUser.id,
        latitude: 25.3256,
        longitude: 51.5312,
      },
      {
        org_id: orgId,
        name: 'بنتهاوس فاخر مع مسبح خاص',
        location: 'جزيرة جيوان، قطر',
        property_type: 'شقة',
        address: 'مشروع كريستال ريزيدنس',
        city: 'الدوحة',
        country: 'قطر',
        size_sqm: 320.00,
        bedrooms: 4,
        bathrooms: 5,
        price: 3900000.00,
        currency: 'QAR',
        status: 'متاح',
        agent_id: adminUser.id,
        latitude: 25.3789,
        longitude: 51.5401,
      }
    ];

    for (const p of properties) {
      await client.query(
        `INSERT INTO properties (
          org_id, name, location, property_type, address, city, country,
          size_sqm, bedrooms, bathrooms, price, currency, status, agent_id,
          latitude, longitude
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          p.org_id, p.name, p.location, p.property_type, p.address, p.city, p.country,
          p.size_sqm, p.bedrooms, p.bathrooms, p.price, p.currency, p.status, p.agent_id,
          p.latitude, p.longitude
        ]
      );
    }
    console.log(`🏠 Seeded ${properties.length} Properties successfully.`);
    console.log('🚀 Seeding complete!');

  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await client.end();
  }
}

seed();
