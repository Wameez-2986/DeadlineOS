import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

interface MilestoneRaw {
  title: string;
  description: string;
  daysFromStart: number;
  priority: 'high' | 'medium' | 'low';
  suggestions: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'generate-milestones') {
      return handleGenerateMilestones(body);
    } else if (action === 'chat-advisor') {
      return handleChatAdvisor(body);
    } else if (action === 'predict-risk') {
      return handlePredictRisk(body);
    } else if (action === 'generate-auto-plan') {
      return handleGenerateAutoPlan(body);
    } else if (action === 'replan-schedule') {
      return handleReplanSchedule(body);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleGenerateMilestones(body: {
  goal: string;
  deadline: string;
  description?: string;
}) {
  const { goal, deadline, description } = body;

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    safetySettings,
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
  });

  const deadlineDate = new Date(deadline);
  const today = new Date();
  const totalDays = Math.max(1, Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));

  const prompt = `You are an elite Chief of Staff AI. Break down the following goal into a highly structured roadmap with milestones, subtasks, and weekly objectives.

Goal: "${goal}"
${description ? `Additional context: "${description}"` : ''}
Deadline: ${deadlineDate.toDateString()} (${totalDays} days / ${totalWeeks} weeks from today)

Return a JSON object with this exact structure:
{
  "difficultyLevel": "easy" | "medium" | "hard",
  "priorityLevel": "high" | "medium" | "low",
  "overview": "A 2-3 sentence strategic roadmap overview",
  "urgencyLevel": "critical" | "high" | "moderate" | "relaxed",
  "weeklyObjectives": [
    {
      "weekNumber": 1,
      "objective": "Objective for week 1 of the journey"
    }
  ],
  "milestones": [
    {
      "title": "Milestone title (max 8 words)",
      "description": "Clear, actionable description of milestone goal",
      "daysFromStart": <number: when this milestone should be completed, between 0 and ${totalDays}>,
      "priority": "high" | "medium" | "low",
      "difficulty": "easy" | "medium" | "hard",
      "suggestions": ["Quick actionable tip 1", "Quick actionable tip 2"],
      "subtasks": [
        {
          "title": "Actionable subtask title (max 10 words)"
        }
      ]
    }
  ]
}

Rules:
- Generate between 3 and 6 milestones.
- Ensure milestones are chronologically ordered by daysFromStart.
- For each milestone, provide 3-5 specific, granular, actionable subtasks.
- Generate weekly objectives for the timeline (up to ${totalWeeks} weeks; if timeline is long, group into key weekly targets, maximum 12 weeks).
- The estimated completion date for milestones/subtasks will be calculated based on daysFromStart; distribute daysFromStart realistically across the ${totalDays}-day timeline.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const parsed = JSON.parse(text);

  return NextResponse.json({ success: true, data: parsed });
}

async function handleChatAdvisor(body: {
  message: string;
  goal: string;
  deadline: string;
  milestones: Array<{ title: string; completed: boolean; daysFromStart: number }>;
  history: Array<{ role: 'user' | 'model'; text: string }>;
}) {
  const { message, goal, deadline, milestones, history } = body;

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    safetySettings,
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 400,
    },
  });

  const deadlineDate = new Date(deadline);
  const today = new Date();
  const daysLeft = Math.max(0, Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const completedCount = milestones.filter((m) => m.completed).length;
  const totalCount = milestones.length;

  const systemPrompt = `You are an elite Chief of Staff AI assistant — sharp, strategic, concise, and genuinely invested in the user's success. Your communication style: direct, warm, professional. You use strategic insight to motivate and unblock.

Current Goal: "${goal}"
Deadline: ${deadlineDate.toDateString()} (${daysLeft} days remaining)
Progress: ${completedCount}/${totalCount} milestones completed
Milestones: ${milestones.map((m) => `${m.completed ? '✓' : '○'} ${m.title}`).join(', ')}

Guidelines:
- Keep responses under 150 words unless detail is explicitly requested
- Be encouraging but honest about deadline pressure
- Give concrete, actionable advice
- Use "you" language — make it personal
- Avoid corporate jargon
- Format naturally — no excessive bullet points in casual conversation`;

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: "Understood. I'm your Chief of Staff — ready to help you hit this deadline. What's on your mind?" }] },
      ...history.map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
    ],
  });

  const result = await chat.sendMessage(message);
  const reply = result.response.text();

  return NextResponse.json({ success: true, reply });
}

async function handlePredictRisk(body: {
  goal: string;
  deadline: string;
  description?: string;
  milestones: Array<{ title: string; completed: boolean; priority: 'high' | 'medium' | 'low'; difficulty?: 'easy' | 'medium' | 'hard' }>;
  weeklyObjectives?: Array<{ objective: string; completed: boolean }>;
  velocity: number;
}) {
  const { goal, deadline, description, milestones, weeklyObjectives, velocity } = body;

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    safetySettings,
    generationConfig: {
      temperature: 0.5,
      responseMimeType: 'application/json',
    },
  });

  const deadlineDate = new Date(deadline);
  const today = new Date();
  const daysLeft = Math.max(0, Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.completed).length;

  const totalWeekly = weeklyObjectives?.length ?? 0;
  const completedWeekly = weeklyObjectives?.filter(w => w.completed).length ?? 0;

  const prompt = `You are a financial-grade AI Risk Analyst specialized in project execution audits. Analyze the following goal and timeline metrics to predict the risk of missing the target deadline.

