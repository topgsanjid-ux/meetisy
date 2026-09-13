import { NextResponse } from 'next/server';
import { registerUser, signToken, COOKIE_NAME } from '../../../../lib/auth';

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password, name, role, user_role } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const user = await registerUser({ email, password, name, role, user_role });
    const token = signToken(user);

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully.',
      user
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 3 // 3 days
    });

    return response;
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
