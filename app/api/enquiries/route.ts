import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assigned_to');

    let sql = `
      SELECT e.*, u.full_name as assigned_user_name
      FROM enquiries e
      LEFT JOIN users u ON u.id = e.assigned_to
      WHERE 1=1
    `;
    const params: any[] = [];

    if (source) { sql += ` AND e.source = $${params.length + 1}`; params.push(source); }
    if (status) { sql += ` AND e.status = $${params.length + 1}`; params.push(status); }
    if (assignedTo) { sql += ` AND e.assigned_to = $${params.length + 1}`; params.push(assignedTo); }

    sql += ' ORDER BY e.created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message, source } = body;

    const result = await query(`
      INSERT INTO enquiries (name, email, phone, message, source)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, email, phone, message, source || 'contact_form']);

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, assigned_to, notes } = body;

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const result = await query(`
      UPDATE enquiries
      SET
        status = COALESCE($1, status),
        assigned_to = COALESCE($2::uuid, assigned_to),
        notes = COALESCE($3, notes)
      WHERE id = $4
      RETURNING *
    `, [status, assigned_to || null, notes, id]);

    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
