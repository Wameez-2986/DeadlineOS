import { AssistantAction } from './types';

export type VoiceIntent =
  | 'OPEN_TASKS'
  | 'SHOW_DEADLINES'
  | 'SHOW_GOALS'
  | 'CREATE_GOAL'
  | 'CREATE_STUDY_PLAN'
  | 'GENERATE_ROADMAP'
  | 'COMPLETE_TASK'
  | 'MOVE_TASKS'
  | 'DELETE_TASK'
  | 'SHOW_PROGRESS'
  | 'OPEN_DASHBOARD'
  | 'SHOW_INSIGHTS'
  | 'SHOW_CALENDAR'
  | 'SHOW_NOTIFICATIONS'
  | 'UNKNOWN'
  | 'CHAT';

export interface CommandAction {
  intent: VoiceIntent;
  confidence: number;
  params?: AssistantAction['params'];
  reply?: string;
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Pattern entry: regex, intent (can be string or function), extract params, reply (string or function)
type AliasPattern = {
  pattern: RegExp;
  intent: VoiceIntent | ((match: RegExpMatchArray) => VoiceIntent);
  extract?: (match: RegExpMatchArray) => AssistantAction['params'];
  reply?: string | ((match: RegExpMatchArray) => string);
};

const ALIAS_PATTERNS: AliasPattern[] = [
  // OPEN_TASKS
  {
    pattern: /^(open|show|view|list|display|my)\s*(tasks|task\s*list|task\s*tracker|task\s*workspace|tasks\s*workspace)$/i,
    intent: 'OPEN_TASKS',
    reply: 'Switching to your tasks view.'
  },
  // SHOW_DEADLINES
  {
    pattern: /^(show|view|open|my)\s*(deadlines|upcoming\s*deadlines|deadline\s*list)$/i,
    intent: 'SHOW_DEADLINES',
    reply: 'Opening your deadlines view.'
  },
  // SHOW_GOALS
  {
    pattern: /^(show|view|open|my)\s*(goals|goal\s*list|goals\s*manager)$/i,
    intent: 'SHOW_GOALS',
    reply: 'Navigating to goals manager.'
  },
  // OPEN_DASHBOARD
  {
    pattern: /^(open|go\s*to|show|display|navigate\s*to)\s*(dashboard|home|main\s*screen|workspace\s*overview)$/i,
    intent: 'OPEN_DASHBOARD',
    reply: 'Switching to your workspace overview.'
  },
  // SHOW_CALENDAR
  {
    pattern: /^(open|show|view)\s*(calendar|calendar\s*grid)$/i,
    intent: 'SHOW_CALENDAR',
    reply: 'Opening your calendar grid.'
  },
  // SHOW_INSIGHTS
  {
    pattern: /^(show|open|view)\s*(insights|risk\s*analysis|risk\s*dashboard|risk\s*metrics)$/i,
    intent: 'SHOW_INSIGHTS',
    reply: 'Opening risk analytics dashboard.'
  },
  // SHOW_PROGRESS
  {
    pattern: /^(show|view)\s*(progress|progress\s*metrics|progress\s*analytics)$/i,
    intent: 'SHOW_PROGRESS',
    reply: 'Showing your progress details.'
  },
  // MOVE_TASKS
  {
    pattern: /^(move|reschedule|push)\s*(tasks|task|today'?s\s*tasks|todays\s*tasks)\s*(to\s*tomorrow|to\s*next\s*day|forward)$/i,
    intent: 'MOVE_TASKS',
    reply: 'Rescheduling today\'s incomplete tasks to tomorrow.'
  },
  // DELETE_TASK (delete a goal or task)
  {
    pattern: /^(delete|remove)\s*(goal|task)\s*(?:(?:with\s*)?(?:id\s*)?([a-zA-Z0-9]+))?$/i,
    intent: 'DELETE_TASK',
    extract: (match) => {
      const id = match[3]?.trim() || undefined;
      return { goalId: id };
    },
    reply: (match) => {
      const id = match[3]?.trim() || 'the current goal';
      return `Deleting goal${id ? ` with id ${id}` : ''}.`
    }
  },
  // COMPLETE_TASK – can be milestone or subtask; we'll just extract possible ids
  {
    pattern: /^(complete|mark\s*done|finish)\s*(task|milestone|subtask)\s*(?:(?:with\s*)?(?:id\s*)?([a-zA-Z0-9]+))?$/i,
    intent: 'COMPLETE_TASK',
    extract: (match) => {
      const id = match[3]?.trim() || undefined;
      return { goalId: id }; // we'll need more context; might be handled by the component
    },
    reply: (match) => {
      const id = match[3]?.trim() || 'the current task';
      return `Marking ${id} as complete.`
    }
  },
  // CREATE_GOAL, CREATE_STUDY_PLAN, GENERATE_ROADMAP
  // These have variable structures; we'll use a single pattern that captures the action and the topic.
  {
    pattern: /^(create|make|generate)\s+(?:a\s+)?(study\s+plan|roadmap|goal|plan)\s+(?:for\s+|to\s+)?(.+)$/i,
    intent: (match) => {
      const type = match[2]?.toLowerCase() || '';
      if (type.includes('study')) return 'CREATE_STUDY_PLAN';
      if (type.includes('roadmap')) return 'GENERATE_ROADMAP';
      return 'CREATE_GOAL';
    },
    extract: (match) => {
      const type = match[2]?.toLowerCase() || '';
      const topic = match[3]?.trim() || 'Untitled';
      const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // default 30 days
      return {
        goalTitle: topic,
        goalDescription: `Generated from voice: ${topic}`,
        deadline: deadline.toISOString(),
        difficultyLevel: 'medium',
        priorityLevel: 'medium',
        overview: '',
        urgencyLevel: '',
        milestones: [],
        weeklyObjectives: []
      };
    },
    reply: (match) => {
      const type = match[2]?.toLowerCase() || '';
      const topic = match[3]?.trim() || '';
      let action = 'Creating';
      if (type.includes('study')) action = 'Creating a study plan';
      else if (type.includes('roadmap')) action = 'Generating a roadmap';
      else action = 'Creating a goal';
      return `${action} for "${topic}".`
    }
  },
  // SHOW_NOTIFICATIONS (if you have that)
  {
    pattern: /^(show|open|view)\s*(notifications|alerts|updates)$/i,
    intent: 'SHOW_NOTIFICATIONS',
    reply: 'Opening your notifications.'
  },
  // CHAT / general conversation – this will fallback to Gemini if no alias matches
  // We'll not include a pattern for CHAT because it's the fallback.
];

export function matchLocalAlias(text: string): CommandAction | null {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  for (const entry of ALIAS_PATTERNS) {
    const match = normalized.match(entry.pattern);
    if (match) {
      const intent = typeof entry.intent === 'function' ? entry.intent(match) : entry.intent;
      const params = entry.extract ? entry.extract(match) : {};
      const reply = entry.reply
        ? typeof entry.reply === 'function'
          ? entry.reply(match)
          : entry.reply
        : 'Executing command.';
      return {
        intent,
        confidence: 1.0,
        params,
        reply
      };
    }
  }
  return null;
}
