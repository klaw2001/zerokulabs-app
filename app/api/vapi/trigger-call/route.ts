import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { leadId } = await request.json();
    if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 });

    const leadResult = await query('SELECT * FROM leads WHERE id = $1', [leadId]);
    if (leadResult.rows.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = leadResult.rows[0];

    if (!lead.phone) {
      return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 });
    }

    if (!process.env.VAPI_API_KEY || !process.env.VAPI_PHONE_NUMBER_ID) {
      return NextResponse.json({ error: 'VAPI not configured' }, { status: 500 });
    }

    const vapiResponse = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        customer: {
          number: lead.phone,
          name: lead.name || 'there',
        },
        assistantId: process.env.VAPI_ASSISTANT_ID,
        assistantOverrides: {
          variableValues: {
            name: lead.name || 'there',
            company: lead.company || '',
            inquiry_type: lead.inquiry_type || 'your inquiry',
            timeline: lead.timeline || '',
            project_description: lead.project_description || '',
          },
        },
        metadata: {
          leadId: lead.id,
          inquiryType: lead.inquiry_type,
          company: lead.company,
        },
      }),
    });

    if (!vapiResponse.ok) {
      const errText = await vapiResponse.text();
      return NextResponse.json({ error: `VAPI error: ${errText}` }, { status: 500 });
    }

    const vapiData = await vapiResponse.json();

    await query(`
      INSERT INTO vapi_calls (lead_id, vapi_call_id, phone_number, call_status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (vapi_call_id) DO NOTHING
    `, [leadId, vapiData.id, lead.phone, vapiData.status || 'queued']);

    return NextResponse.json({ success: true, callId: vapiData.id, status: vapiData.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
