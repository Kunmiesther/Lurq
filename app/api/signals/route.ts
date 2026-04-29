import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .eq('is_active', true)
    .order('detected_at', { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ signals: data });
}