Goal: "${goal}"
${description ? `Description/Context: "${description}"` : ''}
Target Deadline: ${deadlineDate.toDateString()} (${daysLeft} days remaining)

Project Metrics:
- Milestones: ${completedMilestones} completed, ${totalMilestones - completedMilestones} pending.
- Milestone Details: ${JSON.stringify(milestones.map(m => ({ title: m.title, completed: m.completed, priority: m.priority })))}
- Weekly Objectives: ${completedWeekly} completed, ${totalWeekly - completedWeekly} pending.
- User Completion Velocity: ${velocity} tasks completed in the last 7 days.

Return a JSON object with this exact structure:
{
  "riskScore": <number: 0 to 100, where 0 is no risk and 100 is certain to miss the deadline>,
  "missProbability": <number: 0 to 100, representing the percentage probability of missing the deadline>,
  "reasoning": "A concise paragraph explaining your risk assessment, highlighting bottlenecks (e.g. low velocity vs remaining days, number of pending high-priority items, remaining objectives)",
  "recoveryPlan": [
    "Suggested concrete step 1 to de-risk the timeline",
    "Suggested concrete step 2 to de-risk the timeline",
    "Suggested concrete step 3 to de-risk the timeline"
  ]
}

Rules:
- Make the risk assessment realistic based on velocity and daysLeft. For example, if there are many pending high-priority tasks and velocity is 0, the risk score should be high.
- The reasoning should be professional, objective, and analytical (similar to a financial risk audit).`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text);

  return NextResponse.json({ success: true, data: parsed });
}

async function handleGenerateAutoPlan(body: {
  goal: string;
  deadline: string;
  description?: string;
  availableHoursPerDay: number;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    subtasks?: Array<{ id: string; title: string }>;
  }>;
}) {
  const { goal, deadline, description, availableHoursPerDay, milestones } = body;

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    safetySettings,
    generationConfig: {
      temperature: 0.5,
      responseMimeType: 'application/json',
    },
  });

  const deadlineDate = new Date(deadline);
  const today = new Date();
  const totalDays = Math.max(1, Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));

  const prompt = `You are an elite schedule optimization AI. Create a highly balanced daily and weekly study/work plan to achieve the following goal within the deadline constraint.

Goal: "${goal}"
${description ? `Description/Context: "${description}"` : ''}
Deadline Date: ${deadlineDate.toDateString()} (${totalDays} days / ${totalWeeks} weeks from today)
Maximum Work Hours Allowed Per Day: ${availableHoursPerDay} hours

Goal Milestones & Subtasks:
${JSON.stringify(milestones.map(m => ({
  id: m.id,
  title: m.title,
  priority: m.priority,
  subtasks: m.subtasks?.map(s => ({ id: s.id, title: s.title }))
})))}

Your task is to:
1. Estimate the duration (in hours) required for each subtask (e.g. 0.5, 1, 1.5, 2, 2.5 hours).
2. Schedule these subtasks as "work sessions" distributed across days between day offset 0 (today) and day offset ${totalDays}.
3. Balance the daily workload so that the sum of session durations on any single day does not exceed ${availableHoursPerDay} hours.
4. Distribute sessions evenly, prioritizing high-priority milestones earlier in the timeline.
5. Assign each session to a time slot segment: "morning" (9 AM - 12 PM), "afternoon" (12 PM - 5 PM), or "evening" (5 PM - 9 PM).
6. Create weekly focus summaries for the plan.

Return a JSON object with this exact structure:
{
  "weeklySummaries": [
    {
      "weekNumber": 1,
      "focusTitle": "Focus of week 1 (max 8 words)",
      "allocatedHours": <number: total scheduled hours in week 1>
    }
  ],
  "sessions": [
    {
      "id": "s_${Date.now()}_" + Math.random().toString(36).substring(2, 5),
      "title": "Clear action-focused session title derived from subtask",
      "durationHours": <number: estimated hours, e.g. 1.5>,
      "dayOffset": <number: day index where this session takes place, between 0 and ${totalDays}>,
      "timeSlot": "morning" | "afternoon" | "evening",
      "milestoneId": "<id of the matching milestone>",
      "completed": false
    }
  ]
}

