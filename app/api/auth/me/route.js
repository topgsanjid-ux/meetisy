import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, user: null, authenticated: false }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
