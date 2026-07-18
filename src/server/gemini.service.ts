import { GoogleGenAI } from '@google/genai';
import { db } from '../db/index';
import { checkIns, triggers, plans } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = 'gemini-3.1-flash-lite';

export async function generateInitialPlan(answers: any) {
  const prompt = `You are an expert behavioral coach helping a user overcome harmful habits.
The user has completed an onboarding assessment.
Here are their answers:
${JSON.stringify(answers, null, 2)}

Please generate an initial coaching plan focusing on small, actionable steps.
Return the plan as a well-structured text document.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text;
}

export async function generateNudge(userId: number) {
  // Fetch user data for context
  const userTriggers = await db.select().from(triggers).where(eq(triggers.userId, userId));
  const recentCheckIns = await db.select().from(checkIns).where(eq(checkIns.userId, userId)).orderBy(desc(checkIns.createdAt)).limit(5);

  const prompt = `You are a supportive behavioral coach.
Based on the user's triggers: ${JSON.stringify(userTriggers)}
And their recent check-ins: ${JSON.stringify(recentCheckIns)}
Generate a short, encouraging 1-2 sentence nudge to help them stay on track right now.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text;
}

export async function generateCoachReply(userId: number, chatHistory: any[], userMessage: string) {
  // Fetch user data for context
  const userPlans = await db.select().from(plans).where(eq(plans.userId, userId)).orderBy(desc(plans.createdAt)).limit(1);
  const recentCheckIns = await db.select().from(checkIns).where(eq(checkIns.userId, userId)).orderBy(desc(checkIns.createdAt)).limit(10);
  
  // Tone escalation logic
  let toneInstruction = "Keep your tone calm, warm, and encouraging. Never shame the user.";
  let slips = 0;
  let risingCraving = false;
  if (recentCheckIns.length >= 3) {
    const last3 = recentCheckIns.slice(0, 3);
    slips = last3.filter(c => c.slipped).length;
    if (last3[0].cravingIntensity > last3[1].cravingIntensity && last3[1].cravingIntensity >= last3[2].cravingIntensity) {
      risingCraving = true;
    }
  }
  if (slips >= 2 || risingCraving) {
    toneInstruction = "The user has had multiple recent slips or rising cravings. Use a firmer, more directive tone. Focus on immediate pattern interruption and resetting their environment. Still, do not shame them.";
  }

  const prompt = `You are a behavioral coach.
Current Plan: ${JSON.stringify(userPlans[0]?.content || "No plan yet.")}
Recent Check-ins: ${JSON.stringify(recentCheckIns)}
Tone Instruction: ${toneInstruction}

Chat History:
${chatHistory.map(m => `${m.role}: ${m.message}`).join('\n')}
user: ${userMessage}

Respond to the user as the coach.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text;
}

export async function revisePlan(userId: number) {
  const currentPlan = await db.select().from(plans).where(eq(plans.userId, userId)).orderBy(desc(plans.createdAt)).limit(1);
  const recentCheckIns = await db.select().from(checkIns).where(eq(checkIns.userId, userId)).orderBy(desc(checkIns.createdAt)).limit(20);

  const prompt = `You are a behavioral coach revising a user's plan based on recent data.
Current Plan: ${JSON.stringify(currentPlan[0]?.content || "No plan yet.")}
Recent Check-ins: ${JSON.stringify(recentCheckIns)}

Please provide a revised plan, and a short summary of what changed and why.
Return JSON with { "content": "revised plan text", "changeSummary": "summary text" }`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });

  if (response.text) {
     return JSON.parse(response.text);
  }
  return { content: "", changeSummary: "" };
}
