import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== expectedPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Admin API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