Rules:
- Distribute sessions logically across the ${totalDays}-day range. Do not frontload everything on day 0.
- Daily sum of durationHours MUST be less than or equal to ${availableHoursPerDay}. If total work exceeds available time, focus on scheduling the most critical tasks first.
- The output must be strictly valid JSON.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text);

  // Normalize IDs to avoid literal templates returned by LLM
  if (parsed && Array.isArray(parsed.sessions)) {
    parsed.sessions = parsed.sessions.map((s: Record<string, unknown>, idx: number) => {
      const sessionId = typeof s.id === 'string' ? s.id : '';
      return {
        ...s,
        id: sessionId && !sessionId.includes('$') && !sessionId.includes('{') ? sessionId : `session_${Date.now()}_${idx}`
      };
    });
  }

  return NextResponse.json({ success: true, data: parsed });
}

async function handleReplanSchedule(body: {
  goal: string;
  deadline: string;
  description?: string;
  availableHoursPerDay: number;
  sessions: Array<{
    id: string;
    title: string;
    durationHours: number;
    dayStr: string;
    timeSlot: 'morning' | 'afternoon' | 'evening';
    completed: boolean;
    milestoneId?: string;
  }>;
  missedSessions: Array<{
    id: string;
    title: string;
    durationHours: number;
    dayStr: string;
    timeSlot: 'morning' | 'afternoon' | 'evening';
    completed: boolean;
    milestoneId?: string;
  }>;
}) {
  const { goal, deadline, description, availableHoursPerDay, sessions, missedSessions } = body;

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    safetySettings,
    generationConfig: {
      temperature: 0.5,
      responseMimeType: 'application/json',
    },
  });

  const deadlineDate = new Date(deadline);
  const today = new Date();
  const totalDays = Math.max(1, Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const prompt = `You are an elite schedule recovery and replanning AI.
The user has missed some scheduled work sessions. Your task is to automatically:
1. Detect and reschedule all missed work sessions to future dates starting from today (dayOffset 0).
2. Reprioritize tasks if future days would exceed the daily hour limit of ${availableHoursPerDay} hours.
3. If all sessions (future + rescheduled missed ones) cannot fit before the current deadline of ${deadlineDate.toDateString()} (in ${totalDays} days) under the available daily capacity, calculate a new recommended deadline as a day offset from today. Otherwise, keep the recommended deadline offset equal to the original deadline of ${totalDays} days from today.
4. Draft a clear explanation of "Why changes were made" (e.g. details of overload, bottleneck, how many hours were shifted).
5. Outline a concrete, actionable recovery plan.

Goal Context:
Goal Title: "${goal}"
${description ? `Description/Context: "${description}"` : ''}
Original Target Deadline: ${deadlineDate.toDateString()} (${totalDays} days from today)
Maximum Capacity: ${availableHoursPerDay} hours per day

Current Active Work Sessions:
${JSON.stringify(sessions)}

Missed Work Sessions (To Be Rescheduled):
${JSON.stringify(missedSessions)}

Return a JSON object with this exact structure:
{
  "updatedSessions": [
    {
      "id": "session_id (must match the original session id exactly)",
      "title": "session title",
      "durationHours": <number: estimated hours>,
      "dayOffset": <number: day index where this session takes place, starting from 0 (today) up to the proposed deadline offset>,
      "timeSlot": "morning" | "afternoon" | "evening",
      "completed": false,
      "milestoneId": "..."
    }
  ],
  "suggestedDeadlineOffset": <number: day offset from today representing the proposed deadline (should be equal to original ${totalDays} unless extension is necessary)>,
  "explanation": "A natural language explanation detailing: 1. Which tasks were missed, 2. How they were distributed to future slots, 3. Why the new distribution was chosen, 4. If the deadline was updated and why.",
  "recoveryPlan": [
    "Actionable recovery step 1 (e.g., 'Focus heavily on Morning blocks this week to clear backlog')",
    "Actionable recovery step 2",
    "Actionable recovery step 3"
  ]
}

Rules:
- You MUST preserve all future sessions that are not missed, but you can adjust their dayOffset and timeSlot to keep the schedule balanced.
- Keep the sum of sessions on any future day <= ${availableHoursPerDay} hours.
- If it is impossible to fit all work before the original deadline without exceeding the daily limit, extend the deadline (suggestedDeadlineOffset) by the minimum days required.
- The output must be strictly valid JSON.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text);

  return NextResponse.json({ success: true, data: parsed });
}
