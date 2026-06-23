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

  const prompt = `You are an elite Chief of Staff AI. Break down the following goal into 4-7 actionable milestones.

Goal: "${goal}"
${description ? `Additional context: "${description}"` : ''}
Deadline: ${deadlineDate.toDateString()} (${totalDays} days from today)

Return a JSON object with this exact structure:
{
  "milestones": [
    {
      "title": "Short milestone title (max 8 words)",
      "description": "Clear, actionable description of what needs to be done (1-2 sentences)",
      "daysFromStart": <number: when this milestone should be completed, from 0 to ${totalDays}>,
      "priority": "high" | "medium" | "low",
      "suggestions": ["Quick actionable tip 1", "Quick actionable tip 2"]
    }
  ],
  "overview": "2-3 sentence strategic overview of the plan",
  "urgencyLevel": "critical" | "high" | "moderate" | "relaxed"
}

Rules:
- Milestones must be chronologically ordered by daysFromStart
- First milestone daysFromStart should be 0-3
- Last milestone daysFromStart should be ${totalDays - 1} or ${totalDays}
- Make milestones specific, measurable, and achievable
- Match urgency to the timeline pressure`;

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
