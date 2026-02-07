import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function buildInviteEmailHtml(fullName: string, inviteLink: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>You're Invited</title></head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #5A7A8F; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">Faraway Yachting</h1>
    </div>
    <div style="background-color: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
      <h2 style="color: #111827; margin: 0 0 16px; font-size: 18px;">You're Invited to Faraway Yachting</h2>
      <p style="color: #374151; margin: 0 0 12px;">Hello ${fullName},</p>
      <p style="color: #374151; margin: 0 0 20px;">You've been invited to join the Faraway Yachting management system. Click the button below to set your password and get started.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${inviteLink}" style="display: inline-block; padding: 12px 32px; background-color: #5A7A8F; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Set Your Password</a>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="color: #6b7280; font-size: 12px; word-break: break-all; margin: 8px 0 0;">${inviteLink}</p>
    </div>
    <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">Faraway Yachting Management System</p>
    </div>
  </div>
</body>
</html>`;
}

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

    // Send invite email via Resend (non-blocking — don't fail the invite if email fails)
    let emailSent = false;
    if (process.env.RESEND_API_KEY && inviteLink) {
      try {
        const emailHtml = buildInviteEmailHtml(fullName, inviteLink);
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Faraway Yachting <notifications@faraway-yachting.app>',
            to: [email],
            subject: "You're invited to Faraway Yachting",
            html: emailHtml,
          }),
        });
        emailSent = emailRes.ok;
        if (!emailRes.ok) {
          const errBody = await emailRes.text();
          console.error('Resend API error:', emailRes.status, errBody);
        }
      } catch (emailErr) {
        console.error('Failed to send invite email:', emailErr);
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
      emailSent,
    });

  } catch (error) {
    console.error('Invite user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
