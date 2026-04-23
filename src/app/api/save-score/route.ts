import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { raw_input, parsed_activities, total_score, breakdown } = await req.json();

    // Get user profile for org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'Organization not set' }, { status: 400 });
    }

    // Generate suggestions using Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an Indian eco-advisor. Respond ONLY with a valid JSON OBJECT containing a single key 'tips' that holds an array of 3 string tips based on the CO2 footprint data. Example format: { \"tips\": [\"Take the metro today instead of cab\", \"Use a reusable bag\", \"Turn off AC when not needed\"] }"
        },
        {
          role: "user",
          content: `My breakdown: ${JSON.stringify(breakdown)}.`
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    let jsonText = completion.choices[0]?.message?.content || '{"tips": ["Conserve energy", "Use public transport", "Reduce plastic waste"]}';
    
    let suggestions = [];
    try {
      const parsed = JSON.parse(jsonText);
      suggestions = parsed.tips ? parsed.tips : (Array.isArray(parsed) ? parsed : Object.values(parsed)[0]);
      
      // Fallback if formatting is weird
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        suggestions = ["Switch to local trains", "Avoid single-use plastics", "Turn off electronics when idle"];
      }
    } catch {
      suggestions = ["Use public transit", "Avoid plastics", "Save electricity"];
    }

    // Save to DB
    const { error: insertError } = await supabase.from('scores').insert({
      user_id: user.id,
      org_id: profile.org_id,
      raw_input,
      parsed_activities,
      total_score,
      breakdown,
      suggestions,
    });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true, suggestions, total_score });
  } catch (error) {
    console.error('Save Score API Error:', error);
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}
