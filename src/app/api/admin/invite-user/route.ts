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

    // If user already exists in auth, clean up first
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      await supabaseAdmin.from('user_module_roles').delete().eq('user_id', existingUser.id);
      await supabaseAdmin.from('user_company_access').delete().eq('user_id', existingUser.id);
      await supabaseAdmin.from('user_project_access').delete().eq('user_id', existingUser.id);
      await supabaseAdmin.from('user_profiles').delete().eq('id', existingUser.id);
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    }

    // Also clean up orphaned profile by email
    await supabaseAdmin.from('user_profiles').delete().eq('email', email);

    // Generate invite link (does not rely on Supabase email service)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { full_name: fullName },
        redirectTo: 'https://www.faraway-yachting.app/auth/setup-password',
      },
    });

    if (linkError) {
      console.error('Auth error:', linkError);
      return NextResponse.json(
        { error: linkError.message },
        { status: 400 }
      );
    }

    if (!linkData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const userId = linkData.user.id;

    // Build invite link using raw OTP token for direct client-side verification
    // This bypasses Supabase's /auth/v1/verify redirect endpoint which can fail with otp_expired
    const emailOtp = linkData.properties?.email_otp;
    const inviteLink = emailOtp
      ? `https://www.faraway-yachting.app/auth/setup-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(emailOtp)}`
      : linkData.properties?.action_link || null;

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
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: email,
        full_name: fullName,
      },
      inviteLink,
    });

  } catch (error) {
    console.error('Invite user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
