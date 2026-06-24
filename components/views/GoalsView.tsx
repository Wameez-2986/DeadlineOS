'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Calendar, CheckCircle2, Trash2, Search, Compass, ChevronDown,
  ChevronUp, Columns, ArrowRight, ArrowLeft, Brain
} from 'lucide-react';
import { Goal, Milestone, WeeklyObjective, Subtask } from '@/lib/types';

interface GoalsViewProps {
  goals: Goal[];
  selectedGoalId: string | null;
  setSelectedGoalId: (id: string | null) => void;
  setShowNewGoal: (show: boolean) => void;
  toggleMilestone: (goalId: string, milestones: Milestone[], milestoneId: string) => Promise<void>;
  toggleSubtask: (goalId: string, milestones: Milestone[], milestoneId: string, subtaskId: string) => Promise<void>;
  updateSubtaskStatus: (goalId: string, milestones: Milestone[], milestoneId: string, subtaskId: string, newStatus: 'todo' | 'in_progress' | 'done') => Promise<void>;
  toggleWeeklyObjective: (goalId: string, weeklyObjectives: WeeklyObjective[], objectiveId: string) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
}

export default function GoalsView({
  goals,
  selectedGoalId,
  setSelectedGoalId,
  setShowNewGoal,
  toggleMilestone,
  toggleSubtask,
  updateSubtaskStatus,
  toggleWeeklyObjective,
  deleteGoal
}: GoalsViewProps) {
  const [search, setSearch] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'timeline' | 'kanban' | 'roadmap'>('timeline');
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});

  const daysLeft = (dateStr: string) => {
    const deadline = new Date(dateStr);
    const today = new Date();
    return Math.max(0, Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const formatDateStr = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMilestoneDate = (goal: Goal, daysFromStart: number): Date => {
    const start = goal.createdAt?.toDate?.() ?? new Date();
    const date = new Date(start);
    date.setDate(date.getDate() + daysFromStart);
    return date;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const urgencyColor = (level?: string, dl?: number) => {
    const actualDl = dl ?? 999;
    if (actualDl < 3 || level === 'critical') return '#F43F5E';
    if (actualDl < 10 || level === 'high') return '#F59E0B';
    if (actualDl < 30 || level === 'moderate') return '#6366F1';
    return '#22C55E';
  };

  const priorityDot: Record<string, string> = {
    high: '#F43F5E',
    medium: '#F59E0B',
    low: '#22C55E',
  };

  const difficultyColors = {
    easy: 'bg-green-50 text-green-600 border border-green-100',
    medium: 'bg-amber-50 text-amber-600 border border-amber-100',
    hard: 'bg-rose-50 text-rose-600 border border-rose-100',
  };

  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      const matchesSearch = g.title.toLowerCase().includes(search.toLowerCase()) || 
        (g.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesUrgency = filterUrgency === 'all' || g.urgencyLevel === filterUrgency;
      return matchesSearch && matchesUrgency;
    });
  }, [goals, search, filterUrgency]);

  const selectedGoal = goals.find((g) => g.id === selectedGoalId) ?? filteredGoals[0] ?? null;

  const toggleMilestoneExpand = (id: string) => {
    setExpandedMilestones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const subtasksByStatus = useMemo(() => {
    const todo: Array<{ milestoneId: string; subtask: Subtask }> = [];
    const inProgress: Array<{ milestoneId: string; subtask: Subtask }> = [];
    const done: Array<{ milestoneId: string; subtask: Subtask }> = [];

    if (!selectedGoal) return { todo, inProgress, done };

    (selectedGoal.milestones ?? []).forEach((m) => {
      (m.subtasks ?? []).forEach((st) => {
        const status = st.status || (st.completed ? 'done' : 'todo');
        if (status === 'done') {
          done.push({ milestoneId: m.id, subtask: st });
        } else if (status === 'in_progress') {
          inProgress.push({ milestoneId: m.id, subtask: st });
        } else {
          todo.push({ milestoneId: m.id, subtask: st });
        }
      });
    });

    return { todo, inProgress, done };
  }, [selectedGoal]);

  const progressStats = useMemo(() => {
    if (!selectedGoal) return { percent: 0, completed: 0, total: 0 };
    
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    
    (selectedGoal.milestones ?? []).forEach((m) => {
      (m.subtasks ?? []).forEach((st) => {
        totalSubtasks++;
        if (st.completed) completedSubtasks++;
      });
    });

    const totalWeekly = (selectedGoal.weeklyObjectives ?? []).length;
    const completedWeekly = (selectedGoal.weeklyObjectives ?? []).filter(wo => wo.completed).length;

    const totalItems = totalSubtasks + totalWeekly;
    const completedItems = completedSubtasks + completedWeekly;

    const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    return { percent, completed: completedItems, total: totalItems };
  }, [selectedGoal]);

  const aiAdvisorInsight = useMemo(() => {
    if (!selectedGoal) return '';
    const pct = progressStats.percent;
    if (pct === 0) {
      return "Advisor Insight: Let's lay the groundwork! Start by reviewing Week 1's weekly objectives and completing the first subtasks of Milestone 1 to build execution momentum.";
    }
    if (pct > 0 && pct < 50) {
      return "Advisor Insight: Steady progress. Focus on resolving the pending high-priority tasks in the queue. Complete active subtasks in the Kanban board to secure the timeline.";
    }
    if (pct >= 50 && pct < 100) {
      return "Advisor Insight: Strong velocity! You are past the halfway point. Keep checking off weekly objectives and ensure the upcoming milestone dates align with your expectations.";
    }
    return "Advisor Insight: Goal fully achieved! Exceptional execution. Your Chief of Staff AI congratulates you on cracking this target roadmap on schedule.";
  }, [selectedGoal, progressStats.percent]);

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      
      <div className="w-full md:w-80 border-r border-slate-200/60 flex flex-col bg-white/40 backdrop-blur-md">
        
        <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">Goals List</h2>
            <button
              onClick={() => setShowNewGoal(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
            >
              + Add Goal
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search goals..."
              className="glass-input w-full pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {['all', 'critical', 'high', 'moderate', 'relaxed'].map((urg) => (
              <button
                key={urg}
                onClick={() => setFilterUrgency(urg)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border transition-all capitalize ${
                  filterUrgency === urg 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'bg-white/80 border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {urg}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
          {filteredGoals.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Target size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-500">No goals found</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Adjust filter or create a new goal.</p>
            </div>
          ) : (
            filteredGoals.map((g) => {
              const dl = daysLeft(g.deadline);
              const completed = g.milestones.filter((m) => m.completed).length;
              const total = g.milestones.length;
              const color = urgencyColor(g.urgencyLevel, dl);
              const isSelected = selectedGoal?.id === g.id;

              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGoalId(g.id)}
                  className="w-full text-left p-3 rounded-xl border transition-all cursor-pointer relative group flex flex-col gap-2"
                  style={{
                    background: isSelected ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.4)',
                    borderColor: isSelected ? 'rgba(99,102,241,0.2)' : 'rgba(226,232,240,0.6)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                        style={{ background: color }}
                      />
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {g.title}
                      </p>
                    </div>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteGoal(g.id); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-opacity shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>{completed}/{total} Milestones</span>
                    <span className="font-semibold">{dl} days left</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/20">
        {selectedGoal ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className={`badge uppercase text-[9px] mb-1 font-bold ${
                  selectedGoal.urgencyLevel === 'critical' ? 'badge-pending text-rose-600 bg-rose-50 border-rose-100' :
                  selectedGoal.urgencyLevel === 'high' ? 'badge-pending text-amber-600 bg-amber-50 border-amber-100' : 'badge-progress'
                }`}>
                  {selectedGoal.urgencyLevel ?? 'Moderate'} Urgency
                </span>
                <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">{selectedGoal.title}</h1>
                <p className="text-xs text-slate-400 mt-0.5">Deadline: {formatDateStr(selectedGoal.deadline)} ({daysLeft(selectedGoal.deadline)} days remaining)</p>
              </div>
            </div>

            <div className="flex gap-1 p-1 rounded-xl w-fit border border-slate-200 bg-slate-50/40 backdrop-blur-sm">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`py-1.5 px-4 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Calendar size={13} /> Timeline
              </button>
              <button
                onClick={() => setActiveTab('kanban')}
                className={`py-1.5 px-4 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'kanban'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Columns size={13} /> Kanban Board
              </button>
              <button
                onClick={() => setActiveTab('roadmap')}
                className={`py-1.5 px-4 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'roadmap'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Compass size={13} /> Progress Roadmap
              </button>
            </div>

            <div className="glass-panel p-5">
              <p className="label-luxury mb-2">AI Strategic Roadmap Overview</p>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                {selectedGoal.overview || "Our generative AI will review your timeline context and write a customized roadmap overview here once milestones are compiled."}
              </p>
            </div>

            <div className="mt-4">
              <AnimatePresence mode="wait">
                
                {activeTab === 'timeline' && (
                  <motion.div
                    key="timeline"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="relative space-y-4 pl-8"
                  >
                    <div className="absolute left-4.5 top-4 bottom-4 w-0.5 bg-slate-200" />
                    <div 
                      className="absolute left-4.5 top-4 w-0.5 bg-indigo-500 shadow-[0_0_8px_#6366f1] transition-all duration-550" 
                      style={{ 
                        height: `calc(${
                          selectedGoal.milestones.length > 0
                            ? (selectedGoal.milestones.filter(m => m.completed).length / selectedGoal.milestones.length) * 100
                            : 0
                        }% - 8px)`
                      }} 
                    />

                    {selectedGoal.milestones.length === 0 ? (
                      <div className="text-center py-10 bg-white/40 rounded-2xl border border-slate-200/50">
                        <p className="text-xs text-slate-400 italic">No milestones generated yet.</p>
                      </div>
                    ) : (
                      selectedGoal.milestones.map((m, i) => {
                        const isExpanded = expandedMilestones[m.id];
                        const completedSubtasks = (m.subtasks ?? []).filter(s => s.completed).length;
                        const totalSubtasks = (m.subtasks ?? []).length;
                        const mDate = getMilestoneDate(selectedGoal, m.daysFromStart);

                        return (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="relative space-y-2 group"
                          >
                            <button
                              onClick={() => toggleMilestone(selectedGoal.id, selectedGoal.milestones, m.id)}
                              className="absolute -left-7.5 top-1.5 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center z-10 transition-all hover:scale-105"
                              style={{ borderColor: m.completed ? '#6366F1' : '#CBD5E1' }}
                            >
                              {m.completed ? (
                                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-slate-400" />
                              )}
                            </button>

                            <div className="glass-panel-sm p-5 hover:shadow-md transition-all space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100/55 pb-2">
                                <div className="space-y-1">
                                  <h4 className={`text-xs font-bold ${m.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                    {m.title}
                                  </h4>
                                  <p className="text-[10px] text-slate-400 font-semibold">Due: {formatDate(mDate)} (Day {m.daysFromStart})</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 h-fit">
                                  <span className={`text-[8px] px-2 py-0.5 rounded font-bold uppercase ${difficultyColors[m.difficulty || 'medium']}`}>
                                    {m.difficulty || 'Medium'}
                                  </span>
                                  <span 
                                    className="w-2 h-2 rounded-full inline-block"
                                    style={{ background: priorityDot[m.priority] ?? '#94A3B8' }}
                                    title={`${m.priority} priority`}
                                  />
                                </div>
                              </div>

                              <p className={`text-xs leading-relaxed ${m.completed ? 'text-slate-400 animate-pulse' : 'text-slate-600'}`}>
                                {m.description}
                              </p>

                              {!m.completed && m.suggestions?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {m.suggestions.map((s, si) => (
                                    <span
                                      key={si}
                                      className="text-[9px] px-2 py-0.5 rounded-full text-indigo-600 font-medium"
                                      style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.08)' }}
                                    >
                                      💡 {s}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {(m.subtasks ?? []).length > 0 && (
                                <button
                                  onClick={() => toggleMilestoneExpand(m.id)}
                                  className="w-full flex items-center justify-between pt-2 border-t border-slate-100/50 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                  <span>Subtasks ({completedSubtasks} of {totalSubtasks} done)</span>
                                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                              )}

                              {isExpanded && (m.subtasks ?? []).length > 0 && (
                                <div className="pt-2 space-y-2 pl-2">
                                  {m.subtasks?.map((st) => (
                                    <div 
                                      key={st.id} 
                                      className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/50 border border-slate-100 hover:bg-slate-50 transition-colors"
                                    >
                                      <button
                                        onClick={() => toggleSubtask(selectedGoal.id, selectedGoal.milestones, m.id, st.id)}
                                        className="mt-0.5 flex"
                                      >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                                          st.completed 
                                            ? 'bg-indigo-600 border-indigo-600' 
                                            : 'bg-white border-slate-200 hover:border-slate-350'
                                        }`}>
                                          {st.completed && <CheckCircle2 size={10} className="text-white" />}
                                        </div>
                                      </button>
                                      <span className={`text-[11px] font-medium leading-tight ${st.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                        {st.title}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </motion.div>
                )}

                {activeTab === 'kanban' && (
                  <motion.div
                    key="kanban"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-4"
                  >
                    {[
                      { id: 'todo', title: 'To Do', items: subtasksByStatus.todo, color: 'border-t-indigo-400 bg-indigo-50/5' },
                      { id: 'in_progress', title: 'In Progress', items: subtasksByStatus.inProgress, color: 'border-t-amber-400 bg-amber-50/5' },
                      { id: 'done', title: 'Done', items: subtasksByStatus.done, color: 'border-t-green-400 bg-green-50/5' }
                    ].map((col) => (
                      <div 
                        key={col.id}
                        className={`flex flex-col border border-slate-200/60 rounded-2xl p-4 min-h-87.5 space-y-3 ${col.color}`}
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-bold text-slate-700">{col.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-500">
                            {col.items.length}
                          </span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2.5 max-h-112.5 no-scrollbar pr-0.5">
                          {col.items.length === 0 ? (
                            <div className="text-center py-10">
                              <p className="text-[10px] text-slate-400 italic">Column is empty</p>
                            </div>
                          ) : (
                            col.items.map(({ milestoneId, subtask }) => {
                              const milestone = selectedGoal.milestones.find(m => m.id === milestoneId);
                              return (
                                <motion.div
                                  layout
                                  key={subtask.id}
                                  className="glass-panel-sm p-3 hover:shadow transition-all space-y-2 flex flex-col justify-between"
                                >
                                  <div>
                                    <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded uppercase border border-indigo-100 inline-block max-w-full truncate mb-1">
                                      {milestone?.title}
                                    </span>
                                    <p className={`text-[11px] font-semibold leading-tight ${subtask.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                      {subtask.title}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between border-t border-slate-50/80 pt-2 mt-1">
                                    <span className="text-[8px] text-slate-400 font-bold">
                                      {milestone ? `Day ${milestone.daysFromStart}` : ''}
                                    </span>
                                    
                                    <div className="flex gap-1.5">
                                      {col.id !== 'todo' && (
                                        <button
                                          onClick={() => updateSubtaskStatus(selectedGoal.id, selectedGoal.milestones, milestoneId, subtask.id, col.id === 'done' ? 'in_progress' : 'todo')}
                                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500 cursor-pointer"
                                          title="Move Back"
                                        >
                                          <ArrowLeft size={10} />
                                        </button>
                                      )}
                                      {col.id !== 'done' && (
                                        <button
                                          onClick={() => updateSubtaskStatus(selectedGoal.id, selectedGoal.milestones, milestoneId, subtask.id, col.id === 'todo' ? 'in_progress' : 'done')}
                                          className="p-1 rounded bg-indigo-55 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                                          title="Move Forward"
                                        >
                                          <ArrowRight size={10} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {activeTab === 'roadmap' && (
                  <motion.div
                    key="roadmap"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      <div className="glass-panel p-5 flex flex-col justify-between">
                        <span className="label-luxury block mb-2">Overall Progress</span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-3xl font-extrabold text-indigo-600">{progressStats.percent}%</span>
                          <span className="text-xs text-slate-400 font-semibold">({progressStats.completed}/{progressStats.total} Items)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mt-3">
                          <div 
                            className="h-full rounded-full bg-indigo-600 transition-all duration-550" 
                            style={{ width: `${progressStats.percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="glass-panel p-5 flex flex-col justify-between border-l-4 border-l-amber-500">
                        <span className="label-luxury block mb-2">Difficulty Level</span>
                        <div className="mt-1">
                          <span className="text-xl font-black text-slate-800 capitalize">
                            {selectedGoal.difficultyLevel ?? 'medium'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal mt-2 font-sans">Gemini mapped your milestones to a {selectedGoal.difficultyLevel ?? 'moderate'} load profile.</p>
                      </div>

                      <div className="glass-panel p-5 flex flex-col justify-between border-l-4 border-l-indigo-600">
                        <span className="label-luxury block mb-2">Priority Level</span>
                        <div className="mt-1">
                          <span className="text-xl font-black text-slate-800 capitalize">
                            {selectedGoal.priorityLevel ?? 'medium'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal mt-2 font-sans">Priority rank determined as critical focus for timeline.</p>
                      </div>

                    </div>

                    <div className="glass-panel p-5 bg-linear-to-r from-indigo-50/20 to-amber-50/10 border border-indigo-100 flex gap-4 items-start">
                      <div className="p-2 bg-indigo-50/10 rounded-xl text-indigo-600 mt-0.5">
                        <Brain size={18} className="animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-700">AI Strategic Insights</h4>
                        <p className="text-xs text-slate-600 leading-relaxed font-sans">{aiAdvisorInsight}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="label-luxury">Weekly Milestones & Objectives</h3>
                      
                      {(!selectedGoal.weeklyObjectives || selectedGoal.weeklyObjectives.length === 0) ? (
                        <p className="text-xs text-slate-400 italic text-center py-6">No weekly objectives assigned.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedGoal.weeklyObjectives.map((wo, i) => (
                            <motion.div
                              key={wo.id}
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.03 }}
                              className="glass-panel-sm p-4 hover:shadow-sm transition-all flex items-start gap-3 relative overflow-hidden"
                              style={{ 
                                background: wo.completed ? 'rgba(34, 197, 94, 0.02)' : 'rgba(255,255,255,0.65)',
                                borderColor: wo.completed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.8)'
                              }}
                            >
                              <button
                                onClick={() => toggleWeeklyObjective(selectedGoal.id, selectedGoal.weeklyObjectives || [], wo.id)}
                                className="mt-0.5 shrink-0 flex cursor-pointer"
                              >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                  wo.completed ? 'bg-green-500 border-green-500' : 'bg-white border-slate-200 hover:border-slate-350'
                                }`}>
                                  {wo.completed && <CheckCircle2 size={11} className="text-white" />}
                                </div>
                              </button>

                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                  Week {wo.weekNumber} Target
                                </span>
                                <p className={`text-xs font-semibold leading-relaxed ${wo.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                  {wo.objective}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <Target size={36} className="text-indigo-400 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Goals Selected</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Create a goal or select an active goal from the sidebar to visualize milestones.
            </p>
            <button
              onClick={() => setShowNewGoal(true)}
              className="btn-primary mt-4 text-xs"
            >
              + Create New Goal
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
