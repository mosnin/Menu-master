/**
 * Demo Setup Script
 *
 * Creates a demo organization with sample users and transactions.
 * Run with: pnpm db:demo
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Set these in your .env file or export them before running.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
  console.log('Setting up demo data...\n');

  // Create organization
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .upsert({ name: 'Realty Partners Group' }, { onConflict: 'name' })
    .select()
    .single();

  if (orgErr) {
    console.error('Failed to create organization:', orgErr.message);
    process.exit(1);
  }
  console.log(`Organization: ${org.name} (${org.id})`);

  // Create user profiles
  const users = [
    { auth0_user_id: 'auth0|demo_broker_admin', email: 'broker@example.com', full_name: 'Sarah Mitchell' },
    { auth0_user_id: 'auth0|demo_agent', email: 'agent@example.com', full_name: 'Michael Torres' },
    { auth0_user_id: 'auth0|demo_coordinator', email: 'coordinator@example.com', full_name: 'Emily Chen' },
  ];

  for (const user of users) {
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .upsert(user, { onConflict: 'auth0_user_id' })
      .select()
      .single();

    if (profileErr) {
      console.error(`Failed to create user ${user.email}:`, profileErr.message);
      continue;
    }
    console.log(`User: ${profile.full_name} (${profile.email})`);

    // Create membership
    const role = user.auth0_user_id.includes('broker') ? 'broker_admin'
      : user.auth0_user_id.includes('agent') ? 'agent'
      : 'coordinator';

    await supabase.from('memberships').upsert(
      { organization_id: org.id, user_profile_id: profile.id, role },
      { onConflict: 'organization_id,user_profile_id' }
    );
    console.log(`  Role: ${role}`);
  }

  // Create a sample transaction
  const { data: agentProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth0_user_id', 'auth0|demo_agent')
    .single();

  if (agentProfile) {
    const { data: property } = await supabase
      .from('properties')
      .insert({
        organization_id: org.id,
        address_line_1: '1425 Larimer Street',
        city: 'Denver',
        state: 'CO',
        postal_code: '80202',
      })
      .select()
      .single();

    if (property) {
      const { data: txn } = await supabase
        .from('transactions')
        .insert({
          organization_id: org.id,
          title: '1425 Larimer St - Smith/Johnson Purchase',
          status: 'active',
          property_id: property.id,
          created_by_user_id: agentProfile.id,
        })
        .select()
        .single();

      if (txn) {
        console.log(`\nTransaction: ${txn.title} (${txn.id})`);

        // Add default checklist items
        const items = [
          'Deposit earnest money',
          'Schedule inspection',
          'Review disclosures',
          'Secure financing',
          'Appraisal completed',
          'Final walkthrough',
          'Confirm title and escrow items',
          'Closing preparation',
        ];

        for (const title of items) {
          await supabase.from('checklist_items').insert({
            transaction_id: txn.id,
            title,
            status: 'pending',
            source: 'template',
            requires_review: false,
          });
        }
        console.log(`  Added ${items.length} checklist items`);
      }
    }
  }

  console.log('\nDemo setup complete!');
  console.log('\nTo sign in, configure Auth0 and map your user to one of the demo auth0_user_ids.');
}

setup().catch(console.error);
