import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, studentId, courseName, admin } = body;

    if (!name || !email || !phone || !studentId || !courseName || !admin) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Prepare Ziina Payment Intent Request
    const ziinaApiKey = process.env.ZIINA_API_KEY;
    if (!ziinaApiKey) {
      console.error("Missing ZIINA_API_KEY");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Get the base URL for the success/cancel redirects
    const host = request.headers.get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Generate Ticket ID upfront so we can pass it to the success URL
    const ticketId = crypto.randomUUID();

    // Make request to Ziina
    const ziinaResponse = await fetch('https://api-v2.ziina.com/api/payment_intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ziinaApiKey}`
      },
      body: JSON.stringify({
        amount: 3695, // 36.95 AED in base units
        currency_code: 'AED',
        success_url: `${baseUrl}/success?ticket_id=${ticketId}`,
        cancel_url: `${baseUrl}/`,
        test: false
      })
    });

    if (!ziinaResponse.ok) {
      const errorData = await ziinaResponse.text();
      console.error('Ziina API Error:', errorData);
      return NextResponse.json({ error: 'Failed to initialize payment gateway' }, { status: 502 });
    }

    const ziinaData = await ziinaResponse.json();
    const paymentIntentId = ziinaData.id;
    const redirectUrl = ziinaData.redirect_url;

    if (!paymentIntentId || !redirectUrl) {
      return NextResponse.json({ error: 'Invalid response from payment gateway' }, { status: 502 });
    }

    // Insert pending ticket into Supabase
    const { error: dbError } = await supabaseAdmin
      .from('tickets')
      .insert({
        id: ticketId,
        name,
        email,
        phone,
        student_id: studentId,
        course_name: courseName,
        admin,
        ziina_payment_intent_id: paymentIntentId,
        payment_status: 'pending'
      });

    if (dbError) {
      console.error('Database Error:', dbError);
      return NextResponse.json({ error: 'Failed to create ticket record' }, { status: 500 });
    }

    // Return the redirect URL to the frontend
    return NextResponse.json({ id: paymentIntentId, redirect_url: redirectUrl });

  } catch (error) {
    console.error('Checkout API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
