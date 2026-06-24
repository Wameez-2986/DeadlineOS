import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Goal, Milestone, ChatMessage } from '@/lib/types';
import { verifyAuth } from '@/lib/auth-server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { message, currentView, selectedGoalId, goals, history } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      safetySettings,
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const goalsContext = (goals || []).map((g: Goal) => ({
      id: g.id,
      title: g.title,
      deadline: g.deadline,
      milestonesCount: g.milestones?.length || 0,
      completedMilestonesCount: g.milestones?.filter((m: Milestone) => m.completed).length || 0,
    }));

    const systemPrompt = `You are an elite Chief of Staff AI Assistant named DeadlineOS.
You process text and voice inputs from the user to classify their intent, extract parameters, and reply.

Today is ${today.toDateString()} (ISO date: ${todayStr}).
The user is currently on the view: "${currentView || 'dashboard'}".
The currently selected goal ID is: "${selectedGoalId || 'none'}".
Active goals in the system:
${JSON.stringify(goalsContext)}

YOUR MISSION:
Classify the user's query into one of the following structured intents:
- OPEN_TASKS: User wants to navigate to or view tasks tracker/workspace.
- SHOW_DEADLINES: User wants to view upcoming deadlines/goals manager.
- SHOW_GOALS: User wants to see their goals manager.
- CREATE_GOAL: User wants to add/create a new goal.
- CREATE_STUDY_PLAN: User wants to build a new study plan.
- GENERATE_ROADMAP: User wants to create a project roadmap.
- COMPLETE_TASK: User wants to mark a task, subtask, or milestone as complete.
- MOVE_TASKS: User wants to reschedule tasks to tomorrow or another day.
- DELETE_TASK: User wants to delete a goal or task.
- SHOW_PROGRESS: User wants to see progress analytics.
- OPEN_DASHBOARD: User wants to go to workspace overview/home.
- SHOW_INSIGHTS: User wants to open risk analysis.
- SHOW_CALENDAR: User wants to view calendar.
- SHOW_NOTIFICATIONS: User wants to check notifications.
- CHAT: User is asking a general question, seeking motivation, or having a follow-up conversation that does not map to a single UI action.
- UNKNOWN: The intent is completely ambiguous or unrecognized.

MEMORY & CONTEXT HANDLING:
If the user's message is a follow-up (e.g. "make it shorter", "add more milestones", or "change the deadline to next week"), analyze the chat history. "It" or "this" refers to the previously discussed goal or plan. You must re-classify the request as CREATE_STUDY_PLAN / GENERATE_ROADMAP / CREATE_GOAL, and return the updated goal structure in the parameters!

OUTPUT FORMAT:
You MUST return a JSON object. Never return plain text or markdown wrappers outside the JSON.
Format:
{
  "intent": "VoiceIntent",
  "confidence": <number: confidence score between 0.0 and 1.0>,
  "reply": "A concise, warm, professional, action-oriented response explaining what was done or answering the user. Keep it under 60 words.",
  "params": {
    // Required only for CREATE_GOAL, CREATE_STUDY_PLAN, GENERATE_ROADMAP:
    "goalTitle": "Title of the goal/plan",
    "goalDescription": "A summary description",
    "deadline": "YYYY-MM-DD (Estimate a reasonable target date based on today's date ${todayStr}. For study plans, use 3-6 months. Projects, 1-3 months.)",
    "difficultyLevel": "easy" | "medium" | "hard",
    "priorityLevel": "high" | "medium" | "low",
    "overview": "A brief strategic roadmap overview",
    "urgencyLevel": "critical" | "high" | "moderate" | "relaxed",
    "milestones": [
      {
        "title": "Milestone title (max 8 words)",
        "description": "Clear description",
        "daysFromStart": <number: integer offset from day 0>,
        "priority": "high" | "medium" | "low",
        "difficulty": "easy" | "medium" | "hard",
        "suggestions": ["Tip 1", "Tip 2"],
        "subtasks": [
          { "title": "Subtask action title" }
        ]
      }
    ],
    "weeklyObjectives": [
      { "weekNumber": 1, "objective": "Weekly target" }
    ],
    // For other intents:
    "view": "goals" | "tasks" | "calendar" | "dashboard" | "ai" | "risk" | "planner" | "settings",
    "goalId": "if the user references a specific active goal or the selected one"
  }
}`;

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: "Understood. I will process inputs and output structured JSON matching your specifications." }] },
        ...(history || []).slice(-8).map((h: ChatMessage) => ({
          role: h.role,
          parts: [{ text: h.text }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();
    
    const parsed = JSON.parse(text);
    return NextResponse.json({ success: true, ...parsed });

  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
