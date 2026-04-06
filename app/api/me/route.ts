import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { requireAuthWithProfile } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';

export async function GET() {
  const ip = (await headers()).get('x-forwarded-for') ?? 'unknown';
  const { success } = rateLimit(ip, 60, 60_000);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

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
