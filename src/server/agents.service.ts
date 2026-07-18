/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../db/index';
import { habits, routineEntries, triggers } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Initialize GoogleGenAI SDK on the server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const MODEL_NAME = 'gemini-3.5-flash';

// Database Actions (Tools) that agents can call
export async function get_user_profile(userId: number) {
  const userHabits = await db.select().from(habits).where(eq(habits.userId, userId));
  const userRoutines = await db.select().from(routineEntries).where(eq(routineEntries.userId, userId));
  const userTriggers = await db.select().from(triggers).where(eq(triggers.userId, userId));
  return {
    habits: userHabits,
    routines: userRoutines,
    triggers: userTriggers
  };
}

export async function add_habit(userId: number, name: string, frequency: string, episodeDescription: string, durationHistory: string) {
  const result = await db.insert(habits).values({
    userId,
    name,
    frequency,
    episodeDescription,
    durationHistory
  }).returning();
  return result[0];
}

export async function add_routine_entry(userId: number, timeBlock: string, activity: string, dayType: string) {
  const result = await db.insert(routineEntries).values({
    userId,
    timeBlock,
    activity,
    dayType
  }).returning();
  return result[0];
}

export async function add_trigger(userId: number, type: string, description: string, habitId?: number) {
  const result = await db.insert(triggers).values({
    userId,
    type,
    description,
    habitId: habitId || null
  }).returning();
  return result[0];
}

export async function delete_habit(userId: number, id: number) {
  await db.delete(habits).where(and(eq(habits.userId, userId), eq(habits.id, id)));
  // Clean up any triggers referencing this habit id
  await db.delete(triggers).where(and(eq(triggers.userId, userId), eq(triggers.habitId, id)));
  return { success: true };
}

/**
 * Multi-Agent System Graph Execution
 * Handles splitting combined habits (e.g. "using phone, and sleep schedule")
 * by executing a pipeline of specialized agents:
 * 1. Root Coordinator Agent (orchestrates and manages overall flow)
 * 2. Habit Extractor & Splitter Agent (extracts and structures split habits)
 * 3. Routine & Trigger Modeler Agent (designs routine entries and triggers for split habits)
 * 
 * It runs real-world database tools to update the user's setup.
 */
