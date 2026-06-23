'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, where, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, X, Zap, Target, CheckCircle2, Loader2,
  Trash2, Brain, Send, LogOut, Calendar, Sparkles, MoreVertical, TrendingUp, TrendingDown, Clock, Menu, Home, AlertTriangle, Search, Settings
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

import MainDashboardView from './views/MainDashboardView';
import GoalsView from './views/GoalsView';
import TasksView from './views/TasksView';
import CalendarView from './views/CalendarView';
import AIAssistantView from './views/AIAssistantView';
import SettingsView from './views/SettingsView';
import RiskDashboardView from './views/RiskDashboardView';

/* ─────────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────────── */
interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Timestamp | null;
  status?: 'todo' | 'in_progress' | 'done';
}

interface Milestone {
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

interface WeeklyObjective {
  id: string;
  weekNumber: number;
  objective: string;
  completed: boolean;
  completedAt?: Timestamp | null;
}

interface RiskAnalysis {
  riskScore: number;
  missProbability: number;
  reasoning: string;
  recoveryPlan: string[];
  updatedAt: string; // ISO date string
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  deadline: string; // ISO date string
  createdAt: Timestamp;
  milestones: Milestone[];
  overview?: string;
  urgencyLevel?: string;
  difficultyLevel?: 'easy' | 'medium' | 'hard';
  priorityLevel?: 'high' | 'medium' | 'low';
  weeklyObjectives?: WeeklyObjective[];
  riskAnalysis?: RiskAnalysis;
  userId: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  ts: number;
}

/* ─────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────── */
function daysLeft(deadline: string): number {
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000));
}

