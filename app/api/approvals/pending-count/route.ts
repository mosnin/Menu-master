import { NextResponse } from 'next/server';
import { auth0, getCurrentUserProfile } from '@/lib/auth/session';
import { supabase } from '@/lib/db/client';

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session) {
      return NextResponse.json({ count: 0 }, { status: 401 });
    }

    const profile = await getCurrentUserProfile();
    const orgId = profile?.memberships?.[0]?.organization_id;
    if (!orgId) {
      return NextResponse.json({ count: 0 });
    }

    const { count, error } = await supabase
      .from('approvals')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'pending');

    if (error) {
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