export async function runMultiAgentHabitSplitter(
  userId: number,
  combinedHabitId: number,
  additionalAnswer?: string
) {
  const steps: { agent: string; description: string; action: string; details?: any }[] = [];

  // Step 1: Root Coordinator assesses and retrieves current profile
  steps.push({
    agent: 'Root Coordinator Agent',
    description: 'Retrieving user profile and assessment context to locate combined habits.',
    action: 'Database Query: get_user_profile'
  });

  const profile = await get_user_profile(userId);
  const targetHabit = profile.habits.find(h => h.id === combinedHabitId);

  if (!targetHabit) {
    throw new Error('Target habit not found');
  }

  steps.push({
    agent: 'Root Coordinator Agent',
    description: `Found combined habit to split: "${targetHabit.name}". delegating to Habit Extractor & Splitter Agent.`,
    action: 'Process Delegation',
    details: { targetHabit }
  });

  // Step 2: Habit Extractor & Splitter Agent
  steps.push({
    agent: 'Habit Extractor & Splitter Agent',
    description: 'Analyzing combined habit name and optional user clarification to extract distinct habits.',
    action: 'LLM Reasoning & Split Analysis'
  });

  const splitPrompt = `You are the Habit Extractor & Splitter Agent.
Your job is to analyze a combined habit and split it into separate, distinct individual habits.
Combined Habit Name: "${targetHabit.name}"
Combined Habit Frequency: "${targetHabit.frequency}"
Combined Habit Episode Description: "${targetHabit.episodeDescription}"
Combined Habit Duration History: "${targetHabit.durationHistory}"
User's Additional Explanation: "${additionalAnswer || 'None provided'}"

You must split this combined habit into EXACTLY two distinct habits.
Generate the following details for each of the two split habits:
1. Name (clear, specific, e.g., "Late night phone usage", "Irregular sleep schedule")
2. Frequency (e.g., "Daily", "Weekly", "5 times a week")
3. Episode Description (describe what a typical episode look like for this specific habit)
4. Duration History (how long they have had this habit, e.g. "2 years")

Return a JSON object in the following format:
{
  "habits": [
    {
      "name": "string",
      "frequency": "string",
      "episodeDescription": "string",
      "durationHistory": "string"
    },
    {
      "name": "string",
      "frequency": "string",
      "episodeDescription": "string",
      "durationHistory": "string"
    }
  ]
}`;

  const splitResponse = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: splitPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          habits: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                frequency: { type: Type.STRING },
                episodeDescription: { type: Type.STRING },
                durationHistory: { type: Type.STRING }
              },
              required: ['name', 'frequency', 'episodeDescription', 'durationHistory']
            }
          }
        },
        required: ['habits']
      }
    }
  });

  const parsedSplit = JSON.parse(splitResponse.text || '{"habits":[]}');
  steps.push({
    agent: 'Habit Extractor & Splitter Agent',
    description: 'Extracted and structured two separate habits.',
    action: 'Data Formulated',
    details: parsedSplit
  });

  // Step 3: Routine & Trigger Modeler Agent
  steps.push({
    agent: 'Routine & Trigger Modeler Agent',
    description: 'Planning routine entries and triggers (time, context, emotion) specifically tailored for each new habit.',
    action: 'LLM Modeling & Generation'
  });

  const modelerPrompt = `You are the Routine & Trigger Modeler Agent.
Your job is to design daily routine entries and behavioral triggers for these newly split habits:
${JSON.stringify(parsedSplit.habits, null, 2)}

For each habit, design:
1. A Daily Routine Entry to help address or track it (e.g., timeBlock: "9 PM - 10 PM", activity: "Screen-free winding down", dayType: "all")
2. Two specific Triggers (e.g., type: "time", description: "10 PM in bed", or type: "emotion", description: "Feeling bored or restless")

Return a JSON object in the following format:
{
  "routines": [
    {
      "timeBlock": "string (e.g. 10 PM)",
      "activity": "string (e.g. Turn off phone)",
      "dayType": "string (weekday/weekend/all)"
    }
  ],
  "triggers": [
    {
      "type": "string (time/emotion/context/person)",
      "description": "string"
    }
  ]
}`;

  const modelerResponse = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: modelerPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          routines: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timeBlock: { type: Type.STRING },
                activity: { type: Type.STRING },
                dayType: { type: Type.STRING }
              },
              required: ['timeBlock', 'activity', 'dayType']
            }
          },
          triggers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ['type', 'description']
            }
          }
        },
        required: ['routines', 'triggers']
      }
    }
  });

  const parsedModeling = JSON.parse(modelerResponse.text || '{"routines":[],"triggers":[]}');
  steps.push({
    agent: 'Routine & Trigger Modeler Agent',
    description: 'Designed supporting routine blocks and habit triggers.',
    action: 'Data Formulated',
    details: parsedModeling
  });

  // Step 4: Data Synchronizer executing real database tools
  steps.push({
    agent: 'Root Coordinator Agent',
    description: 'Coordinating multi-agent changes. Triggering database tools to delete old combined habit and insert new items.',
    action: 'Tool Execution Phase'
  });

  // Deleting combined habit
  await delete_habit(userId, combinedHabitId);
  steps.push({
    agent: 'Root Coordinator Agent',
    description: `Database Tool executed: delete_habit on ID ${combinedHabitId}`,
    action: 'Database Deletion'
  });

  // Inserting new split habits
  const newHabitRecords: any[] = [];
  for (const h of parsedSplit.habits) {
    const record = await add_habit(userId, h.name, h.frequency, h.episodeDescription, h.durationHistory);
    newHabitRecords.push(record);
    steps.push({
      agent: 'Root Coordinator Agent',
      description: `Database Tool executed: add_habit for "${h.name}"`,
      action: 'Database Insertion',
      details: record
    });
  }

  // Inserting routine entries
  for (const r of parsedModeling.routines) {
    const record = await add_routine_entry(userId, r.timeBlock, r.activity, r.dayType);
    steps.push({
      agent: 'Root Coordinator Agent',
      description: `Database Tool executed: add_routine_entry for "${r.activity}"`,
      action: 'Database Insertion',
      details: record
    });
  }

  // Inserting triggers (referencing the newly inserted habits where applicable)
  for (let i = 0; i < parsedModeling.triggers.length; i++) {
    const t = parsedModeling.triggers[i];
    // Map trigger to one of the newly created habits if logical, alternating or matching
    const mappedHabitId = newHabitRecords[i % newHabitRecords.length]?.id;
    const record = await add_trigger(userId, t.type, t.description, mappedHabitId);
    steps.push({
      agent: 'Root Coordinator Agent',
      description: `Database Tool executed: add_trigger for "${t.description}"`,
      action: 'Database Insertion',
      details: record
    });
  }

  steps.push({
    agent: 'Root Coordinator Agent',
    description: 'Successfully completed multi-agent graph execution. Habits, routines, and triggers tables are fully updated.',
    action: 'Completed'
  });

  return {
    success: true,
    message: `Successfully split combined habit "${targetHabit.name}" into two detailed habits: "${parsedSplit.habits[0].name}" and "${parsedSplit.habits[1].name}". Corresponding routine entries and triggers were also designed and inserted.`,
    steps
  };
}