function urgencyColor(level?: string, days?: number): string {
  if (level === 'critical' || (days !== undefined && days <= 3)) return '#EF4444';
  if (level === 'high' || (days !== undefined && days <= 7)) return '#F59E0B';
  if (level === 'moderate' || (days !== undefined && days <= 21)) return '#6366F1';
  return '#22C55E';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─────────────────────────────────────────────────
   URGENCY RING
───────────────────────────────────────────────── */
function UrgencyRing({ completed, total, deadline, urgencyLevel }: {
  completed: number; total: number; deadline: string; urgencyLevel?: string;
}) {
  const pct = total === 0 ? 0 : completed / total;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const days = daysLeft(deadline);
  const color = urgencyColor(urgencyLevel, days);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 96 96" className="w-28 h-28 -rotate-90">
          <circle cx="48" cy="48" r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
          <circle
            cx="48" cy="48" r={r}
            fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-800">{Math.round(pct * 100)}%</span>
          <span className="text-xs text-slate-400">done</span>
        </div>
      </div>
      <div className="text-center">
        <div
          className="text-2xl font-bold"
          style={{ color }}
        >
          {days}
        </div>
        <div className="text-xs text-slate-400 uppercase tracking-wide">days left</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   NEW GOAL MODAL
───────────────────────────────────────────────── */
function NewGoalModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');

  const minDeadline = (() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  const loadingSteps = [
    "🧠 Decomposing goal with Gemini...",
    "📋 Structuring milestones & subtasks...",
    "📅 Formulating weekly objectives...",
    "🎯 Calculating estimated completion dates...",
    "💾 Securing roadmap in Firestore...",
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleCreate = async () => {
    if (!title.trim() || !deadline) { setError('Please fill in the goal and deadline.'); return; }
    if (!user) return;
    setLoadingStep(0);
    setLoading(true);
    setError('');

    try {
      // Decompose goal via Gemini API
      const res = await fetch('/api/cos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-milestones', goal: title, deadline, description }),
      });
      const json = await res.json();
      if (!json.success) throw new Error('AI decomposition failed');

      setLoadingStep(4);
      // Brief pause to allow user to see "Securing in Firestore" step
      await new Promise((resolve) => setTimeout(resolve, 800));

      const rawMilestones = (json.data?.milestones ?? []).map((m: {
        title: string;
        description: string;
        daysFromStart: number;
        priority: 'high' | 'medium' | 'low';
        difficulty?: 'easy' | 'medium' | 'hard';
        suggestions: string[];
        subtasks?: Array<{ title: string }>;
      }, i: number) => ({
        ...m,
        id: `m_${Date.now()}_${i}`,
        completed: false,
        completedAt: null,
        difficulty: m.difficulty || 'medium',
        subtasks: (m.subtasks ?? []).map((st: { title: string }, sti: number) => ({
          id: `s_${Date.now()}_${i}_${sti}`,
          title: st.title,
          completed: false,
          completedAt: null,
        })),
      }));

      const rawWeeklyObjectives = (json.data?.weeklyObjectives ?? []).map((wo: { weekNumber: number; objective: string }, i: number) => ({
        id: `w_${Date.now()}_${i}`,
        weekNumber: wo.weekNumber,
        objective: wo.objective,
        completed: false,
        completedAt: null,
      }));

      const docRef = await addDoc(collection(db, 'goals'), {
        userId: user.uid,
        title: title.trim(),
        description: description.trim() || '',
        deadline,
        milestones: rawMilestones,
        weeklyObjectives: rawWeeklyObjectives,
        difficultyLevel: json.data?.difficultyLevel ?? 'medium',
        priorityLevel: json.data?.priorityLevel ?? 'medium',
        overview: json.data?.overview ?? '',
        urgencyLevel: json.data?.urgencyLevel ?? '',
        createdAt: serverTimestamp(),
      });

      onCreated(docRef.id);
      onClose();
    } catch {
      setError('Failed to decompose goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="glass-panel p-8 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">AI Goal Decomposer</h2>
            <p className="text-sm text-slate-500">Let Gemini map out your milestones & weekly targets</p>
          </div>
          <Button id="modal-close" onClick={onClose} variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="label-luxury block mb-1.5">Goal Description</label>
            <input
              id="goal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. I want to crack GATE 2027"
              className="glass-input w-full px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="label-luxury block mb-1.5">Additional Context (optional)</label>
            <textarea
              id="goal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any background information to assist the AI..."
              rows={2}
              className="glass-input w-full px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none"
            />
          </div>
          <div>
            <label className="label-luxury block mb-1.5">Target Completion Date</label>
            <input
              id="goal-deadline"
              type="date"
              value={deadline}
              min={minDeadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="glass-input w-full px-4 py-3 text-sm text-slate-800"
            />
          </div>

          {error && (
            <p className="text-rose-500 text-sm">{error}</p>
          )}

          <button
            id="goal-create"
            onClick={handleCreate}
            disabled={loading}
            className="btn-primary mt-2 justify-center py-3.5 h-auto text-sm font-semibold flex items-center justify-center"
            style={{ width: '100%' }}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span className="font-bold text-white">Decomposing Goal...</span>
                </div>
                <div className="text-[10px] text-indigo-200 transition-all duration-300 animate-pulse font-medium tracking-wide">
                  {loadingSteps[loadingStep]}
                </div>
              </div>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles size={16} /> Decompose Goal with Gemini
              </span>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────
   CHAT PANEL
───────────────────────────────────────────────── */
function ChatPanel({ goal }: { goal: Goal }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: 'model',
      text: `I'm your AI Chief of Staff for "${goal.title}". You have ${daysLeft(goal.deadline)} days left. What's on your mind?`,
      ts: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const userMsg: ChatMessage = { role: 'user', text, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);

    try {
      const res = await fetch('/api/cos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat-advisor',
          message: text,
          goal: goal.title,
          deadline: goal.deadline,
          milestones: goal.milestones.map((m) => ({
            title: m.title,
            completed: m.completed,
            daysFromStart: m.daysFromStart,
          })),
          history: messages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((m) => [...m, { role: 'model', text: json.reply, ts: Date.now() }]);
      }
    } catch {
      setMessages((m) => [...m, { role: 'model', text: 'I had trouble connecting. Please try again.', ts: Date.now() }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={msg.role === 'user' ? 'self-end' : 'self-start'}
            style={{ maxWidth: '85%' }}
          >
            {msg.role === 'model' && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
                >
                  <Zap size={10} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-slate-500">AI Chief of Staff</span>
              </div>
            )}
            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        {sending && (
          <div className="self-start">
            <div className="chat-bubble-ai flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 0.15, 0.3].map((d) => (
                  <span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-slate-400"
                    style={{ animation: `pulse 1s ease-in-out ${d}s infinite` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex gap-2">
          <input
            id="chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask your Chief of Staff…"
            className="glass-input flex-1 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400"
          />
          <button
            id="chat-send"
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="btn-primary px-3 py-2.5"
            style={{ minWidth: '42px' }}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────────── */
export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [activeTab, setActiveTab] = useState<'milestones' | 'chat'>('milestones');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'goals' | 'tasks' | 'calendar' | 'ai' | 'settings' | 'risk'>('dashboard');

  // Real-time Firestore listener — no orderBy so no composite index needed;
  // we sort client-side by createdAt instead.
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'goals'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Goal))
          .sort((a, b) => {
            const aMs = a.createdAt?.toMillis?.() ?? 0;
            const bMs = b.createdAt?.toMillis?.() ?? 0;
            return bMs - aMs; // newest first
          });
        setGoals(docs);
        setGoalsLoading(false);
        // Auto-select first goal if none selected
        if (docs.length > 0 && !selectedGoalId) {
          setSelectedGoalId(docs[0].id);
        }
      },
      (error) => {
        // Always stop the loading skeleton, even on Firestore errors
        console.error('Firestore snapshot error:', error.code, error.message);
        setGoalsLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const selectedGoal = goals.find((g) => g.id === selectedGoalId) ?? null;

  const toggleMilestone = useCallback(async (goalId: string, milestones: Milestone[], milestoneId: string) => {
    const updated = milestones.map((m) =>
      m.id === milestoneId
        ? { ...m, completed: !m.completed, completedAt: !m.completed ? Timestamp.now() : null }
        : m
    );
    await updateDoc(doc(db, 'goals', goalId), { milestones: updated });
  }, []);

  const updateSubtaskStatus = useCallback(async (goalId: string, milestones: Milestone[], milestoneId: string, subtaskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    const updated = milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      const updatedSubtasks = (m.subtasks ?? []).map((s) => {
        if (s.id !== subtaskId) return s;
        const completed = newStatus === 'done';
        return {
          ...s,
          status: newStatus,
          completed,
          completedAt: completed ? Timestamp.now() : null
        };
      });
      // Automatically toggle milestone completion if all subtasks are complete
      const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.completed);
      return {
        ...m,
        subtasks: updatedSubtasks,
        completed: allDone,
        completedAt: allDone ? Timestamp.now() : null
      };
    });
    await updateDoc(doc(db, 'goals', goalId), { milestones: updated });
  }, []);

  const toggleSubtask = useCallback(async (goalId: string, milestones: Milestone[], milestoneId: string, subtaskId: string) => {
    const milestone = milestones.find((m) => m.id === milestoneId);
    const subtask = milestone?.subtasks?.find((s) => s.id === subtaskId);
    if (!subtask) return;
    const nextStatus = subtask.completed ? 'todo' : 'done';
    await updateSubtaskStatus(goalId, milestones, milestoneId, subtaskId, nextStatus);
  }, [updateSubtaskStatus]);

  const toggleWeeklyObjective = useCallback(async (goalId: string, weeklyObjectives: WeeklyObjective[], objectiveId: string) => {
    const updated = (weeklyObjectives ?? []).map((wo) =>
      wo.id === objectiveId
        ? { ...wo, completed: !wo.completed, completedAt: !wo.completed ? Timestamp.now() : null }
        : wo
    );
    await updateDoc(doc(db, 'goals', goalId), { weeklyObjectives: updated });
  }, []);

  const deleteGoal = useCallback(async (goalId: string) => {
    await deleteDoc(doc(db, 'goals', goalId));
    if (selectedGoalId === goalId) setSelectedGoalId(null);
  }, [selectedGoalId]);

  const runRiskAssessment = useCallback(async (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    // Calculate velocity: count of subtasks completed in the last 7 days
    let velocity = 0;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    goal.milestones.forEach((m) => {
      (m.subtasks ?? []).forEach((s) => {
        if (s.completed && s.completedAt) {
          const completedMs = typeof s.completedAt.toMillis === 'function'
            ? s.completedAt.toMillis()
            : new Date(s.completedAt as any).getTime();
          if (completedMs >= sevenDaysAgo) {
            velocity++;
          }
        }
      });
    });

    try {
      const res = await fetch('/api/cos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'predict-risk',
          goal: goal.title,
          deadline: goal.deadline,
          description: goal.description,
          milestones: goal.milestones.map((m) => ({
            title: m.title,
            completed: m.completed,
            priority: m.priority,
            difficulty: m.difficulty
          })),
          weeklyObjectives: (goal.weeklyObjectives ?? []).map((wo) => ({
            objective: wo.objective,
            completed: wo.completed
          })),
          velocity
        })
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to predict risk');
      }

      const riskData: RiskAnalysis = {
        riskScore: json.data.riskScore,
        missProbability: json.data.missProbability,
        reasoning: json.data.reasoning,
        recoveryPlan: json.data.recoveryPlan,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'goals', goalId), { riskAnalysis: riskData });
    } catch (err) {
      console.error('Error running risk assessment:', err);
      throw err;
    }
  }, [goals]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const priorityDot: Record<string, string> = {
    high: '#F59E0B',
    medium: '#6366F1',
    low: '#22C55E',
  };

  return (
    <div className="flex h-screen bg-luxury-grid overflow-hidden">

      {/* ── SIDEBAR ────────────────────────────────────── */}
      <AnimatePresence>
        {(sidebarOpen || true) && (
          <motion.aside
            initial={false}
            className="hidden lg:flex flex-col w-72 flex-shrink-0 border-r border-slate-200/60"
            style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)' }}
          >
            {/* Brand */}
            <div className="h-16 flex items-center px-5 border-b border-slate-100/80">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
                >
                  <Zap size={15} className="text-white" />
                </div>
                <span className="font-bold text-slate-800 tracking-tight">DeadlineOS</span>
              </div>
            </div>

            {/* User */}
            <div className="px-4 py-4 border-b border-slate-100/80">
              <div className="flex items-center gap-3 px-2 py-2 rounded-xl"
                style={{ background: 'rgba(99,102,241,0.05)' }}>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
                >
                  {(user?.displayName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {user?.displayName ?? 'Chief of Staff'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Main Navigation */}
            <div className="px-3 py-3 border-b border-slate-100/80 space-y-1 shrink-0">
              {([
                { id: 'dashboard', label: 'Dashboard', icon: Home },
                { id: 'goals', label: 'Goals Manager', icon: Target },
                { id: 'tasks', label: 'Tasks Tracker', icon: CheckCircle2 },
                { id: 'calendar', label: 'Calendar Grid', icon: Calendar },
                { id: 'risk', label: 'Risk Analytics', icon: TrendingDown },
                { id: 'ai', label: 'AI Chief of Staff', icon: Brain },
                { id: 'settings', label: 'Settings', icon: Settings },
              ] as const).map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setCurrentView(item.id); setSidebarOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer"
                    style={{
                      background: isActive ? 'rgba(99,102,241,0.06)' : 'transparent',
                      color: isActive ? '#4F46E5' : '#64748B',
                      border: isActive ? '1px solid rgba(99,102,241,0.15)' : '1px solid transparent',
                    }}
                  >
                    <Icon size={14} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Goals list */}
            <div className="flex-1 overflow-y-auto py-3 px-3 no-scrollbar">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="label-luxury">My Goals</span>
                <button
                  id="sidebar-new-goal"
                  onClick={() => setShowNewGoal(true)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              {goalsLoading ? (
                <div className="flex flex-col gap-2 px-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-14 rounded-xl" />
                  ))}
                </div>
              ) : goals.length === 0 ? (
                <div className="px-2 py-8 text-center">
                  <Target size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No goals yet</p>
                  <button
                    id="sidebar-empty-new"
                    onClick={() => setShowNewGoal(true)}
                    className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    + Create your first goal
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {goals.map((goal) => {
                    const dl = daysLeft(goal.deadline);
                    const completed = goal.milestones.filter((m) => m.completed).length;
                    const total = goal.milestones.length;
                    const color = urgencyColor(goal.urgencyLevel, dl);
                    const isSelected = goal.id === selectedGoalId;

                    return (
                      <div
                        key={goal.id}
                        id={`goal-item-${goal.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectedGoalId(goal.id); setCurrentView('goals'); setSidebarOpen(false); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedGoalId(goal.id);
                            setCurrentView('goals');
                            setSidebarOpen(false);
                          }
                        }}
                        className="w-full text-left px-3 py-3 rounded-xl transition-all duration-150 group cursor-pointer select-none"
                        style={{
                          background: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                          border: isSelected ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <div
                              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                              style={{ background: color }}
                            />
                            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                              {goal.title}
                            </p>
                          </div>
                          <button
                            id={`goal-delete-${goal.id}`}
                            onClick={(e) => { e.stopPropagation(); deleteGoal(goal.id); }}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-400 transition-all flex-shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 ml-4">
                          <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${total === 0 ? 0 : (completed / total) * 100}%`, background: color }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">{dl}d left</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Logout */}
            <div className="p-4 border-t border-slate-100/80">
              <Button
                id="sidebar-logout"
                onClick={handleLogout}
                variant="ghost"
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-all justify-start"
              >
                <LogOut size={15} /> Sign Out
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header
          className="h-16 flex items-center px-6 border-b border-slate-200/60 flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)' }}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-extrabold text-slate-800 tracking-tight capitalize">
                {currentView === 'ai' ? 'AI Chief of Staff' : currentView === 'dashboard' ? 'Workspace Overview' : currentView === 'goals' ? 'Goals Manager' : currentView === 'tasks' ? 'Tasks Workspace' : currentView === 'calendar' ? 'Calendar Schedule' : currentView === 'risk' ? 'Risk Analytics' : 'Settings'}
              </h1>
            </div>
            
            {/* Top command bar */}
            <div className="hidden md:flex items-center w-80 relative">
              <Search size={14} className="absolute left-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search command or navigate..."
                onClick={() => { if (currentView !== 'goals') setCurrentView('goals'); }}
                className="w-full glass-input pl-9 pr-3 py-1.5 text-xs text-slate-700 bg-white/50 placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                id="header-new-goal"
                onClick={() => setShowNewGoal(true)}
                className="btn-primary px-4 py-2 text-sm"
              >
                <Plus size={15} /> New Goal
              </Button>
            </div>
          </div>
        </header>

        {/* Content Views Switch */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {currentView === 'dashboard' && (
            <MainDashboardView
              goals={goals}
              onNavigate={setCurrentView}
              onSelectGoal={setSelectedGoalId}
            />
          )}
          {currentView === 'goals' && (
            <GoalsView
              goals={goals}
              selectedGoalId={selectedGoalId}
              setSelectedGoalId={setSelectedGoalId}
              setShowNewGoal={setShowNewGoal}
              toggleMilestone={toggleMilestone}
              toggleSubtask={toggleSubtask}
              updateSubtaskStatus={updateSubtaskStatus}
              toggleWeeklyObjective={toggleWeeklyObjective}
              deleteGoal={deleteGoal}
            />
          )}
          {currentView === 'tasks' && (
            <TasksView
              goals={goals}
              toggleMilestone={toggleMilestone}
            />
          )}
          {currentView === 'calendar' && (
            <CalendarView
              goals={goals}
            />
          )}
          {currentView === 'ai' && (
            <AIAssistantView
              goals={goals}
            />
          )}
          {currentView === 'risk' && (
            <RiskDashboardView
              goals={goals}
              runRiskAssessment={runRiskAssessment}
              onNavigate={setCurrentView}
              selectedGoalId={selectedGoalId}
              setSelectedGoalId={setSelectedGoalId}
            />
          )}
          {currentView === 'settings' && (
            <SettingsView />
          )}
        </div>
      </div>

      {/* New Goal Modal */}
      <AnimatePresence>
        {showNewGoal && (
          <NewGoalModal
            onClose={() => setShowNewGoal(false)}
            onCreated={(id) => setSelectedGoalId(id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
