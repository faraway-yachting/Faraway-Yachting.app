import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await supabaseAdmin.from('user_module_roles').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_company_access').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_project_access').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_profiles').delete().eq('id', userId);

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Auth delete error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
