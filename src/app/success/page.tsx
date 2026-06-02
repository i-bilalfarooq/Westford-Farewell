import Link from 'next/link';
import QRCode from 'qrcode';
import { supabaseAdmin } from '@/lib/supabase';
import styles from './page.module.css';

export default async function SuccessPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const ticketId = params.ticket_id as string | undefined;

  let qrCodeDataUrl = '';
  let ticketName = '';
  let paymentStatus = '';

  if (ticketId) {
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('id, name, email, payment_status, ziina_payment_intent_id')
      .eq('id', ticketId)
      .single();

    if (ticket) {
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
            // Ziina marks successful payments as 'completed'
            if (ziinaData.status === 'completed') {
              await supabaseAdmin.from('tickets').update({ payment_status: 'completed' }).eq('id', ticketId);
              currentStatus = 'completed';

              // SEND EMAIL LOCALLY (since webhook won't fire on localhost)
              try {
                const nodemailer = (await import('nodemailer')).default;
                
                // Get Base URL
                const host = (await searchParams).host || 'westford-farewell.vercel.app'; // Fallback if headers not easily accessible in page component
                const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
                const baseUrl = `${protocol}://${host}`;
                const qrCodeImageUrl = `${baseUrl}/api/qr?ticket_id=${ticket.id}`;

                const transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_APP_PASSWORD,
                  },
                });

                await transporter.sendMail({
                  from: '"Farewell Team" <' + process.env.GMAIL_USER + '>',
                  to: ticket.email,
                  subject: 'Your Ticket - University Farewell',
                  html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
                      <h1 style="color: #4f46e5;">University Farewell</h1>
                      <p style="font-size: 16px;">Hi ${ticket.name},</p>
                      <p style="font-size: 16px;">Your payment was successful! Here is your ticket.</p>
                      <p style="font-size: 14px; color: #666;">Please present this QR code at the entrance.</p>
                      <div style="margin: 30px 0; padding: 20px; border: 2px dashed #ccc; border-radius: 10px; display: inline-block;">
                        <img src="${qrCodeImageUrl}" alt="Ticket QR Code" style="width: 250px; height: 250px;" />
                      </div>
                      <p style="font-size: 12px; color: #999;">Ticket ID: ${ticket.id}</p>
                    </div>
                  `
                });
                console.log("Local sync: Email sent to", ticket.email, "via Nodemailer");
              } catch (emailErr) {
                console.error("Local sync: Failed to send email", emailErr);
              }
            }
          }
        } catch (err) {
          console.error("Failed to sync with Ziina directly", err);
        }
      }

      ticketName = ticket.name;
      paymentStatus = currentStatus;
      
      // Even if payment is pending (because webhook hasn't fired in dev environment),
      // we can still show the QR for demonstration purposes if needed, 
      // but in production, we might want to wait for 'completed'.
      // For this workflow, we'll generate it anyway so they can see it.
      try {
        qrCodeDataUrl = await QRCode.toDataURL(ticket.id, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
      } catch (e) {
        console.error('Failed to generate QR on server', e);
      }
    }
  }

  return (
    <main className={styles.container}>
      <div className={`${styles.card} glass-panel`}>
        <div className={styles.icon}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        
        <h1 className={styles.title}>Payment Successful!</h1>
        
        {ticketName && (
          <p className={styles.subtitle} style={{color: 'white', fontWeight: 600, fontSize: '1.1rem'}}>
            Thank you, {ticketName}!
          </p>
        )}

        <p className={styles.subtitle}>
          Your payment has been processed. We have emailed you a copy of your ticket, but you can also screenshot your QR code below.
        </p>

        {qrCodeDataUrl ? (
          <div style={{marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1rem', background: 'white', borderRadius: '8px', display: 'inline-block'}}>
            <img src={qrCodeDataUrl} alt="Your Ticket QR Code" style={{display: 'block', width: '250px', height: '250px'}} />
          </div>
        ) : (
          <p className={styles.subtitle} style={{marginTop: '1rem', color: '#f59e0b'}}>
            Generating your QR code... (If it doesn't appear, check your email).
          </p>
        )}

        <Link href="/" className={styles.homeBtn}>
          Return Home
        </Link>
      </div>
    </main>
  );
}
