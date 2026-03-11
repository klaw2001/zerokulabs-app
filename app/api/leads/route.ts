import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inquiryType = searchParams.get('inquiry_type');
    const minScore = searchParams.get('min_score');
    const maxScore = searchParams.get('max_score');
    const callStatus = searchParams.get('call_status');
    const intentVerified = searchParams.get('intent_verified');

    let sql = `
      SELECT
        l.*,
        vc.id as vapi_call_db_id,
        vc.vapi_call_id,
        vc.call_status,
        vc.call_duration,
        vc.recording_url,
        vc.transcript,
        vc.intent_verified,
        vc.intent_notes,
        vc.cost_usd,
        vc.transferred_to_human,
        vc.call_metadata
      FROM leads l
      LEFT JOIN vapi_calls vc ON vc.lead_id = l.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (inquiryType) { sql += ` AND l.inquiry_type = $${params.length + 1}`; params.push(inquiryType); }
    if (minScore) { sql += ` AND l.score >= $${params.length + 1}`; params.push(parseInt(minScore)); }
    if (maxScore) { sql += ` AND l.score <= $${params.length + 1}`; params.push(parseInt(maxScore)); }
    if (callStatus) { sql += ` AND vc.call_status = $${params.length + 1}`; params.push(callStatus); }
    if (intentVerified !== null && intentVerified !== undefined) {
      sql += ` AND vc.intent_verified = $${params.length + 1}`;
      params.push(intentVerified === 'true');
    }

    sql += ' ORDER BY l.created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
