import { Timestamp } from 'firebase/firestore';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Timestamp | null;
  status?: 'todo' | 'in_progress' | 'done';
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  daysFromStart: number;
  priority: 'high' | 'medium' | 'low';
  difficulty?: 'easy' | 'medium' | 'hard';
  suggestions: string[];
  completed: boolean;
  completedAt?: Timestamp | null;
  subtasks?: Subtask[];
}

export interface WeeklyObjective {
  id: string;
  weekNumber: number;
  objective: string;
  completed: boolean;
  completedAt?: Timestamp | null;
}

export interface RiskAnalysis {
  riskScore: number;
  missProbability: number;
  reasoning: string;
  recoveryPlan: string[];
  updatedAt: string;
}

export interface WorkSession {
  id: string;
  title: string;
  durationHours: number;
  dayStr: string;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  completed: boolean;
  milestoneId?: string;
}

export interface WeeklyPlanSummary {
  weekNumber: number;
  focusTitle: string;
  allocatedHours: number;
}

export interface AutoPlan {
  sessions: WorkSession[];
  weeklySummaries: WeeklyPlanSummary[];
  availableHoursPerDay: number;
  generatedAt: string;
}

export interface RecoveryProposal {
  beforeSessions: WorkSession[];
  updatedSessions: WorkSession[];
  explanation: string;
  recoveryPlan: string[];
  suggestedDeadline: string;
  originalDeadline: string;
  generatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  deadline: string;
  createdAt: Timestamp;
  milestones: Milestone[];
  overview?: string;
  urgencyLevel?: string;
  difficultyLevel?: 'easy' | 'medium' | 'hard';
  priorityLevel?: 'high' | 'medium' | 'low';
  weeklyObjectives?: WeeklyObjective[];
  riskAnalysis?: RiskAnalysis;
  autoPlan?: AutoPlan;
  recoveryProposal?: RecoveryProposal;
  userId: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  ts: number;
}

export type ViewType = 'dashboard' | 'goals' | 'tasks' | 'calendar' | 'ai' | 'settings' | 'risk' | 'planner';

export interface GoalData {
  goalTitle: string;
  goalDescription?: string;
  deadline: string;
  difficultyLevel?: 'easy' | 'medium' | 'hard';
  priorityLevel?: 'high' | 'medium' | 'low';
  overview?: string;
  urgencyLevel?: string;
  milestones?: Array<{
    title: string;
    description: string;
    daysFromStart: number;
    priority: 'high' | 'medium' | 'low';
    difficulty?: 'easy' | 'medium' | 'hard';
    subtasks?: Array<{ title: string }>;
  }>;
  weeklyObjectives?: Array<{
    weekNumber: number;
    objective: string;
  }>;
}

export interface AssistantAction {
  type: string;
  params?: {
    view?: ViewType;
    goalId?: string;
    goalTitle?: string;
    goalDescription?: string;
    deadline?: string;
    difficultyLevel?: 'easy' | 'medium' | 'hard';
    priorityLevel?: 'high' | 'medium' | 'low';
    overview?: string;
    urgencyLevel?: string;
    milestones?: Array<{
      title: string;
      description: string;
      daysFromStart: number;
      priority: 'high' | 'medium' | 'low';
      subtasks?: Array<{ title: string }>;
    }>;
    weeklyObjectives?: Array<{
      weekNumber: number;
      objective: string;
    }>;
    milestoneId?: string;
    subtaskId?: string;
  };
}

export interface RawSession {
  id: string;
  title: string;
  durationHours: number;
  dayOffset: number;
  timeSlot?: 'morning' | 'afternoon' | 'evening';
  completed: boolean;
  milestoneId?: string;
}

export interface RawWeeklySummary {
  weekNumber: number;
  focusTitle: string;
  allocatedHours: number;
}


