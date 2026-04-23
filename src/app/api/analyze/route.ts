import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { EMISSION_FACTORS, type ActivityType } from '@/lib/constants';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an eco-impact extraction engine. Extract activities from the user's description and return ONLY valid JSON. No explanation. Format:
{
  "activities": [
    { "type": "electricity"|"car"|"two_wheeler"|"bus"|"plastic_item"|"water", "quantity": number, "unit": string, "label": string }
  ]
}
If nothing relevant is found, return { "activities": [] }.

User description: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text().trim();
    
    // Clean up potentially markdown-wrapped JSON
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const data = JSON.parse(jsonText);
    const activities = data.activities || [];

    let total_score = 0;
    const breakdown: Record<string, number> = {};

    const processedActivities = activities.map((activity: any) => {
      const factor = EMISSION_FACTORS[activity.type as ActivityType] || 0;
      const score = activity.quantity * factor;
      total_score += score;
      breakdown[activity.type] = (breakdown[activity.type] || 0) + score;
      return { ...activity, score };
    });

    return NextResponse.json({
      activities: processedActivities,
      breakdown,
      total_score,
    });
  } catch (error) {
    console.error('Analyze API Error:', error);
    return NextResponse.json({ error: 'Failed to analyze text' }, { status: 500 });
  }
}
