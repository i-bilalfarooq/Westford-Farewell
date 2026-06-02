import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    // Process payment_intent.status.updated
    if (payload.event === 'payment_intent.status.updated') {
      const paymentIntentId = payload.data?.id;
      
      if (!paymentIntentId) {
        return NextResponse.json({ error: 'Missing payment intent ID' }, { status: 400 });
      }

      // Verify directly with Ziina API to prevent spoofing
      const ziinaApiKey = process.env.ZIINA_API_KEY;
      const verifyResponse = await fetch(`https://api-v2.ziina.com/api/payment_intent/${paymentIntentId}`, {
        headers: {
          'Authorization': `Bearer ${ziinaApiKey}`
        }
      });

      if (!verifyResponse.ok) {
        return NextResponse.json({ error: 'Failed to verify with Ziina' }, { status: 400 });
      }

      const intentData = await verifyResponse.json();

      
      if (intentData.status === 'completed') {
        const paymentIntentId = intentData.id;

        // 1. Update ticket in Supabase
        const { data: ticketData, error: updateError } = await supabaseAdmin
          .from('tickets')
          .update({ payment_status: 'completed' })
          .eq('ziina_payment_intent_id', paymentIntentId)
          .select('id, name, email')
          .single();

        if (updateError || !ticketData) {
          console.error('Failed to update ticket or ticket not found:', updateError);
          return NextResponse.json({ error: 'Ticket not found or update failed' }, { status: 500 });
        }

        // 2. Generate Base URL for QR Image
        const host = request.headers.get('host');
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;
        const ticketId = ticketData.id;
        const qrCodeImageUrl = `${baseUrl}/api/qr?ticket_id=${ticketId}`;

        // 3. Send Email via Nodemailer
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        try {
          await transporter.sendMail({
            from: '"Farewell Team" <' + process.env.GMAIL_USER + '>', 
            to: ticketData.email,
            subject: 'Your Ticket - University Farewell',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
                <h1 style="color: #4f46e5;">University Farewell</h1>
                <p style="font-size: 16px;">Hi ${ticketData.name},</p>
                <p style="font-size: 16px;">Your payment was successful! Here is your ticket.</p>
                <p style="font-size: 14px; color: #666;">Please present this QR code at the entrance.</p>
                
                <div style="margin: 30px 0; padding: 20px; border: 2px dashed #ccc; border-radius: 10px; display: inline-block;">
                  <img src="${qrCodeImageUrl}" alt="Ticket QR Code" style="width: 250px; height: 250px;" />
                </div>
                
                <p style="font-size: 12px; color: #999;">Ticket ID: ${ticketId}</p>
              </div>
            `
          });
          console.log(`Ticket ${ticketId} processed and emailed successfully via standard Gmail.`);
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
