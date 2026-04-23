import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

    // Generate suggestions using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const suggestionPrompt = `Based on this eco-impact breakdown (kg CO2e): ${JSON.stringify(breakdown)}.
    Provide 3 specific actionable tips for the Indian context to reduce this impact.
    Return ONLY a JSON array of 3 strings. No explanation.`;

    const result = await model.generateContent(suggestionPrompt);
    const response = await result.response;
    let jsonText = response.text().trim();
    
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const suggestions = JSON.parse(jsonText);

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
