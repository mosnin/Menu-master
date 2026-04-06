import { NextResponse } from 'next/server';
import { requireAuthWithProfile } from '@/lib/auth/session';

export async function GET() {
  try {
    const { session, profile } = await requireAuthWithProfile();

    return NextResponse.json({
      user: {
        sub: session.user.sub,
        email: session.user.email ?? null,
        name: session.user.name ?? null,
      },
      profile,
      memberships: profile.memberships ?? [],
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
