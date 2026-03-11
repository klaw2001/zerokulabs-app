import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const leadResult = await query(`
      SELECT l.*, c.messages, c.lead_data, c.status as conv_status
      FROM leads l
      LEFT JOIN conversations c ON c.id = l.conversation_id
      WHERE l.id = $1
    `, [id]);

    if (leadResult.rows.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const callsResult = await query(`
      SELECT * FROM vapi_calls WHERE lead_id = $1 ORDER BY created_at DESC
    `, [id]);

    return NextResponse.json({
      lead: leadResult.rows[0],
      calls: callsResult.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
