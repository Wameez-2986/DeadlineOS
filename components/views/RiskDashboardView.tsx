'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, AlertTriangle, CheckCircle2, Clock, Activity, Sparkles, RefreshCw,
  FileText, Calendar, ShieldAlert, ChevronRight, AlertCircle, PlayCircle, ArrowLeft
} from 'lucide-react';
import { Goal } from '@/lib/types';

interface RiskDashboardViewProps {
  goals: Goal[];
  runRiskAssessment: (goalId: string) => Promise<void>;
  onNavigate: (view: 'dashboard' | 'goals' | 'tasks' | 'calendar' | 'ai' | 'settings' | 'risk' | 'planner') => void;
  selectedGoalId: string | null;
  setSelectedGoalId: (id: string | null) => void;
}

export default function RiskDashboardView({
  goals,
  runRiskAssessment,
  onNavigate,
  selectedGoalId,
  setSelectedGoalId
}: RiskDashboardViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [now] = useState(() => Date.now());
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  const selectedGoal = useMemo(() => {
    return goals.find((g) => g.id === selectedGoalId) || goals[0] || null;
  }, [goals, selectedGoalId]);

  const handleSelectGoal = (id: string) => {
    setSelectedGoalId(id);
    setError('');
  };

  const handleAudit = async (goalId: string) => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await runRiskAssessment(goalId);
    } catch {
      setError('Analysis failed. Please verify API configuration and try again.');
    } finally {
      setLoading(false);
    }
  };

  const liveStats = useMemo(() => {
    if (!selectedGoal) return { velocity: 0, daysLeft: 0, pendingHigh: 0, completedPct: 0 };
    
    const dl = Math.max(0, Math.ceil((new Date(selectedGoal.deadline).getTime() - now) / 86400000));
    
    let velocity = 0;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    selectedGoal.milestones.forEach((m) => {
      (m.subtasks ?? []).forEach((s) => {
        if (s.completed && s.completedAt) {
          const completedMs = typeof s.completedAt.toMillis === 'function'
            ? s.completedAt.toMillis()
            : new Date(s.completedAt as unknown as string).getTime();
          if (completedMs >= sevenDaysAgo) {
            velocity++;
          }
        }
      });
    });

    const pendingHigh = selectedGoal.milestones.filter(m => !m.completed && m.priority === 'high').length;

    const totalMilestones = selectedGoal.milestones.length;
    const completedMilestones = selectedGoal.milestones.filter(m => m.completed).length;
    const completedPct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    return { velocity, daysLeft: dl, pendingHigh, completedPct };
  }, [selectedGoal, now]);

  const riskConfig = (score: number) => {
    if (score <= 35) {
      return {
        label: 'Low Risk / On Track',
        color: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.08)',
        borderColor: 'rgba(16, 185, 129, 0.2)',
        textColor: 'text-emerald-700',
        gaugeColor: 'stroke-emerald-500',
        icon: CheckCircle2
      };
    }
    if (score <= 70) {
      return {
        label: 'Moderate Risk',
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.08)',
        borderColor: 'rgba(245, 158, 11, 0.2)',
        textColor: 'text-amber-700',
        gaugeColor: 'stroke-amber-500',
        icon: AlertTriangle
      };
    }
    return {
      label: 'High Risk / Critical',
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.08)',
      borderColor: 'rgba(239, 68, 68, 0.2)',
      textColor: 'text-rose-700',
      gaugeColor: 'stroke-rose-500',
      icon: ShieldAlert
    };
  };

  const renderGauge = (score: number) => {
    const config = riskConfig(score);
    const r = 45;
    const circ = 2 * Math.PI * r;
    const angleRange = 240;
    const dashArray = (circ * angleRange) / 360;
    const dashOffset = dashArray - (score / 100) * dashArray;

    return (
      <div className="relative w-44 h-36 flex flex-col items-center justify-center">
        <svg viewBox="0 0 120 120" className="w-full h-full rotate-[-210deg]">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="8"
            strokeDasharray={`${dashArray} ${circ}`}
            strokeLinecap="round"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            className={`transition-all duration-1000 ${config.gaugeColor}`}
            strokeWidth="9"
            strokeDasharray={`${dashArray} ${circ}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              stroke: config.color,
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-3">
          <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{score}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Risk Index</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full">
      <div className={`w-full md:w-80 border-r border-slate-200/60 bg-white/40 flex-col shrink-0 ${mobileView === 'list' ? 'flex' : 'hidden md:flex'}`}>
        <div className="p-4 border-b border-slate-100/80">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Select Goal Context</h2>
          <p className="text-xs text-slate-400">Choose a deadline target to analyze</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
          {goals.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No goals available to assess.</p>
            </div>
          ) : (
            goals.map((g) => {
              const isSelected = g.id === selectedGoal?.id;
              const hasAnalysis = !!g.riskAnalysis;
              const analysis = g.riskAnalysis;
              const config = analysis ? riskConfig(analysis.riskScore) : null;

              return (
                <button
                  key={g.id}
                  onClick={() => { handleSelectGoal(g.id); setMobileView('detail'); }}
                  className="w-full text-left p-3.5 rounded-xl transition-all duration-150 relative border group flex flex-col gap-1 cursor-pointer select-none"
                  style={{
                    background: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent',
                    borderColor: isSelected ? 'rgba(99,102,241,0.18)' : 'rgba(226, 232, 240, 0.4)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-bold leading-tight truncate ${isSelected ? 'text-indigo-700 font-extrabold' : 'text-slate-700'}`}>
                      {g.title}
                    </p>
                    <ChevronRight size={14} className={`text-slate-300 group-hover:text-indigo-500 transition-colors ${isSelected ? 'text-indigo-500 translate-x-0.5' : ''}`} />
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/50">
                    <span className="text-[10px] text-slate-400">
                      {Math.max(0, Math.ceil((new Date(g.deadline).getTime() - now) / 86400000))}d left
                    </span>
                    
                    {hasAnalysis && analysis ? (
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config?.color }} />
                        <span className="text-[10px] font-bold" style={{ color: config?.color }}>
                          {analysis.riskScore} Risk
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <AlertCircle size={8} /> No Audit
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={`flex-1 bg-luxury-grid overflow-y-auto p-6 space-y-6 no-scrollbar flex-col justify-between ${mobileView === 'detail' ? 'flex' : 'hidden md:flex'}`}>
        {!selectedGoal ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <ShieldAlert size={48} className="text-slate-300 mb-3 animate-pulse" />
            <h3 className="text-lg font-bold text-slate-800">No Goal Context</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">Please create a goal first to view and audit its timeline risks.</p>
            <button
              onClick={() => onNavigate('goals')}
              className="btn-primary mt-4 text-xs font-semibold py-2 px-4"
            >
              Go to Goals Manager
            </button>
          </div>
        ) : (
          <div className="space-y-6 flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/55">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden flex items-center gap-1.5 text-xs font-bold text-indigo-600 mb-2 w-fit cursor-pointer"
                >
                  <ArrowLeft size={14} className="text-indigo-600" /> Back to Goal List
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Risk Audit Context
                    </span>
                    {selectedGoal.riskAnalysis && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={10} /> Audited {new Date(selectedGoal.riskAnalysis.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-1">{selectedGoal.title}</h1>
                </div>
              </div>

              <button
                onClick={() => handleAudit(selectedGoal.id)}
                disabled={loading}
                className="btn-primary flex items-center gap-2 px-5 py-3 text-xs font-extrabold cursor-pointer shrink-0"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                    <span>Analyzing Risks...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4.5 h-4.5 text-yellow-300 fill-yellow-300" />
                    <span>{selectedGoal.riskAnalysis ? 'Re-run Risk Assessment' : 'Run AI Risk Assessment'}</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <AnimatePresence mode="wait">
              {!selectedGoal.riskAnalysis ? (
                <motion.div
                  key="no-analysis"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass-panel p-8 text-center flex flex-col items-center justify-center max-w-2xl mx-auto my-12"
                >
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
                    <Activity size={32} className="text-indigo-600 animate-pulse" />
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-800">Financial-Grade Risk Assessment</h2>
                  <p className="text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
                    Audit your goal&apos;s progress rate, task prioritizations, current timeline buffer, and task velocity. 
                    Our AI advisor will generate a risk model, miss probability index, and dynamic recovery strategy.
                  </p>
                  
                  <div className="mt-6 grid grid-cols-2 gap-4 w-full max-w-sm">
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-left">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Task Velocity</span>
                      <p className="text-sm font-black text-slate-700 mt-1">{liveStats.velocity} completed / 7d</p>
                    </div>
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-left">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Days Buffer</span>
                      <p className="text-sm font-black text-slate-700 mt-1">{liveStats.daysLeft} days remaining</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAudit(selectedGoal.id)}
                    disabled={loading}
                    className="btn-primary mt-8 flex items-center gap-2 px-6 py-3.5 text-sm font-black"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Running Assessment...</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 text-white" />
                        <span>Run AI Risk Assessment</span>
                      </>
                    )}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="audit-report"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    <div className="lg:col-span-5 glass-panel p-6 flex flex-col items-center justify-between relative overflow-hidden">
                      <div className="absolute top-4 left-4 flex items-center gap-1.5">
                        <Activity size={14} className="text-slate-400" />
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Deadline Health</span>
                      </div>
                      
                      <div className="mt-8 mb-2 flex items-center justify-center">
                        {renderGauge(selectedGoal.riskAnalysis.riskScore)}
                      </div>

                      <div
                        className="px-4 py-2 rounded-xl border text-xs font-black flex items-center gap-1.5 shadow-sm"
                        style={{
                          backgroundColor: riskConfig(selectedGoal.riskAnalysis.riskScore).bgColor,
                          borderColor: riskConfig(selectedGoal.riskAnalysis.riskScore).borderColor,
                        }}
                      >
                        {React.createElement(riskConfig(selectedGoal.riskAnalysis.riskScore).icon, {
                          size: 14,
                          style: { color: riskConfig(selectedGoal.riskAnalysis.riskScore).color }
                        })}
                        <span style={{ color: riskConfig(selectedGoal.riskAnalysis.riskScore).color }}>
                          {riskConfig(selectedGoal.riskAnalysis.riskScore).label}
                        </span>
                      </div>
                    </div>

                    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="glass-panel p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Miss Probability</span>
                            <ShieldAlert size={14} className="text-slate-400" />
                          </div>
                          <p className="text-3xl font-black text-slate-800 tracking-tight mt-2">
                            {selectedGoal.riskAnalysis.missProbability}%
                          </p>
                        </div>
                        <div className="mt-3">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000"
                              style={{
                                width: `${selectedGoal.riskAnalysis.missProbability}%`,
                                backgroundColor: riskConfig(selectedGoal.riskAnalysis.riskScore).color
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="glass-panel p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Velocity Score</span>
                            <TrendingUp size={14} className="text-indigo-500" />
                          </div>
                          <p className="text-3xl font-black text-slate-800 tracking-tight mt-2">
                            {liveStats.velocity}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          tasks completed in the last 7 days.
                        </p>
                      </div>

                      <div className="glass-panel p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Timeline Buffer</span>
                            <Calendar size={14} className="text-slate-400" />
                          </div>
                          <p className="text-3xl font-black text-slate-800 tracking-tight mt-2">
                            {liveStats.daysLeft}d
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          days remaining until target deadline date.
                        </p>
                      </div>

                      <div className="glass-panel p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Milestones Met</span>
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          </div>
                          <p className="text-3xl font-black text-slate-800 tracking-tight mt-2">
                            {liveStats.completedPct}%
                          </p>
                        </div>
                        <div className="mt-3">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                              style={{ width: `${liveStats.completedPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    <div className="md:col-span-6 space-y-4">
                      <div className="flex items-center gap-2 px-1">
                        <FileText size={16} className="text-indigo-500" />
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">AI Audit Reasoning</h3>
                      </div>
                      
                      <div
                        className="p-5 rounded-2xl border text-sm text-slate-600 leading-relaxed shadow-sm space-y-3 bg-white"
                        style={{
                          borderLeftWidth: '5px',
                          borderLeftColor: riskConfig(selectedGoal.riskAnalysis.riskScore).color
                        }}
                      >
                        <p>{selectedGoal.riskAnalysis.reasoning}</p>
                      </div>
                    </div>

                    <div className="md:col-span-6 space-y-4">
                      <div className="flex items-center gap-2 px-1">
                        <Sparkles size={16} className="text-yellow-500" />
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">AI Suggested Recovery Plan</h3>
                      </div>

                      <div className="glass-panel p-5 space-y-3.5 bg-white">
                        {selectedGoal.riskAnalysis.recoveryPlan.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
