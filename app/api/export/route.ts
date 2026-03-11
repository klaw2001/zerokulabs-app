import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'leads';

    if (type === 'leads') {
      const result = await query(`
        SELECT
          l.id, l.created_at, l.name, l.email, l.phone, l.company,
          l.inquiry_type, l.timeline, l.score, l.project_description,
          vc.call_status, vc.call_duration, vc.intent_verified,
          vc.transcript, vc.cost_usd as call_cost
        FROM leads l
        LEFT JOIN vapi_calls vc ON vc.lead_id = l.id
        ORDER BY l.created_at DESC
      `);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(result.rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="zerokulabs-leads.xlsx"',
        },
      });
    }

    if (type === 'enquiries') {
      const result = await query(`
        SELECT e.*, u.full_name as assigned_to_name
        FROM enquiries e
        LEFT JOIN users u ON u.id = e.assigned_to
        ORDER BY e.created_at DESC
      `);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(result.rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Enquiries');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="zerokulabs-enquiries.xlsx"',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
