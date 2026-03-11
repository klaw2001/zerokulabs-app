import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { intent_verified, intent_notes, transferred_to_human } = body;

    const result = await query(`
      UPDATE vapi_calls
      SET
        intent_verified = COALESCE($1, intent_verified),
        intent_notes = COALESCE($2, intent_notes),
        transferred_to_human = COALESCE($3, transferred_to_human)
      WHERE id = $4
      RETURNING *
    `, [intent_verified, intent_notes, transferred_to_human, id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
