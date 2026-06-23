'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  CheckCircle2, Clock, Brain, Target
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

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
  deadline: string;
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

interface CalendarViewProps {
  goals: Goal[];
}

export default function CalendarView({ goals }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Helper: Get milestone exact date
  const getMilestoneDate = (goal: Goal, daysFromStart: number): Date => {
    const start = goal.createdAt?.toDate?.() ?? new Date();
    const date = new Date(start);
    date.setDate(date.getDate() + daysFromStart);
    return date;
  };

  // Compile all calendar events (deadlines & milestones)
  const events = useMemo(() => {
    const list: Array<{
      type: 'goal' | 'milestone';
      dateStr: string; // YYYY-MM-DD
      title: string;
      description?: string;
      priority?: 'high' | 'medium' | 'low';
      completed: boolean;
      goalTitle: string;
    }> = [];

    goals.forEach((goal) => {
      // Goal deadline event
      const goalDeadlineStr = new Date(goal.deadline).toISOString().split('T')[0];
      list.push({
        type: 'goal',
        dateStr: goalDeadlineStr,
        title: `Deadline: ${goal.title}`,
        description: goal.description,
        completed: goal.milestones.length > 0 && goal.milestones.every(m => m.completed),
        goalTitle: goal.title
      });

      // Milestones events
      goal.milestones.forEach((m) => {
        const milestoneDate = getMilestoneDate(goal, m.daysFromStart);
        const milestoneDateStr = milestoneDate.toISOString().split('T')[0];
        list.push({
          type: 'milestone',
          dateStr: milestoneDateStr,
          title: m.title,
          description: m.description,
          priority: m.priority,
          completed: m.completed,
          goalTitle: goal.title
        });
      });
    });

    return list;
  }, [goals]);

  // Generate calendar grid dates
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const grid: Date[] = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      grid.push(new Date(currentYear, currentMonth - 1, lastDayOfPrevMonth - i));
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth; i++) {
      grid.push(new Date(currentYear, currentMonth, i));
    }

    // Next month padding to reach multiple of 7
    const remainingDays = 42 - grid.length;
    for (let i = 1; i <= remainingDays; i++) {
      grid.push(new Date(currentYear, currentMonth + 1, i));
    }

    return grid;
  }, [currentYear, currentMonth]);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Month Name Helper
  const monthName = currentDate.toLocaleDateString('default', { month: 'long' });

  // Get events on a specific date
  const getEventsForDate = (date: Date) => {
    const dStr = date.toISOString().split('T')[0];
    return events.filter(e => e.dateStr === dStr);
  };

  // Selected date events
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      
      {/* ── LEFT CELL: CALENDAR GRID ──────────────────────── */}
      <div className="flex-1 p-6 flex flex-col overflow-y-auto no-scrollbar space-y-4">
        
        {/* Month Selector header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon size={18} className="text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">{monthName} {currentYear}</h1>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={prevMonth}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft size={14} className="text-slate-600" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 text-xs border border-slate-200 hover:bg-slate-50 transition-colors rounded-lg font-bold text-slate-600"
            >
              Today
            </button>
            <button 
              onClick={nextMonth}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight size={14} className="text-slate-600" />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 text-[10px] tracking-wider uppercase mb-1">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-2 flex-1 min-h-[300px]">
          {calendarGrid.map((day, idx) => {
            const isToday = new Date().toDateString() === day.toDateString();
            const isCurrentMonth = day.getMonth() === currentMonth;
            const dayEvents = getEventsForDate(day);
            const isSelected = selectedDate?.toDateString() === day.toDateString();

            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={`min-h-[60px] p-1.5 rounded-xl border flex flex-col justify-between cursor-pointer hover:border-indigo-200 transition-all ${
                  isSelected ? 'border-indigo-600 ring-2 ring-indigo-50 bg-indigo-50/5' : 
                  isToday ? 'border-slate-300 bg-slate-50' : 'border-slate-100'
                } ${isCurrentMonth ? 'bg-white' : 'bg-slate-50/40 text-slate-300'}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold ${
                    isToday ? 'bg-indigo-600 text-white w-4 h-4 rounded-full flex items-center justify-center' :
                    isCurrentMonth ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    {day.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  )}
                </div>

                {/* Micro Event Dot Toggles */}
                <div className="flex flex-wrap gap-0.5 mt-1 overflow-hidden h-[16px] max-w-full">
                  {dayEvents.slice(0, 3).map((e, ei) => (
                    <span
                      key={ei}
                      className="w-1 h-1 rounded-full flex-shrink-0"
                      style={{
                        background: e.type === 'goal' ? '#E11D48' :
                          e.priority === 'high' ? '#F59E0B' :
                          e.priority === 'medium' ? '#6366F1' : '#22C55E'
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT PANEL: SELECTED DATE EVENTS LIST ────────── */}
      <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200/60 bg-white/40 backdrop-blur-md p-6 flex flex-col overflow-y-auto no-scrollbar">
        
        {/* Date view header */}
        <div className="border-b border-slate-100 pb-3 mb-4">
          <span className="label-luxury">Agenda</span>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight mt-0.5">
            {selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </h2>
        </div>

        {/* Selected date events list */}
        <div className="flex-1 space-y-3">
          {selectedDateEvents.length === 0 ? (
            <div className="text-center py-10">
              <Clock size={20} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">No deadlines or tasks scheduled.</p>
            </div>
          ) : (
            selectedDateEvents.map((e, idx) => (
              <div 
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200/50 bg-white/80 hover:shadow-sm transition-all space-y-1.5"
              >
                <div className="flex items-center gap-1.5">
                  {e.type === 'goal' ? (
                    <span className="p-1 rounded-md bg-rose-50 text-rose-500 flex-shrink-0">
                      <Target size={12} />
                    </span>
                  ) : (
                    <span className="p-1 rounded-md bg-indigo-50 text-indigo-500 flex-shrink-0">
                      <CheckCircle2 size={12} />
                    </span>
                  )}
                  <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wide truncate max-w-[70%]">
                    {e.goalTitle}
                  </span>
                </div>

                <p className="text-xs font-bold text-slate-800 leading-normal">{e.title}</p>
                {e.description && (
                  <p className="text-[10px] text-slate-500 leading-relaxed">{e.description}</p>
                )}
                
                <div className="flex items-center justify-between pt-1">
                  <span className={`text-[9px] font-bold uppercase ${e.completed ? 'text-green-500' : 'text-slate-400'}`}>
                    {e.completed ? 'Completed' : 'Pending'}
                  </span>
                  
                  {e.priority && (
                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                      e.priority === 'high' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                      e.priority === 'medium' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-green-50 border-green-100 text-green-600'
                    }`}>
                      {e.priority}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
}
