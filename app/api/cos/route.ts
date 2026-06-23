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
