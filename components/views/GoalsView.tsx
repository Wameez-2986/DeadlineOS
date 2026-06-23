'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Target, Calendar, CheckCircle2, Circle, Clock, Trash2,
  Sparkles, Search, SlidersHorizontal, ChevronRight, AlertTriangle
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

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

interface GoalsViewProps {
  goals: Goal[];
  selectedGoalId: string | null;
  setSelectedGoalId: (id: string | null) => void;
  setShowNewGoal: (show: boolean) => void;
  toggleMilestone: (goalId: string, milestones: Milestone[], milestoneId: string) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
}

export default function GoalsView({
  goals,
  selectedGoalId,
  setSelectedGoalId,
  setShowNewGoal,
  toggleMilestone,
  deleteGoal
}: GoalsViewProps) {
  const [search, setSearch] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<string>('all');

  // Days left helper
  const daysLeft = (dateStr: string) => {
    const deadline = new Date(dateStr);
    const today = new Date();
    return Math.max(0, Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Urgency colors
  const urgencyColor = (level?: string, dl?: number) => {
    const actualDl = dl ?? 999;
    if (actualDl < 3 || level === 'critical') return '#F43F5E';
    if (actualDl < 10 || level === 'high') return '#F59E0B';
    if (actualDl < 30 || level === 'moderate') return '#6366F1';
    return '#22C55E';
  };

  // Priority dot colors
  const priorityDot: Record<string, string> = {
    high: '#F59E0B',
    medium: '#6366F1',
    low: '#22C55E',
  };

  // Filter goals
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      const matchesSearch = g.title.toLowerCase().includes(search.toLowerCase()) || 
        (g.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesUrgency = filterUrgency === 'all' || g.urgencyLevel === filterUrgency;
      return matchesSearch && matchesUrgency;
    });
  }, [goals, search, filterUrgency]);

  // Selected goal details
  const selectedGoal = goals.find((g) => g.id === selectedGoalId) ?? filteredGoals[0] ?? null;

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      
      {/* ── LEFT PANEL: SEARCH & LIST ─────────────────────── */}
      <div className="w-full md:w-80 border-r border-slate-200/60 flex flex-col bg-white/40 backdrop-blur-md">
        
        {/* Search & Actions */}
        <div className="p-4 border-b border-slate-100 space-y-3 flex-shrink-0">
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

          {/* Urgency Quick Filters */}
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

        {/* Goals Scrollable List */}
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
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: color }}
                      />
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {g.title}
                      </p>
                    </div>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteGoal(g.id); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-opacity flex-shrink-0"
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

      {/* ── RIGHT PANEL: DETAILED TARGET GOAL ──────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/20">
        {selectedGoal ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            
            {/* Header info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className={`badge uppercase text-[9px] mb-1 font-bold ${
                  selectedGoal.urgencyLevel === 'critical' ? 'badge-pending text-rose-600 bg-rose-50 border-rose-100' :
                  selectedGoal.urgencyLevel === 'high' ? 'badge-pending text-amber-600 bg-amber-50 border-amber-100' : 'badge-progress'
                }`}>
                  {selectedGoal.urgencyLevel ?? 'Moderate'} Urgency
                </span>
                <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">{selectedGoal.title}</h1>
                <p className="text-xs text-slate-400 mt-0.5">Deadline: {formatDate(selectedGoal.deadline)} ({daysLeft(selectedGoal.deadline)} days remaining)</p>
              </div>
            </div>

            {/* AI Overview Box */}
            <div className="glass-panel p-5">
              <p className="label-luxury mb-2">AI Strategic Roadmap Overview</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedGoal.overview || "Our generative AI will review your timeline context and write a customized roadmap overview here once milestones are compiled."}
              </p>
            </div>

            {/* Milestones list */}
            <div className="space-y-3">
              <h3 className="label-luxury">Milestone Checklist</h3>
              
              {selectedGoal.milestones.length === 0 ? (
                <div className="text-center py-10 bg-white/40 rounded-2xl border border-slate-200/50">
                  <p className="text-xs text-slate-400 italic">No milestones generated yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedGoal.milestones.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="glass-panel-sm p-4 hover:shadow-sm transition-all"
                      style={{ opacity: m.completed ? 0.7 : 1 }}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleMilestone(selectedGoal.id, selectedGoal.milestones, m.id)}
                          className="mt-0.5 flex-shrink-0 flex"
                        >
                          <div className={`milestone-checkbox ${m.completed ? 'checked' : ''}`}>
                            {m.completed && <CheckCircle2 size={11} className="text-white" />}
                          </div>
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className={`text-xs font-bold ${m.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {m.title}
                            </h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: priorityDot[m.priority] ?? '#94A3B8' }}
                                title={`${m.priority} priority`}
                              />
                              <span className="text-[10px] text-slate-400 font-semibold">Day {m.daysFromStart}</span>
                            </div>
                          </div>
                          <p className={`text-[11px] leading-relaxed ${m.completed ? 'text-slate-300' : 'text-slate-500'}`}>
                            {m.description}
                          </p>
                          {!m.completed && m.suggestions?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {m.suggestions.map((s, si) => (
                                <span
                                  key={si}
                                  className="text-[10px] px-2 py-0.5 rounded-full text-indigo-600 font-semibold"
                                  style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
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
