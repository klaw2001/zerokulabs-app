import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Chatbot posts here when a conversation ends with lead data collected
// Expected payload:
// {
//   conversation_id?: string,       // if conversation already exists in DB
//   messages: [{role, content}],
//   lead_data: { name, email, phone, company, inquiry_type, timeline, project_description },
//   score: number,
//   input_tokens?: number,
//   output_tokens?: number,
//   cost_usd?: number
// }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, lead_data, score, input_tokens, output_tokens, cost_usd, conversation_id } = body;

    if (!messages || !lead_data) {
      return NextResponse.json({ error: 'messages and lead_data are required' }, { status: 400 });
    }

    let convId = conversation_id;

    // Create conversation record if not provided
    if (!convId) {
      const convResult = await query(`
        INSERT INTO conversations (messages, lead_data, score, status, input_tokens, output_tokens, cost_usd)
        VALUES ($1, $2, $3, 'completed', $4, $5, $6)
        RETURNING id
      `, [
        JSON.stringify(messages),
        JSON.stringify(lead_data),
        score || null,
        input_tokens || 0,
        output_tokens || 0,
        cost_usd || 0,
      ]);
      convId = convResult.rows[0].id;
    }

    // Create lead record
    const leadResult = await query(`
      INSERT INTO leads (
        conversation_id, name, email, phone, company,
        project_description, inquiry_type, timeline, score, sent_to_crm
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
      RETURNING id
    `, [
      convId,
      lead_data.name || null,
      lead_data.email || null,
      lead_data.phone || null,
      lead_data.company || null,
      lead_data.project_description || null,
      lead_data.inquiry_type || null,
      lead_data.timeline || null,
      score || null,
    ]);

    const leadId = leadResult.rows[0].id;

    return NextResponse.json({
      success: true,
      lead_id: leadId,
      conversation_id: convId,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Chatbot webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
