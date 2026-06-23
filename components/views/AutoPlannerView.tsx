'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, RefreshCw, Calendar, Clock, AlertTriangle, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronDown,
  TrendingUp, CalendarDays, ListTodo, ShieldAlert
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface WorkSession {
  id: string;
  title: string;
  durationHours: number;
  dayStr: string; // YYYY-MM-DD
  timeSlot: 'morning' | 'afternoon' | 'evening';
  completed: boolean;
  milestoneId?: string;
}

interface WeeklyPlanSummary {
  weekNumber: number;
  focusTitle: string;
  allocatedHours: number;
}

interface AutoPlan {
  sessions: WorkSession[];
  weeklySummaries: WeeklyPlanSummary[];
  availableHoursPerDay: number;
  generatedAt: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  daysFromStart: number;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  subtasks?: Array<{ id: string; title: string; completed: boolean }>;
}

interface RecoveryProposal {
  beforeSessions: WorkSession[];
  updatedSessions: WorkSession[];
  explanation: string;
  recoveryPlan: string[];
  suggestedDeadline: string; // YYYY-MM-DD
  originalDeadline: string; // YYYY-MM-DD
  generatedAt: string;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  deadline: string;
  createdAt: Timestamp;
  milestones: Milestone[];
  autoPlan?: AutoPlan;
  recoveryProposal?: RecoveryProposal;
}

interface AutoPlannerViewProps {
  goals: Goal[];
  generateAutoPlan: (goalId: string, availableHoursPerDay: number) => Promise<void>;
  saveAutoPlan: (goalId: string, autoPlan: AutoPlan) => Promise<void>;
  runReplannerAgent: (goalId: string) => Promise<void>;
  applyRecoveryProposal: (goalId: string, proposal: RecoveryProposal) => Promise<void>;
  rejectRecoveryProposal: (goalId: string) => Promise<void>;
  selectedGoalId: string | null;
  setSelectedGoalId: (id: string | null) => void;
  onNavigate: (view: 'dashboard' | 'goals' | 'tasks' | 'calendar' | 'ai' | 'settings' | 'risk' | 'planner') => void;
}

