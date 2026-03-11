import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    // Create base tables (conversations + leads) if they don't exist yet
    await query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP DEFAULT NOW(),
        messages JSONB NOT NULL DEFAULT '[]',
        lead_data JSONB,
        score INTEGER,
        status TEXT DEFAULT 'in_progress',
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        cost_usd NUMERIC(10,6) DEFAULT 0
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES conversations(id),
        created_at TIMESTAMP DEFAULT NOW(),
        name TEXT,
        email TEXT,
        phone TEXT,
        company TEXT,
        project_description TEXT,
        inquiry_type TEXT,
        timeline TEXT,
        score INTEGER,
        sent_to_crm BOOLEAN DEFAULT FALSE
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS vapi_calls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID REFERENCES leads(id),
        vapi_call_id TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        phone_number TEXT,
        call_status TEXT,
        call_duration INTEGER,
        recording_url TEXT,
        transcript TEXT,
        intent_verified BOOLEAN DEFAULT FALSE,
        intent_notes TEXT,
        cost_usd NUMERIC(10,6),
        transferred_to_human BOOLEAN DEFAULT FALSE,
        call_metadata JSONB
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP DEFAULT NOW(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        phone TEXT,
        status TEXT DEFAULT 'active',
        working_hours JSONB,
        is_available_for_shift BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMP DEFAULT NOW(),
        name TEXT,
        email TEXT,
        phone TEXT,
        message TEXT,
        source TEXT,
        status TEXT DEFAULT 'new',
        assigned_to UUID REFERENCES users(id),
        notes TEXT
      )
    `);

    try {
      await query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT`);
    } catch {}

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
        monday: '9am-5pm', tuesday: '9am-5pm', wednesday: '9am-5pm',
        thursday: '9am-5pm', friday: '9am-5pm', saturday: 'Off', sunday: 'Off',
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Database setup complete. Admin: admin@zerokulabs.com / admin123' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
