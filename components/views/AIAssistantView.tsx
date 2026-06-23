'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Send, Sparkles, AlertCircle, RefreshCw,
  Clock, Zap, CheckCircle2, ChevronRight, MessageSquare
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

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  ts: number;
}

interface AIAssistantViewProps {
  goals: Goal[];
}

export default function AIAssistantView({ goals }: AIAssistantViewProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<string>('all');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: 'model',
      text: "Welcome to your AI Chief of Staff console. Select a goal context on the left or type a general consulting request to begin.",
      ts: 0
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Selected goal context helper
  const selectedGoal = goals.find(g => g.id === selectedGoalId) ?? null;

  // Days left helper
  const daysLeft = (dateStr: string) => {
    const deadline = new Date(dateStr);
    const today = new Date();
    return Math.max(0, Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  };

  // Context-switching handler
  const changeContext = (id: string) => {
    setSelectedGoalId(id);
    const targetGoal = goals.find(g => g.id === id) ?? null;
    if (targetGoal) {
      setMessages([
        {
          role: 'model',
          text: `Hello! I'm your AI Chief of Staff for "${targetGoal.title}". You have ${daysLeft(targetGoal.deadline)} days remaining. Let's work on completing your milestones. Ask me anything, or run one of the strategic actions below.`,
          ts: 0
        }
      ]);
    } else {
      setMessages([
        {
          role: 'model',
          text: "Welcome to your AI Chief of Staff console. Select a goal context on the left or type a general consulting request to begin.",
          ts: 0
        }
      ]);
    }
  };

  // Strategic prompt templates
  const templates = [
    { label: "Analyze Timeline Risk", prompt: "Identify any high priority milestones that are in danger of causing a delay, and provide unblocking actions." },
    { label: "Draft Focus Plan", prompt: "List my top 3 actionable focus items for today based on active milestones." },
    { label: "Milestone Recommendations", prompt: "Review my completed milestones and suggest acceleration tips for the pending roadmap items." }
  ];

  const handleSend = async (customPrompt?: string) => {
    const text = (customPrompt || input).trim();
    if (!text || sending) return;
    
    setInput('');
    setSending(true);

    const userMsg: ChatMessage = { role: 'user', text, ts: messages.length + 1 };
    setMessages(prev => [...prev, userMsg]);

    // Construct body parameters matching API expectation
    const goalTitle = selectedGoal ? selectedGoal.title : "DeadlineOS Workspace";
    const goalDeadline = selectedGoal ? selectedGoal.deadline : new Date().toISOString();
    const milestones = selectedGoal ? selectedGoal.milestones.map(m => ({
      title: m.title,
      completed: m.completed,
      daysFromStart: m.daysFromStart
    })) : [];

    try {
      const res = await fetch('/api/cos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat-advisor',
          message: text,
          goal: goalTitle,
          deadline: goalDeadline,
          milestones: milestones,
          history: messages.map(m => ({ role: m.role, text: m.text }))
        })
      });
      const json = await res.json();
      if (json.success) {
        setMessages(prev => [...prev, { role: 'model', text: json.reply, ts: prev.length }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: 'Error contacting assistant.', ts: prev.length }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'Connection timed out. Please try again.', ts: prev.length }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      
      {/* ── LEFT CELL: CONTEXT SELECTOR ───────────────────── */}
      <div className="w-full md:w-72 border-r border-slate-200/60 bg-white/40 backdrop-blur-md p-4 flex flex-col space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">AI Advisor Context</h2>
          <p className="text-[11px] text-slate-400">Select which active goal context the AI should focus on.</p>
        </div>

        {/* Goal context select list */}
        <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
          <div
            onClick={() => changeContext('all')}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
              selectedGoalId === 'all' 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold font-sans' 
                : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <p className="text-xs">General Workspace Consulting</p>
            <p className="text-[10px] text-slate-400 font-normal mt-0.5">No specific goal focus</p>
          </div>

          {goals.map((g) => (
            <div
              key={g.id}
              onClick={() => changeContext(g.id)}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                selectedGoalId === g.id 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' 
                  : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <p className="text-xs truncate">{g.title}</p>
              <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                {g.milestones.filter(m => m.completed).length}/{g.milestones.length} Milestones Done
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT CELL: CHAT INTERFACE ─────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/20">
        
        {/* Chat Header */}
        <div 
          className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-150 bg-white/60 backdrop-blur-md"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
          >
            <Brain size={15} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">AI Chief of Staff</p>
            <p className="text-[10px] text-green-500 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Online
            </p>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="max-w-[80%] space-y-1">
                {msg.role === 'model' && (
                  <div className="flex items-center gap-1 ml-1">
                    <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wide">Advisor</span>
                  </div>
                )}
                <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                  {msg.text}
                </div>
              </div>
            </motion.div>
          ))}
          
          {sending && (
            <div className="flex flex-col items-start animate-pulse">
              <div className="chat-bubble-ai flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">CoS is analyzing your roadmap context...</span>
              </div>
            </div>
          )}
          
          <div ref={bottomRef} />
        </div>

        {/* Prompt Templates Drawer */}
        <div className="px-6 py-2 bg-white/40 border-t border-slate-100 flex flex-wrap gap-2">
          {templates.map((t, idx) => (
            <button
              key={idx}
              disabled={sending}
              onClick={() => handleSend(t.prompt)}
              className="text-[10px] px-2.5 py-1 rounded-lg border border-indigo-100 bg-indigo-50/5 text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              ✨ {t.label}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Ask your advisor how to hit your next milestone..."
            className="flex-1 glass-input px-4 py-3 text-xs text-slate-800 placeholder:text-slate-400"
            disabled={sending}
          />
          <button
            onClick={() => handleSend()}
            disabled={sending || !input.trim()}
            className="btn-primary p-3 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
            style={{ width: '40px', height: '40px', padding: '0' }}
          >
            <Send size={14} className="text-white" />
          </button>
        </div>

      </div>

    </div>
  );
}
