import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { EMISSION_FACTORS, type ActivityType } from '@/lib/constants';

/** Heuristic: user described avoiding single-use plastic, not buying it (LLMs often still emit plastic_item). */
function suggestsAvoidedDisposablePlastic(log: string): boolean {
  const t = log.toLowerCase();
  if (!/\b(bottle|bottles|plastic)\b/.test(t)) return false;

  if (/\binstead\s+of\s+buying\b/.test(t)) return true;
  if (/\brather\s+than\s+buying\b/.test(t)) return true;
  if (/\bdid\s+not\s+buy\b/.test(t) || /\bdidn'?t\s+buy\b/.test(t)) return true;
  if (/\bavoid(ed|ing)?\s+(buying\s+)?(plastic|bottle)/.test(t)) return true;
  if (/\bno(t)?\s+plastic\s+bottles?\b/.test(t)) return true;
  if (/\b(reusable|own)\b/.test(t) && /\b(water\s+)?bottle\b/.test(t) && /\binstead\s+of\b/.test(t))
    return true;
  if (/\bbrought\s+my\s+own\b/.test(t) && /\b(bottle|plastic)\b/.test(t)) return true;

  return false;
}

function stripMisclassifiedPlasticItems(
  log: string,
  activities: { type?: string; quantity?: number; unit?: string; label?: string }[]
) {
  if (!suggestsAvoidedDisposablePlastic(log)) return activities;
  return activities.filter((a) => a.type !== 'plastic_item');
}

interface RawActivity {
  type: string;
  quantity: number;
  unit: string;
  label: string;
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      console.error('Missing GROQ_API_KEY environment variable');
      return NextResponse.json({ error: 'Server configuration missing Groq API Key. Add GROQ_API_KEY to your .env file.' }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `You are an eco-impact extraction engine. Extract activities from the user's description and return ONLY valid JSON. No explanation. 
Format:
{
  "activities": [
    { "type": "electricity"|"car"|"two_wheeler"|"bus"|"plastic_item"|"water", "quantity": number, "unit": string, "label": string }
  ]
}
If nothing relevant is found, return { "activities": [] }.

Rules:
- Only include emissions the user actually caused that day (travel taken, energy used, disposable items they bought or used).
- NEVER use "plastic_item" when the user says they used a reusable/own bottle OR they avoided plastic (phrases like "instead of buying", "rather than buying", "didn't buy", "brought my own bottle"). Example: "bought my own water bottle instead of buying 2 plastic bottles" → bus + any real installs only; ZERO plastic_item rows (they did not purchase disposable bottles).
- Use "plastic_item" ONLY when they clearly purchased or consumed disposable plastic (e.g. "I bought two plastic water bottles").

Base the extraction on an Indian living context.
User description: "${text}"`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    let jsonText = chatCompletion.choices[0]?.message?.content || "";
    
    jsonText = jsonText.trim();
    if (jsonText.startsWith('```json')) jsonText = jsonText.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (jsonText.startsWith('```')) jsonText = jsonText.replace(/^```/, '').replace(/```$/, '').trim();

    const data = JSON.parse(jsonText);
    const rawActivities = (data.activities || []) as RawActivity[];
    const activities = stripMisclassifiedPlasticItems(text, rawActivities);

    let total_score = 0;
    const breakdown: Record<string, number> = {};

    const processedActivities = activities.map((activity) => {
      const factor = EMISSION_FACTORS[activity.type as ActivityType] || 0;
      const qty = typeof activity.quantity === 'number' ? activity.quantity : Number(activity.quantity) || 0;
      const score = qty * factor;
      total_score += score;
      breakdown[activity.type] = (breakdown[activity.type] || 0) + score;
      return {
        type: activity.type,
        quantity: qty,
        unit: activity.unit ?? '',
        label: activity.label ?? '',
        score,
      };
    });

    return NextResponse.json({
      activities: processedActivities,
      total_score,
      breakdown
    });

  } catch (error) {
    console.error('Analyze API Error:', error);
    return NextResponse.json({ error: 'Failed to analyze text' }, { status: 500 });
  }
}
