import { NextResponse } from 'next/server';
import { fetchUserGitContext } from '../../../../lib/integrations/git';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email') || '';

    const gitContext = await fetchUserGitContext(email);

    return NextResponse.json({
      success: true,
      git_context: gitContext
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
