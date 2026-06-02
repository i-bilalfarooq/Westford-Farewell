import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const verifyAuth = (request: Request) => {
  const authHeader = request.headers.get('authorization');
  const expectedPassword = process.env.ADMIN_PASSWORD;
  return (authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1] === expectedPassword);
};

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: setting, error } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'ticket_limit')
      .single();

    // Ignore row not found error (PGRST116)
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({ limit: setting?.value ? parseInt(setting.value) : 200 });
  } catch (error) {
    console.error('Settings API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const limit = parseInt(body.limit);

    if (isNaN(limit)) {
       return NextResponse.json({ error: 'Invalid limit' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('settings')
      .upsert({ key: 'ticket_limit', value: limit.toString() });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
