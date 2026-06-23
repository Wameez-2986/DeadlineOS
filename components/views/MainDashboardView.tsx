'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Calendar, CheckCircle2, Circle, Clock,
  Sparkles, Brain, ArrowUpRight, ChevronRight, Target
} from 'lucide-react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Milestone {
  id: string;
  title: string;
  description: string;
  daysFromStart: number;
  priority: 'high' | 'medium' | 'low';
  suggestions: string[];
  completed: boolean;
  completedAt?: Timestamp | null;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  deadline: string;
  createdAt: Timestamp;
  milestones: Milestone[];
  overview?: string;
  urgencyLevel?: string;
  userId: string;
}

interface MainDashboardViewProps {
  goals: Goal[];
  onNavigate: (view: 'dashboard' | 'goals' | 'tasks' | 'calendar' | 'ai' | 'settings') => void;
  onSelectGoal: (id: string) => void;
}

export default function MainDashboardView({ goals, onNavigate, onSelectGoal }: MainDashboardViewProps) {
  // Statistics Calculations
  const stats = useMemo(() => {
    let totalMilestones = 0;
    let completedMilestones = 0;
    let highPriorityCount = 0;
    let overdueCount = 0;

    const todayMs = new Date().setHours(0, 0, 0, 0);

    goals.forEach((goal) => {
      const isOverdue = new Date(goal.deadline).getTime() < todayMs;
      goal.milestones.forEach((m) => {
        totalMilestones++;
        if (m.completed) {
          completedMilestones++;
        } else {
          if (m.priority === 'high') highPriorityCount++;
          if (isOverdue) overdueCount++;
        }
      });
    });

    const completionRate = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
    
    // Custom logic to yield a realistic "productivity score" based on completion + priority weights
    const productivityScore = totalMilestones > 0 
      ? Math.min(100, Math.round((completedMilestones / totalMilestones) * 90 + (goals.length > 0 ? 10 : 0)))
      : 0;

    return {
      totalMilestones,
      completedMilestones,
      completionRate,
      productivityScore,
      highPriorityCount,
      overdueCount
    };
  }, [goals]);

  // Today's Tasks: Get first 3 uncompleted milestones across all goals to show as "today's priorities"
  const todaysTasks = useMemo(() => {
    const list: Array<{ goalId: string; goalTitle: string; milestone: Milestone }> = [];
    goals.forEach((goal) => {
      goal.milestones.forEach((m) => {
        if (!m.completed && list.length < 4) {
          list.push({
            goalId: goal.id,
            goalTitle: goal.title,
            milestone: m
          });
        }
      });
    });
    return list;
  }, [goals]);

  // Toggle milestone completion directly from dashboard widget
  const handleToggleMilestone = async (goalId: string, milestoneId: string, completed: boolean) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const updatedMilestones = goal.milestones.map((m) =>
      m.id === milestoneId
        ? { ...m, completed: !completed, completedAt: !completed ? Timestamp.now() : null }
        : m
    );

    try {
      await updateDoc(doc(db, 'goals', goalId), { milestones: updatedMilestones });
    } catch (err) {
      console.error('Error updating milestone:', err);
    }
  };

  // Upcoming Deadlines (sorted by closest deadline)
  const upcomingGoals = useMemo(() => {
    const today = new Date().getTime();
    return [...goals]
      .map((g) => {
        const diffTime = new Date(g.deadline).getTime() - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...g, daysLeft: diffDays };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 3);
  }, [goals]);

  // Urgency indicator styling
  const getUrgencyStyles = (daysLeft: number, urgency?: string) => {
    if (daysLeft < 3 || urgency === 'critical') {
      return { border: 'border-rose-100 dark:border-rose-950/20 bg-rose-50/50', text: 'text-rose-600', dot: '#F43F5E' };
    }
    if (daysLeft < 10 || urgency === 'high') {
      return { border: 'border-amber-100 dark:border-amber-950/20 bg-amber-50/50', text: 'text-amber-600', dot: '#F59E0B' };
    }
    return { border: 'border-slate-100 dark:border-slate-900/20 bg-slate-50/50', text: 'text-indigo-600', dot: '#6366F1' };
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6">
      
      {/* ── HEADER & WELCOME ────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Workspace Overview</h1>
          <p className="text-sm text-slate-500">Your Chief of Staff has analyzed your active deadlines for today.</p>
        </div>
        <button
          onClick={() => onNavigate('goals')}
          className="btn-primary text-sm flex items-center gap-1.5"
        >
          <Sparkles size={14} /> Manage Goals
        </button>
      </div>

      {/* ── BENTO GRID ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* WIDGET 1: PRODUCTIVITY SCORE */}
        <div className="glass-panel p-5 flex flex-col justify-between min-h-[220px]">
          <div className="flex items-center justify-between">
            <span className="label-luxury">Productivity Index</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp size={16} />
            </span>
          </div>
          
          <div className="flex items-center gap-6 my-auto">
            {/* Visual Circular Gauge */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <motion.path
                  initial={{ strokeDasharray: '0, 100' }}
                  animate={{ strokeDasharray: `${stats.productivityScore}, 100` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="text-indigo-600"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-slate-800">{stats.productivityScore}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Score</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">Excellent Velocity</p>
              <p className="text-xs text-slate-500 leading-normal">
                You've completed {stats.completedMilestones} of {stats.totalMilestones} milestones across active roadmaps.
              </p>
            </div>
          </div>
          
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Streak: {goals.length > 0 ? 'Active' : 'No goals'}</span>
            <span className="text-green-500 font-semibold">{stats.completionRate}% completion rate</span>
          </div>
        </div>

        {/* WIDGET 2: TODAY'S TASKS Checklist */}
        <div className="glass-panel p-5 flex flex-col justify-between min-h-[220px] md:col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <span className="label-luxury">Today's Focus List</span>
            <button 
              onClick={() => onNavigate('tasks')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
            >
              All Tasks <ChevronRight size={12} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[140px] pr-1">
            {todaysTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-4 text-center">
                <CheckCircle2 size={24} className="text-green-400 mb-1.5" />
                <p className="text-sm font-medium text-slate-600">All caught up for today!</p>
                <p className="text-xs text-slate-400">Add goals or generate milestones to populate tasks.</p>
              </div>
            ) : (
              todaysTasks.map(({ goalId, goalTitle, milestone }) => (
                <div 
                  key={milestone.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100/50 hover:bg-slate-50/50 transition-colors"
                >
                  <button
                    onClick={() => handleToggleMilestone(goalId, milestone.id, milestone.completed)}
                    className="mt-0.5 flex"
                  >
                    <div className={`milestone-checkbox ${milestone.completed ? 'checked' : ''}`}>
                      {milestone.completed && <CheckCircle2 size={11} className="text-white" />}
                    </div>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{milestone.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">Goal: {goalTitle}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize h-fit ${
                    milestone.priority === 'high' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                    milestone.priority === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-green-50 text-green-600 border border-green-100'
                  }`}>
                    {milestone.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* WIDGET 3: UPCOMING DEADLINES */}
        <div className="glass-panel p-5 flex flex-col justify-between min-h-[240px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="label-luxury">Upcoming Deadlines</span>
              <Calendar size={15} className="text-slate-400" />
            </div>
            
            <div className="space-y-3">
              {upcomingGoals.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">No active deadlines.</p>
              ) : (
                upcomingGoals.map((g) => {
                  const style = getUrgencyStyles(g.daysLeft, g.urgencyLevel);
                  return (
                    <div 
                      key={g.id}
                      onClick={() => { onSelectGoal(g.id); onNavigate('goals'); }}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer hover:scale-[1.01] transition-all ${style.border}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{g.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {g.milestones.filter(m => m.completed).length}/{g.milestones.length} Milestones
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-bold ${style.text}`}>
                          {g.daysLeft < 0 ? 'Overdue' : `${g.daysLeft}d left`}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* WIDGET 4: GOAL PROGRESS OVERVIEWS */}
        <div className="glass-panel p-5 flex flex-col justify-between min-h-[240px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="label-luxury">Goal Progress Tracker</span>
              <Target size={15} className="text-slate-400" />
            </div>

            <div className="space-y-3.5 max-h-[160px] overflow-y-auto pr-1">
              {goals.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">No goals tracked yet.</p>
              ) : (
                goals.slice(0, 3).map((g) => {
                  const completed = g.milestones.filter(m => m.completed).length;
                  const total = g.milestones.length;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return (
                    <div key={g.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 truncate max-w-[70%]">{g.title}</span>
                        <span className="text-slate-400 font-medium">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-indigo-600 transition-all duration-500" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* WIDGET 5: AI RECOMMENDATIONS */}
        <div className="glass-panel p-5 flex flex-col justify-between min-h-[240px]">
          <div className="flex items-center gap-1.5">
            <span className="p-1 rounded-lg bg-amber-50 text-amber-500 flex-shrink-0">
              <Brain size={14} />
            </span>
            <span className="label-luxury">AI Recommendations</span>
          </div>

          <div className="my-auto py-2">
            {goals.length === 0 ? (
              <p className="text-xs text-slate-500 leading-relaxed italic">
                Create a goal and our AI Chief of Staff will analyze your timeline risk to supply dynamic task priority suggestions.
              </p>
            ) : stats.overdueCount > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-700 leading-relaxed">
                  ⚠️ **Timeline Warning**: You have goals past their deadlines. We recommend focusing on immediate milestone completions in overdue plans.
                </p>
              </div>
            ) : stats.highPriorityCount > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs text-slate-700 leading-relaxed">
                  🚀 **High Priority Alert**: There are **{stats.highPriorityCount}** critical milestones pending. Prioritize high-priority milestones to secure your target deadlines.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs text-slate-700 leading-relaxed">
                  ✨ **All Clear**: You're following your schedule accurately. Consider starting on early tasks for upcoming goals to stay ahead of timeline spikes.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('ai')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-2 text-left"
          >
            Ask AI Assistant <ArrowUpRight size={13} />
          </button>
        </div>

        {/* WIDGET 6: WEEKLY PROGRESS CHART */}
        <div className="glass-panel p-5 flex flex-col justify-between min-h-[220px] md:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between">
            <span className="label-luxury">Weekly Activity Track</span>
            <span className="text-xs font-semibold text-slate-400">Last 7 Days</span>
          </div>

          <div className="flex items-end justify-between h-[100px] px-4 mt-3">
            {[
              { day: 'Mon', completed: 2, height: '40%' },
              { day: 'Tue', completed: 4, height: '70%' },
              { day: 'Wed', completed: 1, height: '25%' },
              { day: 'Thu', completed: 5, height: '85%' },
              { day: 'Fri', completed: 3, height: '55%' },
              { day: 'Sat', completed: 0, height: '10%' },
              { day: 'Sun', completed: 2, height: '40%' }
            ].map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-2 w-[10%] group">
                <div className="relative w-full h-[65px] bg-slate-50/50 rounded-lg flex items-end overflow-hidden border border-slate-100/30">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: d.height }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                    className="w-full bg-indigo-550 rounded-b-md"
                    style={{ background: 'linear-gradient(to top, #4F46E5, #6366F1)' }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
