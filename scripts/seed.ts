import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seed() {
  console.log('🌱 Starting seed...');

  // 1. Create Org
  const { data: org, error: orgError } = await supabase
    .from('orgs')
    .upsert({ name: 'AIT Pune', slug: 'ait-pune' }, { onConflict: 'slug' })
    .select()
    .single();

  if (orgError) {
    console.error('Error creating org:', orgError);
    return;
  }
  console.log('✅ Created/Found Org:', org.name);

  const orgId = org.id;

  // 2. Create 20 Fake Users
  console.log('👤 Creating 20 fake users...');
  const users = [];
  for (let i = 1; i <= 20; i++) {
    const email = `user${i}@example.com`;
    const password = 'password123';
    
    // Create user in Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        // Get existing user
        const { data: existingUser } = await supabase.rpc('get_user_id_by_email', { email_input: email });
        // Since we don't have this RPC, we'll try to find them in profiles or skip
        console.log(`User ${email} already exists, skipping auth creation.`);
        continue;
      }
      console.error(`Error creating auth user ${email}:`, authError);
      continue;
    }

    if (authData.user) {
      // Create profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        email,
        name: `User ${i}`,
        org_id: orgId
      });

      if (profileError) {
        console.error(`Error creating profile for ${email}:`, profileError);
      } else {
        users.push(authData.user.id);
      }
    }
  }

  // If users list is empty (because they already existed), we need to fetch them
  if (users.length === 0) {
    const { data: existingProfiles } = await supabase.from('profiles').select('id').eq('org_id', orgId);
    if (existingProfiles) {
      users.push(...existingProfiles.map(p => p.id));
    }
  }

  // 3. Create 7 days of score history per user
  console.log('📊 Creating score history (7 days per user)...');
  const scores = [];
  const now = new Date();

  for (const userId of users) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      
      const total_score = 5 + Math.random() * 20; // 5-25 kg CO2e
      const breakdown = {
        electricity: total_score * 0.4,
        car: total_score * 0.4,
        water: total_score * 0.2
      };
      const activities = [
        { type: 'electricity', quantity: breakdown.electricity / 0.82, unit: 'kWh', label: 'Electricity Usage', score: breakdown.electricity },
        { type: 'car', quantity: breakdown.car / 0.21, unit: 'km', label: 'Commute', score: breakdown.car },
        { type: 'water', quantity: breakdown.water / 0.0003, unit: 'L', label: 'Water Usage', score: breakdown.water }
      ];

      scores.push({
        user_id: userId,
        org_id: orgId,
        raw_input: "Automated seed data",
        parsed_activities: activities,
        total_score,
        breakdown,
        suggestions: ["Use public transport more", "Turn off lights when not in use", "Reduce water consumption"],
        created_at: date.toISOString()
      });
    }
  }

  const { error: scoreError } = await supabase.from('scores').insert(scores);
  if (scoreError) {
    console.error('Error inserting scores:', scoreError);
  } else {
    console.log(`✅ Inserted ${scores.length} score entries.`);
  }

  console.log('✨ Seed complete!');
}

seed();
