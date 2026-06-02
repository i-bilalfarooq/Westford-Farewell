import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get('ticket_id');

  if (!ticketId) {
    return new NextResponse('Missing ticket_id', { status: 400 });
  }

  try {
    const buffer = await QRCode.toBuffer(ticketId, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error('QR Generation Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
