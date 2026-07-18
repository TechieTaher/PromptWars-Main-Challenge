/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { Request, Response, NextFunction } from 'express';
import {join} from 'node:path';
import { requireAuth, AuthRequest } from './middleware/auth';
import { db } from './db/index';
import { checkIns, habits, triggers, routineEntries, plans, nudges, coachMessages, motivationProfiles, dynamicQAs } from './db/schema';
import { generateInitialPlan, generateNudge, generateCoachReply, revisePlan, generateDeepDiveQuestions } from './server/gemini.service';
import { runMultiAgentHabitSplitter, autoAnalyzeAndRefineProfile } from './server/agents.service';
import { eq, desc, and, or, isNull } from 'drizzle-orm';
import { z } from 'zod';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json());
const angularApp = new AngularNodeAppEngine();

// Validate middleware factory
function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({ error: "Invalid request data", details: error });
    }
  };
}

const checkInSchema = z.object({
  habitId: z.number(),
  date: z.string(),
  slipped: z.boolean(),
  cravingIntensity: z.number().min(1).max(5),
  mood: z.string(),
  note: z.string().optional(),
});

app.post('/api/checkins', requireAuth, validate(checkInSchema), async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const userId = req.dbUser.id;
    const result = await db.insert(checkIns).values({
      userId,
      habitId: data.habitId,
      date: data.date,
      slipped: data.slipped,
      cravingIntensity: data.cravingIntensity,
      mood: data.mood,
      note: data.note,
    }).returning();

    // Check if we need to auto-revise the plan (every 5 check-ins)
    const countResult = await db.select().from(checkIns).where(eq(checkIns.userId, userId));
    if (countResult.length > 0 && countResult.length % 5 === 0) {
      // Trigger plan revision asynchronously
      revisePlan(userId).then(async (revision) => {
        const lastPlan = await db.select().from(plans).where(eq(plans.userId, userId)).orderBy(desc(plans.version)).limit(1);
        const nextVersion = (lastPlan[0]?.version || 0) + 1;
        await db.insert(plans).values({
          userId,
          version: nextVersion,
          content: revision.content,
          changeSummary: revision.changeSummary
        });
      }).catch(console.error);
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Failed to save checkin', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/checkins', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const history = await db.select().from(checkIns).where(eq(checkIns.userId, req.dbUser.id)).orderBy(desc(checkIns.createdAt));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const onboardingSchema = z.object({
  routine: z.array(z.object({
    timeBlock: z.string(),
    activity: z.string(),
    dayType: z.string()
  })),
  habits: z.array(z.object({
    name: z.string(),
    frequency: z.string(),
    episodeDescription: z.string(),
    durationHistory: z.string()
  })),
  triggers: z.array(z.object({
    type: z.string(),
    description: z.string()
  })),
  motivation: z.object({
    whyText: z.string(),
    pastAttemptsText: z.string(),
    successDefinition: z.string(),
    readinessScore: z.number().min(1).max(10)
  })
});

app.post('/api/onboarding/submit', requireAuth, validate(onboardingSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    const { routine, habits: habitsData, triggers: triggersData, motivation } = req.body;
    
    // Save routine
    for (const r of routine) {
      await db.insert(routineEntries).values({ ...r, userId });
    }
    // Save habits
    for (const h of habitsData) {
      await db.insert(habits).values({ ...h, userId });
    }
    // Save triggers
    for (const t of triggersData) {
      await db.insert(triggers).values({ ...t, userId });
    }
    // Save motivation
    await db.insert(motivationProfiles).values({ ...motivation, userId });

    // Generate initial plan
    const planContent = await generateInitialPlan(req.body);
    await db.insert(plans).values({
      userId,
      version: 1,
      content: planContent || 'Initial plan generation failed.',
      changeSummary: 'Initial Plan generated from onboarding.'
    });

    // Run background habit/routine refiner and splitter agent
    autoAnalyzeAndRefineProfile(userId, undefined, undefined, `Initial onboarding complete with payload: ${JSON.stringify(req.body)}`).then((agentRes) => {
      console.log('Background Onboarding Refinement Agent success:', agentRes);
    }).catch((agentErr) => {
      console.error('Background Onboarding Refinement Agent error:', agentErr);
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to submit onboarding', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/coach/message', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    const { message } = req.body;
    
    // Save user message
    await db.insert(coachMessages).values({ userId, role: 'user', message });
    
    const history = await db.select().from(coachMessages).where(eq(coachMessages.userId, userId)).orderBy(coachMessages.createdAt);
    
    // Generate reply
    const replyText = await generateCoachReply(userId, history, message);
    
    // Save model message
    const replyRecord = await db.insert(coachMessages).values({ userId, role: 'model', message: replyText || '' }).returning();

    // Run background habit/routine refiner and splitter agent based on conversation
    autoAnalyzeAndRefineProfile(userId, message, replyText).then((agentRes) => {
      console.log('Background Conversation Refinement Agent success:', agentRes);
    }).catch((agentErr) => {
      console.error('Background Conversation Refinement Agent error:', agentErr);
    });

    res.json(replyRecord[0]);
  } catch (error) {
    console.error('Failed coach message', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/coach/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const history = await db.select().from(coachMessages).where(eq(coachMessages.userId, req.dbUser.id)).orderBy(coachMessages.createdAt);
    res.json(history);
  } catch(error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/coach/clear', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    await db.delete(coachMessages).where(eq(coachMessages.userId, userId));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/agents/combined-habits', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    const userHabits = await db.select().from(habits).where(eq(habits.userId, userId));
    // Filter habits that contain "and", "or", or a comma ","
    const combined = userHabits.filter(h => 
      h.name.toLowerCase().includes('and') || 
      h.name.toLowerCase().includes('or') || 
      h.name.includes(',')
    );
    res.json(combined);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/agents/split-habit', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    const { habitId, additionalAnswer } = req.body;
    if (!habitId) {
      res.status(400).json({ error: 'habitId is required' });
      return;
    }
    const result = await runMultiAgentHabitSplitter(userId, Number(habitId), additionalAnswer);
    res.json(result);
  } catch (error) {
    console.error('Multi-agent split-habit failed:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

app.get('/api/habits', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userHabits = await db.select().from(habits).where(eq(habits.userId, req.dbUser.id));
    res.json(userHabits);
  } catch(error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/habits', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const result = await db.insert(habits).values({ ...data, userId: req.dbUser.id }).returning();
    res.json(result[0]);
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.delete('/api/habits/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const habitId = Number(req.params.id);
    const userId = req.dbUser.id;
    // 1. Delete associated triggers
    await db.delete(triggers).where(and(eq(triggers.userId, userId), eq(triggers.habitId, habitId)));
    // 2. Delete associated check-ins
    await db.delete(checkIns).where(and(eq(checkIns.userId, userId), eq(checkIns.habitId, habitId)));
    // 3. Delete the habit itself
    await db.delete(habits).where(and(eq(habits.userId, userId), eq(habits.id, habitId)));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/routine', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = await db.select().from(routineEntries).where(eq(routineEntries.userId, req.dbUser.id));
    res.json(data);
  } catch(error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/routine', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.insert(routineEntries).values({ ...req.body, userId: req.dbUser.id }).returning();
    res.json(result[0]);
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.delete('/api/routine/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await db.delete(routineEntries).where(eq(routineEntries.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/triggers', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = await db.select().from(triggers).where(eq(triggers.userId, req.dbUser.id));
    res.json(data);
  } catch(error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/triggers', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.insert(triggers).values({ ...req.body, userId: req.dbUser.id }).returning();
    res.json(result[0]);
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.delete('/api/triggers/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await db.delete(triggers).where(eq(triggers.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/nudges/generate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    const nudgeText = await generateNudge(userId);
    const nudge = await db.insert(nudges).values({ userId, content: nudgeText || '' }).returning();
    res.json(nudge[0]);
  } catch (error) {
    console.error('Generate nudge failed', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/nudges', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const activeNudges = await db.select().from(nudges)
      .where(and(
        eq(nudges.userId, req.dbUser.id),
        or(eq(nudges.dismissed, false), isNull(nudges.dismissed))
      ))
      .orderBy(desc(nudges.generatedAt))
      .limit(5);
    res.json(activeNudges);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/nudges/:id/dismiss', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const nudgeId = Number(req.params.id);
    await db.update(nudges)
      .set({ dismissed: true })
      .where(and(eq(nudges.id, nudgeId), eq(nudges.userId, req.dbUser.id)));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/plans', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userPlans = await db.select().from(plans).where(eq(plans.userId, req.dbUser.id)).orderBy(desc(plans.version));
    res.json(userPlans);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/deep-dive', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const qas = await db.select().from(dynamicQAs).where(eq(dynamicQAs.userId, req.dbUser.id)).orderBy(dynamicQAs.createdAt);
    res.json(qas);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/deep-dive/generate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    const userHabits = await db.select().from(habits).where(eq(habits.userId, userId));
    const userRoutine = await db.select().from(routineEntries).where(eq(routineEntries.userId, userId));
    const userTriggers = await db.select().from(triggers).where(eq(triggers.userId, userId));
    const previousQAs = await db.select().from(dynamicQAs).where(eq(dynamicQAs.userId, userId));
    
    const context = { habits: userHabits, routine: userRoutine, triggers: userTriggers };
    const questions = await generateDeepDiveQuestions(userId, previousQAs, context);
    
    for (const q of questions) {
      await db.insert(dynamicQAs).values({ userId, question: q });
    }
    
    res.json({ success: true, count: questions.length });
  } catch (error) {
    console.error('Failed to generate deep dive', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/deep-dive/:id/answer', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    const qaId = Number(req.params.id);
    const { answer } = req.body;
    
    // Fetch question for context
    const qaRecords = await db.select().from(dynamicQAs).where(eq(dynamicQAs.id, qaId));
    
    await db.update(dynamicQAs).set({ answer }).where(eq(dynamicQAs.id, qaId));

    if (qaRecords.length > 0) {
      const question = qaRecords[0].question;
      // Background agentic analysis based on deep-dive question/answer
      autoAnalyzeAndRefineProfile(userId, undefined, undefined, `Deep-dive Question: "${question}"\nUser Answer: "${answer}"`).then((agentRes) => {
        console.log('Background Deep-Dive Refinement Agent success:', agentRes);
      }).catch((agentErr) => {
        console.error('Background Deep-Dive Refinement Agent error:', agentErr);
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
