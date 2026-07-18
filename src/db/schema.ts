import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const routineEntries = pgTable('routine_entries', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  timeBlock: text('time_block').notNull(),
  activity: text('activity').notNull(),
  dayType: text('day_type').notNull(), // 'weekday' | 'weekend'
});

export const habits = pgTable('habits', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  frequency: text('frequency').notNull(),
  episodeDescription: text('episode_description').notNull(),
  durationHistory: text('duration_history').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const triggers = pgTable('triggers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  habitId: integer('habit_id').references(() => habits.id), // nullable
  type: text('type').notNull(), // 'time' | 'emotion' | 'place' | 'person'
  description: text('description').notNull(),
});

export const motivationProfiles = pgTable('motivation_profile', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  whyText: text('why_text').notNull(),
  pastAttemptsText: text('past_attempts_text').notNull(),
  successDefinition: text('success_definition').notNull(),
  readinessScore: integer('readiness_score').notNull(), // 1-10
});

export const checkIns = pgTable('check_ins', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  habitId: integer('habit_id').references(() => habits.id).notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  slipped: boolean('slipped').notNull(),
  cravingIntensity: integer('craving_intensity').notNull(), // 1-5
  mood: text('mood').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const coachMessages = pgTable('coach_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  role: text('role').notNull(), // 'user' | 'model' (or coach)
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const nudges = pgTable('nudges', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  generatedAt: timestamp('generated_at').defaultNow(),
  dismissed: boolean('dismissed').default(false),
  feedback: text('feedback'), // 'helpful' | 'not_helpful' | null
});

export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  version: integer('version').notNull(),
  content: text('content').notNull(),
  changeSummary: text('change_summary'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  routineEntries: many(routineEntries),
  habits: many(habits),
  triggers: many(triggers),
  motivationProfile: one(motivationProfiles),
  checkIns: many(checkIns),
  coachMessages: many(coachMessages),
  nudges: many(nudges),
  plans: many(plans),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, { fields: [habits.userId], references: [users.id] }),
  triggers: many(triggers),
  checkIns: many(checkIns),
}));
