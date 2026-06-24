'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, ListTodo } from 'lucide-react';
import { Goal, Milestone } from '@/lib/types';

interface TasksViewProps {
  goals: Goal[];
  toggleMilestone: (goalId: string, milestones: Milestone[], milestoneId: string) => Promise<void>;
}

export default function TasksView({ goals, toggleMilestone }: TasksViewProps) {
  const [selectedGoalFilter, setSelectedGoalFilter] = useState<string>('all');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const priorityColors = {
    high: { bg: 'bg-rose-50 text-rose-600 border-rose-100', dot: '#F43F5E' },
    medium: { bg: 'bg-amber-50 text-amber-600 border-amber-100', dot: '#F59E0B' },
    low: { bg: 'bg-green-50 text-green-600 border-green-100', dot: '#22C55E' }
  };

  const allTasks = useMemo(() => {
    const tasks: Array<{
      goalId: string;
      goalTitle: string;
      milestone: Milestone;
    }> = [];

    goals.forEach((goal) => {
      goal.milestones.forEach((m) => {
        tasks.push({
          goalId: goal.id,
          goalTitle: goal.title,
          milestone: m
        });
      });
    });

    return tasks;
  }, [goals]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      const matchesGoal = selectedGoalFilter === 'all' || t.goalId === selectedGoalFilter;
      const matchesPriority = selectedPriorityFilter === 'all' || t.milestone.priority === selectedPriorityFilter;
      const matchesStatus = activeTab === 'completed' ? t.milestone.completed : !t.milestone.completed;
      
      return matchesGoal && matchesPriority && matchesStatus;
    });
  }, [allTasks, selectedGoalFilter, selectedPriorityFilter, activeTab]);

  return (
    <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Tasks Tracker</h1>
          <p className="text-sm text-slate-500">Manage and complete milestones across all active roadmaps.</p>
        </div>
      </div>

      <div className="glass-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Goal:</span>
            <select
              value={selectedGoalFilter}
              onChange={(e) => setSelectedGoalFilter(e.target.value)}
              className="glass-input px-3 py-1.5 text-xs text-slate-600 bg-white font-medium"
            >
              <option value="all">All Goals</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Priority:</span>
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="glass-input px-3 py-1.5 text-xs text-slate-600 bg-white font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

        </div>

        <div className="flex gap-1 p-1 rounded-xl w-fit border border-slate-100 bg-slate-50/50">
          {(['active', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all capitalize ${
                activeTab === tab 
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'active' ? 'Active' : 'Completed'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 bg-white/40 border border-slate-200/50 rounded-2xl">
            <ListTodo size={32} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">No tasks in this category</p>
            <p className="text-xs text-slate-400 mt-0.5">Try altering your priority or goal filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map(({ goalId, goalTitle, milestone }, i) => {
              const style = priorityColors[milestone.priority] ?? priorityColors.low;
              return (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="glass-panel p-4 flex items-start gap-3 hover:scale-[1.01] transition-transform animate-fade-in"
                >
                  <button
                    onClick={() => {
                      const goal = goals.find((g) => g.id === goalId);
                      if (goal) toggleMilestone(goalId, goal.milestones, milestone.id);
                    }}
                    className="mt-0.5 flex"
                  >
                    <div className={`milestone-checkbox ${milestone.completed ? 'checked' : ''}`}>
                      {milestone.completed && <CheckCircle2 size={11} className="text-white" />}
                    </div>
                  </button>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-full truncate max-w-[50%]">
                        {goalTitle}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border h-fit ${style.bg}`}>
                        {milestone.priority}
                      </span>
                    </div>

                    <p className={`text-xs font-bold ${milestone.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {milestone.title}
                    </p>
                    
                    <p className="text-[11px] text-slate-500 leading-normal line-clamp-2">
                      {milestone.description}
                    </p>

                    <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-400 font-semibold">
                      <Clock size={11} />
                      <span>Due on Day {milestone.daysFromStart} from target start</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
