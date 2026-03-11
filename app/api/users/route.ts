import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const available = searchParams.get('available');

    let sql = 'SELECT id, created_at, email, full_name, role, phone, status, working_hours, is_available_for_shift, last_login FROM users WHERE 1=1';
    const params: any[] = [];

    if (role) { sql += ` AND role = $${params.length + 1}`; params.push(role); }
    if (status) { sql += ` AND status = $${params.length + 1}`; params.push(status); }
    if (available !== null && available !== undefined) {
      sql += ` AND is_available_for_shift = $${params.length + 1}`;
      params.push(available === 'true');
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, full_name, role, phone } = body;

    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const defaultHours = {
      monday: '9am-5pm', tuesday: '9am-5pm', wednesday: '9am-5pm',
      thursday: '9am-5pm', friday: '9am-5pm', saturday: 'Off', sunday: 'Off',
    };

    const result = await query(`
      INSERT INTO users (email, password_hash, full_name, role, phone, working_hours)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at, email, full_name, role, phone, status, working_hours, is_available_for_shift
    `, [email, passwordHash, full_name, role, phone || null, JSON.stringify(defaultHours)]);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, full_name, role, phone, status, working_hours, is_available_for_shift } = body;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const result = await query(`
      UPDATE users
      SET email = COALESCE($1, email),
          full_name = COALESCE($2, full_name),
          role = COALESCE($3, role),
          phone = COALESCE($4, phone),
          status = COALESCE($5, status),
          working_hours = COALESCE($6, working_hours),
          is_available_for_shift = COALESCE($7, is_available_for_shift)
      WHERE id = $8
      RETURNING id, created_at, email, full_name, role, phone, status, working_hours, is_available_for_shift
    `, [email, full_name, role, phone, status, working_hours ? JSON.stringify(working_hours) : null, is_available_for_shift, id]);

    if (result.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await query('DELETE FROM users WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
