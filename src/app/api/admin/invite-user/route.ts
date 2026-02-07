import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create admin client with service role key
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
    const { email, fullName, roles, isSuperAdmin } = body;

    if (!email || !fullName) {
      return NextResponse.json(
        { error: 'Email and full name are required' },
        { status: 400 }
      );
    }

    // Invite the user via Supabase Auth Admin API
    let { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName,
      },
      redirectTo: 'https://www.faraway-yachting.app/auth/setup-password',
    });

    // If email already exists, clean up the old user and retry
    if (authError) {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email);

      if (existingUser) {
        // Clean up app tables + auth user (same logic as delete-user route)
        await supabaseAdmin.from('user_module_roles').delete().eq('user_id', existingUser.id);
        await supabaseAdmin.from('user_company_access').delete().eq('user_id', existingUser.id);
        await supabaseAdmin.from('user_project_access').delete().eq('user_id', existingUser.id);
        await supabaseAdmin.from('user_profiles').delete().eq('id', existingUser.id);
        await supabaseAdmin.auth.admin.deleteUser(existingUser.id);

        // Retry invite
        const retry = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName },
          redirectTo: 'https://www.faraway-yachting.app/auth/setup-password',
        });
        authData = retry.data;
        authError = retry.error;
      }

      if (authError) {
        console.error('Auth error:', authError);
        return NextResponse.json(
          { error: authError.message },
          { status: 400 }
        );
      }
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Create or update user profile with super admin status and full name
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: userId,
        email: email,
        full_name: fullName,
        is_super_admin: isSuperAdmin || false,
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      // Don't fail the whole request, user was created
    }

    // Set module roles if provided
    if (roles && roles.length > 0) {
      const { error: rolesError } = await supabaseAdmin
        .from('user_module_roles')
        .insert(
          roles.map((r: { module: string; role: string }) => ({
            user_id: userId,
            module: r.module,
            role: r.role,
            is_active: true,
          }))
        );

      if (rolesError) {
        console.error('Roles insert error:', rolesError);
        // Don't fail the whole request, user was created
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: email,
        full_name: fullName,
      }
    });

  } catch (error) {
    console.error('Invite user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
