import bcrypt from 'bcryptjs';
import { query } from '../lib/db';

async function seed() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('admin123', 10);

  await query(`
    INSERT INTO users (email, password_hash, full_name, role, phone, working_hours)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (email) DO NOTHING
  `, [
    'admin@zerokulabs.com',
    passwordHash,
    'Admin User',
    'admin',
    '+1234567890',
    JSON.stringify({
      monday: '9am-5pm',
      tuesday: '9am-5pm',
      wednesday: '9am-5pm',
      thursday: '9am-5pm',
      friday: '9am-5pm',
      saturday: 'Off',
      sunday: 'Off',
    }),
  ]);

  console.log('Seed complete! Admin: admin@zerokulabs.com / admin123');
  process.exit(0);
}

seed().catch(console.error);
