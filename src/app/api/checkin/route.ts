import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== expectedPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketId } = await request.json();

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // Query ticket
    const { data: ticket, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select('id, payment_status, is_checked_in, ziina_payment_intent_id')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticket) {
      return NextResponse.json({ error: 'Invalid Ticket' }, { status: 404 });
    }

    let currentStatus = ticket.payment_status;

    // Real-time local sync fallback: If status is still pending, check Ziina directly
    if (currentStatus === 'pending' && ticket.ziina_payment_intent_id) {
      try {
        const ziinaApiKey = process.env.ZIINA_API_KEY;
        const ziinaRes = await fetch(`https://api-v2.ziina.com/api/payment_intent/${ticket.ziina_payment_intent_id}`, {
          headers: { 'Authorization': `Bearer ${ziinaApiKey}` }
        });
        
        if (ziinaRes.ok) {
          const ziinaData = await ziinaRes.json();
          if (ziinaData.status === 'completed') {
            await supabaseAdmin.from('tickets').update({ payment_status: 'completed' }).eq('id', ticketId);
            currentStatus = 'completed';
          }
        }
      } catch (err) {
        console.error("Failed to sync with Ziina directly", err);
      }
    }

    if (currentStatus !== 'completed') {
      return NextResponse.json({ error: 'Ticket not paid' }, { status: 400 });
    }

    if (ticket.is_checked_in) {
      return NextResponse.json({ error: 'Already Scanned' }, { status: 400 });
    }

    // Mark as checked in
    const { error: updateError } = await supabaseAdmin
      .from('tickets')
      .update({ is_checked_in: true })
      .eq('id', ticketId);

    if (updateError) {
      console.error('Update Check-in Error:', updateError);
      return NextResponse.json({ error: 'Failed to update check-in status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Access Granted' });
  } catch (error) {
    console.error('Check-in Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
