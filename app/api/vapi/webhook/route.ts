import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    const { message } = event;

    if (!message) return NextResponse.json({ received: true });

    const { type, call } = message;

    if (!call?.id) return NextResponse.json({ received: true });

    switch (type) {
      case 'call-started':
      case 'status-update':
        await query(`
          UPDATE vapi_calls
          SET call_status = $1, call_metadata = $2
          WHERE vapi_call_id = $3
        `, [call.status || 'in-progress', JSON.stringify(call), call.id]);
        break;

      case 'end-of-call-report':
        await query(`
          UPDATE vapi_calls
          SET
            call_status = $1,
            call_duration = $2,
            transcript = $3,
            recording_url = $4,
            cost_usd = $5,
            call_metadata = $6,
            transferred_to_human = $7
          WHERE vapi_call_id = $8
        `, [
          call.status || 'ended',
          call.duration || null,
          call.transcript || null,
          call.recordingUrl || null,
          call.cost || null,
          JSON.stringify(call),
          call.forwardedPhoneNumber ? true : false,
          call.id,
        ]);
        break;

      case 'transcript':
        if (message.transcript) {
          await query(`
            UPDATE vapi_calls
            SET transcript = $1
            WHERE vapi_call_id = $2
          `, [message.transcript, call.id]);
        }
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