export default function AutoPlannerView({
  goals,
  generateAutoPlan,
  saveAutoPlan,
  runReplannerAgent,
  applyRecoveryProposal,
  rejectRecoveryProposal,
  selectedGoalId,
  setSelectedGoalId,
  onNavigate
}: AutoPlannerViewProps) {
  const [activeTab, setActiveTab] = useState<'day' | 'calendar' | 'timeline' | 'recovery'>('day');
  const [availableHours, setAvailableHours] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calendar month selection state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Find currently selected goal context
  const selectedGoal = useMemo(() => {
    return goals.find((g) => g.id === selectedGoalId) || goals[0] || null;
  }, [goals, selectedGoalId]);

  // Set default hours if plan exists (synchronize during render to prevent cascading effect renders)
  const [prevGoalId, setPrevGoalId] = useState<string | null>(null);
  const [prevHoursPerDay, setPrevHoursPerDay] = useState<number | null>(null);

  const hoursFromGoal = selectedGoal?.autoPlan?.availableHoursPerDay || null;

  if (selectedGoal?.id !== prevGoalId || hoursFromGoal !== prevHoursPerDay) {
    setPrevGoalId(selectedGoal?.id || null);
    setPrevHoursPerDay(hoursFromGoal);
    if (hoursFromGoal !== null) {
      setAvailableHours(hoursFromGoal);
    }
  }

  const handleGoalChange = (id: string) => {
    setSelectedGoalId(id);
    setError('');
  };

  const [agentRunning, setAgentRunning] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const missedSessions = useMemo(() => {
    if (!selectedGoal?.autoPlan) return [];
    return selectedGoal.autoPlan.sessions.filter((s) => !s.completed && s.dayStr < todayStr);
  }, [selectedGoal, todayStr]);

  const handleInitiateReplanner = async () => {
    if (!selectedGoal || agentRunning) return;
    setAgentRunning(true);
    setError('');
    try {
      await runReplannerAgent(selectedGoal.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'The AI Replanner Agent encountered an error.';
      setError(msg);
    } finally {
      setAgentRunning(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedGoal || loading) return;
    setLoading(true);
    setError('');
    try {
      await generateAutoPlan(selectedGoal.id, availableHours);
    } catch (err) {
      console.error(err);
      setError('AI scheduling failed. Please verify API configuration and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── MUTATIONS (Drag & Drop, Completing Tasks) ──

  const handleMoveSession = async (sessionId: string, newDayStr: string, newTimeSlot: 'morning' | 'afternoon' | 'evening') => {
    if (!selectedGoal || !selectedGoal.autoPlan) return;

    const sessions = selectedGoal.autoPlan.sessions.map((s) => {
      if (s.id === sessionId) {
        return { ...s, dayStr: newDayStr, timeSlot: newTimeSlot };
      }
      return s;
    });

    // Recalculate weekly hours based on moves
    const updatedWeeklySummaries = recalculateWeeklyHours(sessions, selectedGoal);

    const updatedPlan: AutoPlan = {
      ...selectedGoal.autoPlan,
      sessions,
      weeklySummaries: updatedWeeklySummaries
    };

    try {
      await saveAutoPlan(selectedGoal.id, updatedPlan);
    } catch (err) {
      console.error('Drag and drop update failed:', err);
    }
  };

  const handleToggleSessionComplete = async (sessionId: string) => {
    if (!selectedGoal || !selectedGoal.autoPlan) return;

    const sessions = selectedGoal.autoPlan.sessions.map((s) => {
      if (s.id === sessionId) {
        return { ...s, completed: !s.completed };
      }
      return s;
    });

    const updatedPlan: AutoPlan = {
      ...selectedGoal.autoPlan,
      sessions
    };

    try {
      await saveAutoPlan(selectedGoal.id, updatedPlan);
    } catch (err) {
      console.error('Task complete toggle failed:', err);
    }
  };

  // Recalculate weekly summarized hours when work sessions shift days
  const recalculateWeeklyHours = (sessions: WorkSession[], goal: Goal): WeeklyPlanSummary[] => {
    const start = goal.createdAt?.toDate?.() ?? new Date();
    const map = new Map<number, number>();
    
    sessions.forEach((s) => {
      const diffTime = new Date(s.dayStr).getTime() - new Date(start).getTime();
      const diffDays = Math.max(0, Math.floor(diffTime / 86400000));
      const weekIndex = Math.floor(diffDays / 7) + 1;
      map.set(weekIndex, (map.get(weekIndex) || 0) + s.durationHours);
    });

    return (goal.autoPlan?.weeklySummaries ?? []).map((w) => ({
      ...w,
      allocatedHours: map.get(w.weekNumber) || 0
    }));
  };

  // ── STATISTICS & WORKLOAD CALCULATIONS ──

  const stats = useMemo(() => {
    if (!selectedGoal || !selectedGoal.autoPlan) return { totalHours: 0, overloadDays: 0, balanceScore: 'Optimal' };

    const limit = selectedGoal.autoPlan.availableHoursPerDay;
    const dayHoursMap = new Map<string, number>();

    selectedGoal.autoPlan.sessions.forEach((s) => {
      dayHoursMap.set(s.dayStr, (dayHoursMap.get(s.dayStr) || 0) + s.durationHours);
    });

    let overloadDays = 0;
    let totalHours = 0;
    dayHoursMap.forEach((hrs) => {
      totalHours += hrs;
      if (hrs > limit) overloadDays++;
    });

    let balanceScore: 'Optimal' | 'Warning' | 'High Overload' = 'Optimal';
    if (overloadDays > 0) {
      balanceScore = overloadDays > 2 ? 'High Overload' : 'Warning';
    }

    return { totalHours, overloadDays, balanceScore };
  }, [selectedGoal]);

  // Generate scrollable lanes for the day planner (up to 30 days)
  const datesList = useMemo(() => {
    if (!selectedGoal) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(selectedGoal.deadline);
    deadline.setHours(0, 0, 0, 0);

    const list: Date[] = [];
    const curr = new Date(today);
    
    let count = 0;
    // Show dates starting from today until deadline, capped at 30 days for view layout sanity
    while (curr <= deadline && count < 30) {
      list.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
      count++;
    }
    return list;
  }, [selectedGoal]);

  // Month grid calculator for the month view
  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const lastDayOfPrevMonth = new Date(year, month, 0).getDate();

    const grid: Date[] = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      grid.push(new Date(year, month - 1, lastDayOfPrevMonth - i));
    }
    // Current month days
    for (let i = 1; i <= lastDayOfMonth; i++) {
      grid.push(new Date(year, month, i));
    }
    // Next month padding to align 6-row calendar
    const remainingDays = 42 - grid.length;
    for (let i = 1; i <= remainingDays; i++) {
      grid.push(new Date(year, month + 1, i));
    }
    return grid;
  }, [currentDate]);

  const monthName = currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });

  // Get daily session helper
  const getSessionsForDate = (date: Date) => {
    if (!selectedGoal?.autoPlan) return [];
    const dStr = date.toISOString().split('T')[0];
    return selectedGoal.autoPlan.sessions.filter((s) => s.dayStr === dStr);
  };

  // Get total daily hours
  const getDailyHours = (sessions: WorkSession[]) => {
    return sessions.reduce((sum, s) => sum + s.durationHours, 0);
  };

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      {/* ── LEFT CELL: PLANNER SETTINGS & CAPACITIES ── */}
      <div className="w-80 border-r border-slate-200/60 bg-white/40 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-100/80">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Plan Settings</h2>
          <p className="text-xs text-slate-400">Configure daily allocations</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
          {/* Goal selection dropdown */}
          <div className="space-y-1.5">
            <label className="label-luxury block">Active Goal Target</label>
            <div className="relative">
              <select
                value={selectedGoalId || ''}
                onChange={(e) => handleGoalChange(e.target.value)}
                className="glass-input w-full pl-3 pr-8 py-2.5 text-xs text-slate-700 bg-white font-semibold appearance-none outline-none cursor-pointer"
              >
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Daily hours slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="label-luxury">Available daily capacity</label>
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {availableHours} hrs/day
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              value={availableHours}
              onChange={(e) => setAvailableHours(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>1 hr</span>
              <span>6 hrs</span>
              <span>12 hrs</span>
            </div>
          </div>

          {/* Action Trigger button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !selectedGoal}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-xs font-black"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Balancing Schedule...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} className="text-yellow-300 fill-yellow-300" />
                <span>{selectedGoal?.autoPlan ? 'Re-generate Planner' : 'Auto-allocate Tasks'}</span>
              </>
            )}
          </button>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-[11px] p-3 rounded-xl flex items-start gap-1.5">
              <ShieldAlert size={14} className="text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── METRICS WORKSPACE WIDGETS ── */}
          {selectedGoal?.autoPlan && (
            <div className="pt-5 border-t border-slate-200/50 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Capacity Diagnostics</h3>
              
              {/* Total Hours Badge */}
              <div className="glass-panel p-3.5 flex justify-between items-center bg-white/70">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">Allocated workload</span>
                </div>
                <span className="text-sm font-black text-slate-800">{stats.totalHours} hrs</span>
              </div>

              {/* Safety Rating Gauge */}
              <div className="glass-panel p-4 space-y-2 bg-white/70">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Smart Balancing Health</span>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700">Capacity score</span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                      stats.balanceScore === 'Optimal'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        : stats.balanceScore === 'Warning'
                        ? 'bg-amber-50 border-amber-100 text-amber-600'
                        : 'bg-rose-50 border-rose-100 text-rose-600'
                    }`}
                  >
                    {stats.balanceScore}
                  </span>
                </div>

                {stats.overloadDays > 0 ? (
                  <p className="text-[10px] text-slate-500 leading-relaxed pt-1">
                    Warning: <strong>{stats.overloadDays} days</strong> exceed your maximum daily capacity. Drag sessions to adjacent days to balance your schedule.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 leading-relaxed pt-1">
                    Your daily allocations are balanced perfectly and stay within your limits!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT CELL: VISUAL PLANNERS ── */}
      <div className="flex-1 bg-luxury-grid overflow-hidden flex flex-col justify-between">
        {!selectedGoal ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <Calendar size={48} className="text-slate-300 mb-3 animate-pulse" />
            <h3 className="text-lg font-bold text-slate-800">No Goal Selected</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">Please create a goal in the Goals Manager to schedule work sessions.</p>
            <button
              onClick={() => onNavigate('goals')}
              className="btn-primary mt-4 text-xs font-semibold py-2 px-4"
            >
              Go to Goals Manager
            </button>
          </div>
        ) : !selectedGoal.autoPlan ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
              <Sparkles size={32} className="text-indigo-600 animate-pulse" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-800">Auto Planner Console</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Auto-generate work and study sessions from your goal&apos;s subtasks. 
              Gemini will estimate completion times, balance workloads within your daily limits, and schedule it across a timeline.
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary mt-6 flex items-center gap-2 px-5 py-3 text-xs font-black"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                  <span>Generating Schedule...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Generate Auto Plan</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header Switch Tabs */}
            <div className="px-6 pt-4 pb-0 border-b border-slate-200/60 bg-white/72 flex items-center justify-between flex-shrink-0">
              <div className="flex gap-4">
                {([
                  { id: 'day', label: 'Day Planner', icon: ListTodo },
                  { id: 'calendar', label: 'Calendar Month', icon: CalendarDays },
                  { id: 'timeline', label: 'Timeline roadmap', icon: TrendingUp },
                  { id: 'recovery', label: 'Recovery Agent', icon: ShieldAlert }
                ] as const).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="pb-3 text-xs font-bold relative flex items-center gap-2 cursor-pointer transition-colors"
                      style={{ color: isActive ? '#4F46E5' : '#94A3B8' }}
                    >
                      <Icon size={14} />
                      {tab.label}
                      {isActive && (
                        <motion.div
                          layoutId="planner-active-tab-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="text-xs text-slate-400 font-medium pb-3 flex items-center gap-1">
                <span>Plan Generated:</span>
                <span className="font-bold text-slate-600">
                  {new Date(selectedGoal.autoPlan.generatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* View Switch Content Container */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <AnimatePresence mode="wait">
                {/* ── DAY PLANNER VIEW (DRAG & DROP) ── */}
                {activeTab === 'day' && (
                  <motion.div
                    key="day-planner"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 overflow-x-auto overflow-y-hidden p-6 flex gap-5 no-scrollbar"
                  >
                    {datesList.map((date) => {
                      const dStr = date.toISOString().split('T')[0];
                      const daySessions = getSessionsForDate(date);
                      const dailyHrs = getDailyHours(daySessions);
                      const isLimitExceeded = dailyHrs > (selectedGoal.autoPlan?.availableHoursPerDay ?? 4);
                      const formattedHeader = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                      const isToday = new Date().toDateString() === date.toDateString();

                      return (
                        <div
                          key={dStr}
                          className="w-72 bg-white/60 border border-slate-200/60 rounded-2xl flex flex-col flex-shrink-0 h-full overflow-hidden shadow-sm backdrop-blur-sm"
                        >
                          {/* Day column header */}
                          <div className={`p-4 border-b flex items-center justify-between flex-shrink-0 ${isToday ? 'bg-indigo-50/20' : 'bg-slate-50/40'}`}>
                            <div>
                              <h4 className={`text-xs font-black ${isToday ? 'text-indigo-600' : 'text-slate-800'}`}>
                                {formattedHeader}
                              </h4>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                                {isToday ? 'Today' : 'Timeline Date'}
                              </p>
                            </div>
                            <div className="text-right">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  isLimitExceeded
                                    ? 'bg-rose-50 text-rose-600 font-extrabold border border-rose-100 animate-pulse'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {dailyHrs} / {selectedGoal.autoPlan?.availableHoursPerDay} hrs
                              </span>
                            </div>
                          </div>

                          {/* Time Slots Area (Morning, Afternoon, Evening) */}
                          <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
                            {(['morning', 'afternoon', 'evening'] as const).map((slot) => {
                              const slotSessions = daySessions.filter((s) => s.timeSlot === slot);
                              
                              return (
                                <div
                                  key={slot}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const sessionId = e.dataTransfer.getData('text/plain');
                                    handleMoveSession(sessionId, dStr, slot);
                                  }}
                                  className="space-y-1.5 min-h-[90px] border border-dashed border-slate-200/50 rounded-xl p-2.5 bg-slate-50/20 hover:bg-slate-50/50 transition-colors relative"
                                >
                                  <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                                    {slot}
                                  </span>

                                  {slotSessions.length === 0 ? (
                                    <div className="h-10 flex items-center justify-center text-[10px] text-slate-300 font-semibold pointer-events-none">
                                      Free Slot
                                    </div>
                                  ) : (
                                    slotSessions.map((s) => (
                                      <div
                                        key={s.id}
                                        draggable
                                        onDragStart={(e) => {
                                          e.dataTransfer.setData('text/plain', s.id);
                                        }}
                                        className={`p-2.5 rounded-xl border bg-white shadow-sm hover:shadow transition-all group flex flex-col gap-1.5 cursor-grab active:cursor-grabbing border-slate-100 ${
                                          s.completed ? 'opacity-65' : ''
                                        }`}
                                      >
                                        <div className="flex items-start gap-2 justify-between">
                                          <div className="flex items-start gap-2 min-w-0">
                                            <input
                                              type="checkbox"
                                              checked={s.completed}
                                              onChange={() => handleToggleSessionComplete(s.id)}
                                              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 accent-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                                            />
                                            <p className={`text-xs font-semibold leading-tight text-slate-700 truncate ${s.completed ? 'line-through text-slate-400' : ''}`}>
                                              {s.title}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50/60 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                            <Clock size={8} /> {s.durationHours} hrs
                                          </span>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {/* ── MONTH CALENDAR VIEW ── */}
                {activeTab === 'calendar' && (
                  <motion.div
                    key="calendar-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 p-6 flex flex-col overflow-y-auto no-scrollbar"
                  >
                    {/* Header Month controller */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={18} className="text-indigo-600" />
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight">{monthName}</h1>
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          onClick={() => setCurrentDate(new Date())}
                          className="px-2.5 py-1 text-xs border border-slate-200 hover:bg-slate-50 transition-colors rounded-lg font-bold text-slate-600"
                        >
                          Today
                        </button>
                        <button
                          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 text-[10px] tracking-wider uppercase mb-1">
                      <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                    </div>

                    <div className="grid grid-cols-7 gap-2 flex-1 min-h-[360px]">
                      {calendarGrid.map((day, idx) => {
                        const isToday = new Date().toDateString() === day.toDateString();
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        const daySessions = getSessionsForDate(day);
                        const dailyHrs = getDailyHours(daySessions);

                        return (
                          <div
                            key={idx}
                            className={`min-h-[75px] p-2 rounded-xl border flex flex-col justify-between ${
                              isToday ? 'border-indigo-600 bg-indigo-50/5 ring-1 ring-indigo-50' : 'border-slate-100'
                            } ${isCurrentMonth ? 'bg-white' : 'bg-slate-50/40 text-slate-300'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-bold ${isToday ? 'bg-indigo-600 text-white w-4 h-4 rounded-full flex items-center justify-center' : 'text-slate-700'}`}>
                                {day.getDate()}
                              </span>
                              {dailyHrs > 0 && (
                                <span className={`text-[9px] font-black px-1 py-0.5 rounded-md ${
                                  dailyHrs > (selectedGoal.autoPlan?.availableHoursPerDay ?? 4)
                                    ? 'bg-rose-50 text-rose-500'
                                    : 'bg-indigo-50 text-indigo-500'
                                }`}>
                                  {dailyHrs}h
                                </span>
                              )}
                            </div>

                            <div className="space-y-0.5 overflow-hidden h-[34px] mt-1.5">
                              {daySessions.slice(0, 2).map((s) => (
                                <div
                                  key={s.id}
                                  className={`text-[8px] font-medium leading-none px-1.5 py-0.5 rounded truncate ${
                                    s.completed ? 'bg-slate-100 text-slate-400 line-through' : 'bg-slate-50 text-slate-600 border border-slate-100'
                                  }`}
                                >
                                  {s.title}
                                </div>
                              ))}
                              {daySessions.length > 2 && (
                                <div className="text-[7px] font-bold text-slate-400 pl-1">
                                  +{daySessions.length - 2} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* ── TIMELINE ROADMAP VIEW ── */}
                {activeTab === 'timeline' && (
                  <motion.div
                    key="timeline-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-5"
                  >
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3 flex-shrink-0">
                      <TrendingUp size={18} className="text-indigo-600" />
                      <h1 className="text-lg font-bold text-slate-800 tracking-tight">Weekly Load Distribution</h1>
                    </div>

                    <div className="space-y-4 max-w-3xl">
                      {selectedGoal.autoPlan.weeklySummaries.map((week) => {
                        const maxWeekHrs = (selectedGoal.autoPlan?.availableHoursPerDay ?? 4) * 7;
                        const isOverload = week.allocatedHours > maxWeekHrs;
                        const progressPct = Math.min(100, Math.round((week.allocatedHours / maxWeekHrs) * 100));

                        return (
                          <div
                            key={week.weekNumber}
                            className="glass-panel p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                                Week {week.weekNumber} Target
                              </span>
                              <h4 className="text-sm font-black text-slate-800">{week.focusTitle}</h4>
                            </div>

                            <div className="flex-1 max-w-md space-y-1.5 md:px-6">
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-slate-400 uppercase">Workload allocation</span>
                                <span className={isOverload ? 'text-rose-500 font-extrabold' : 'text-indigo-600'}>
                                  {week.allocatedHours} hrs / {maxWeekHrs} hrs limit
                                </span>
                              </div>
                              
                              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
                                <div
                                  className={`h-full rounded-full transition-all duration-1000 ${
                                    isOverload ? 'bg-rose-500' : 'bg-indigo-600'
                                  }`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* ── RECOVERY AGENT VIEW ── */}
                {activeTab === 'recovery' && (
                  <motion.div
                    key="recovery-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 p-6 overflow-y-auto no-scrollbar flex flex-col justify-between"
                  >
                    <div className="flex-1 flex flex-col justify-between h-full">
                      {!selectedGoal.recoveryProposal ? (
                        // ── NO PROPOSAL STATE ──
                        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto py-12 text-center space-y-6 w-full">
                          {missedSessions.length === 0 ? (
                            <div className="glass-panel p-8 flex flex-col items-center justify-center bg-white/80 w-full">
                              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
                                <CheckCircle2 size={24} className="text-emerald-500" />
                              </div>
                              <h3 className="text-sm font-bold text-slate-800">Timeline Fully Healthy</h3>
                              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                You have zero missed tasks. Your current schedule matches your planned velocity perfectly!
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-6 w-full text-left">
                              <div className="bg-amber-50 border border-amber-100 text-amber-800 text-xs px-5 py-4 rounded-xl flex items-start gap-3">
                                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold">Schedule Drift Warning:</span> You have missed <strong>{missedSessions.length} sessions</strong>. The AI Agent has detected that your goal timeline is slipping.
                                </div>
                              </div>

                              {/* Before Plan list: Missed sessions */}
                              <div className="glass-panel p-5 bg-white">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Before Plan (Past Missed Work)</h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                                  {missedSessions.map((s) => (
                                    <div key={s.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
                                      <div>
                                        <p className="font-bold text-slate-700">{s.title}</p>
                                        <span className="text-[10px] text-slate-400">Scheduled: {s.dayStr} ({s.timeSlot})</span>
                                      </div>
                                      <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md uppercase">
                                        Missed
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <button
                                onClick={handleInitiateReplanner}
                                disabled={agentRunning}
                                className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 h-auto text-xs font-black shadow-md"
                              >
                                {agentRunning ? (
                                  <>
                                    <RefreshCw size={14} className="animate-spin text-white" />
                                    <span>AI Agent: Rescheduling & Reprioritizing tasks...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={14} className="text-yellow-300 fill-yellow-300" />
                                    <span>Initiate Autonomous Replanner Agent</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        // ── ACTIVE PROPOSAL STATE (3-COLUMN COMPARISON) ──
                        <div className="flex-1 flex flex-col justify-between space-y-6 h-full">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
                            
                            {/* Column 1: Before Plan */}
                            <div className="glass-panel p-5 bg-white flex flex-col h-[500px]">
                              <div className="border-b border-slate-100 pb-3 mb-4 shrink-0">
                                <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest">1. Before Plan</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Work missed or delayed</p>
                              </div>
                              
                              <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar text-left">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs mb-3 space-y-1">
                                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Original Deadline</span>
                                  <p className="font-extrabold text-slate-700">
                                    {new Date(selectedGoal.recoveryProposal.originalDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  {selectedGoal.recoveryProposal.beforeSessions.map((s) => (
                                    <div key={s.id} className="p-3 rounded-xl border border-rose-100 bg-rose-50/10 text-xs">
                                      <p className="font-bold text-slate-700 leading-snug">{s.title}</p>
                                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-rose-100/30 text-[10px] text-rose-500 font-medium">
                                        <span>Original: {s.dayStr}</span>
                                        <span className="capitalize">{s.timeSlot}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Column 2: Updated Plan */}
                            <div className="glass-panel p-5 bg-white flex flex-col h-[500px]">
                              <div className="border-b border-slate-100 pb-3 mb-4 shrink-0">
                                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">2. Updated Plan</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Recalculated schedule and deadline</p>
                              </div>

                              <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar text-left">
                                {/* Suggested Deadline */}
                                {(() => {
                                  const isExtended = selectedGoal.recoveryProposal.suggestedDeadline !== selectedGoal.recoveryProposal.originalDeadline;
                                  return (
                                    <div className={`p-3 rounded-xl border text-xs mb-3 space-y-1 ${
                                      isExtended ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-slate-50 border-slate-100 text-slate-700'
                                    }`}>
                                      <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Proposed Deadline</span>
                                        {isExtended && (
                                          <span className="text-[8px] font-black text-amber-600 bg-amber-100/60 px-1.5 py-0.5 rounded-md uppercase">
                                            Extended
                                          </span>
                                        )}
                                      </div>
                                      <p className="font-extrabold">
                                        {new Date(selectedGoal.recoveryProposal.suggestedDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </p>
                                    </div>
                                  );
                                })()}

                                <div className="space-y-2">
                                  {selectedGoal.recoveryProposal.updatedSessions
                                    .filter(us => selectedGoal.recoveryProposal?.beforeSessions.some(bs => bs.id === us.id))
                                    .map((s) => (
                                      <div key={s.id} className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/10 text-xs">
                                        <p className="font-bold text-slate-700 leading-snug">{s.title}</p>
                                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-indigo-100/30 text-[10px] text-indigo-600 font-semibold">
                                          <span>Rescheduled: {s.dayStr}</span>
                                          <span className="capitalize">{s.timeSlot}</span>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </div>

                            {/* Column 3: Recovery Strategy */}
                            <div className="glass-panel p-5 bg-white flex flex-col h-[500px]">
                              <div className="border-b border-slate-100 pb-3 mb-4 shrink-0">
                                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest">3. Recovery Strategy</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Gemini analysis & action items</p>
                              </div>

                              <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar text-xs text-left">
                                {/* Why changes were made */}
                                <div className="space-y-1.5">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Why changes were made</span>
                                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 text-slate-600 leading-relaxed font-semibold">
                                    {selectedGoal.recoveryProposal.explanation}
                                  </div>
                                </div>

                                {/* Recovery Plan steps */}
                                <div className="space-y-2 pt-1">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">AI Recovery Action items</span>
                                  <div className="space-y-2">
                                    {selectedGoal.recoveryProposal.recoveryPlan.map((step, idx) => (
                                      <div key={idx} className="flex items-start gap-2.5">
                                        <div className="w-4.5 h-4.5 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600 shrink-0 mt-0.5">
                                          {idx + 1}
                                        </div>
                                        <p className="text-slate-600 leading-normal">{step}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>

                          {/* Floating Accept/Reject Actions Bar */}
                          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/50 flex-shrink-0">
                            <button
                              onClick={() => rejectRecoveryProposal(selectedGoal.id)}
                              className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-xl text-slate-600 cursor-pointer"
                            >
                              Discard Proposal
                            </button>
                            
                            <button
                              onClick={() => applyRecoveryProposal(selectedGoal.id, selectedGoal.recoveryProposal!)}
                              className="btn-primary flex items-center gap-2 px-6 py-2.5 text-xs font-black shadow-md cursor-pointer"
                            >
                              <CheckCircle2 size={14} className="text-white" />
                              <span>Apply AI Recovery Plan</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
