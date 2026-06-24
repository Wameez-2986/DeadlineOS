'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Send, Sparkles, Brain, Trash2 } from 'lucide-react';
import { Goal, GoalData, ViewType, ChatMessage, AssistantAction } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { matchLocalAlias } from '@/lib/command-engine';

// --- Speech Recognition types ---
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent {
  error: string;
}
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

// --- Props (same as before) ---
interface FloatingVoiceAssistantProps {
  goals: Goal[];
  selectedGoalId: string | null;
  setSelectedGoalId: (id: string | null) => void;
  currentView: string;
  setCurrentView: (view: ViewType) => void;
  onMoveTasksToTomorrow: (goalId: string) => Promise<number>;
  onCreateGoal: (goalData: GoalData) => Promise<string | null>;
  onDeleteGoal?: (goalId: string) => Promise<void>;
  onToggleMilestone?: (goalId: string, milestoneId: string) => Promise<void>;
  onToggleSubtask?: (goalId: string, milestoneId: string, subtaskId: string) => Promise<void>;
}

type AssistantState = 'idle' | 'listening' | 'processing' | 'thinking' | 'speaking' | 'error';

export default function FloatingVoiceAssistant({
  goals,
  selectedGoalId,
  setSelectedGoalId,
  currentView,
  setCurrentView,
  onMoveTasksToTomorrow,
  onCreateGoal,
  onDeleteGoal,
  onToggleMilestone,
  onToggleSubtask
}: FloatingVoiceAssistantProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [input, setInput] = useState('');
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [clarificationOptions, setClarificationOptions] = useState<string[]>([]);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const finalTranscriptRef = useRef<string>('');
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Quick templates (unchanged)
  const quickTemplates = [
    { label: "📅 Show my deadlines", text: "Show my deadlines" },
    { label: "🔄 Reschedule to tomorrow", text: "Move my tasks to tomorrow" },
    { label: "📚 Create study plan", text: "Create a study plan for GATE 2027" },
    { label: "🚀 Generate roadmap", text: "Generate a project roadmap for building a web app" }
  ];

  // --- Speech output (unchanged) ---
  const speakResponse = useCallback((text: string) => {
    if (isMuted || typeof window === 'undefined') {
      setAssistantState('idle');
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`~[\]()]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.onstart = () => setAssistantState('speaking');
    utterance.onend = () => setAssistantState('idle');
    utterance.onerror = () => setAssistantState('idle');
    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  // --- Action executor (unchanged logic, but added small fixes) ---
  const executeAction = useCallback(async (intent: string, params?: AssistantAction['params']) => {
    switch (intent) {
      case 'OPEN_TASKS':
        setCurrentView('tasks');
        break;
      case 'SHOW_DEADLINES':
      case 'SHOW_GOALS':
        setCurrentView('goals');
        if (params?.goalId) setSelectedGoalId(params.goalId);
        break;
      case 'OPEN_DASHBOARD':
        setCurrentView('dashboard');
        break;
      case 'SHOW_CALENDAR':
        setCurrentView('calendar');
        break;
      case 'SHOW_INSIGHTS':
      case 'SHOW_PROGRESS':
        setCurrentView('risk');
        break;
      case 'SHOW_NOTIFICATIONS':
        setCurrentView('settings');
        break;
      case 'MOVE_TASKS': {
        const targetId = params?.goalId || selectedGoalId;
        if (targetId) {
          const moved = await onMoveTasksToTomorrow(targetId);
          setMessages(prev => [...prev, {
            role: 'model',
            text: `[System]: Successfully moved ${moved} incomplete tasks to tomorrow.`,
            ts: Date.now()
          }]);
        }
        break;
      }
      case 'DELETE_TASK': {
        const delId = params?.goalId || selectedGoalId;
        if (delId && onDeleteGoal) {
          await onDeleteGoal(delId);
          setMessages(prev => [...prev, {
            role: 'model',
            text: `[System]: Goal successfully deleted from your board.`,
            ts: Date.now()
          }]);
        }
        break;
      }
      case 'COMPLETE_TASK': {
        const compId = params?.goalId || selectedGoalId;
        if (compId) {
          if (params?.subtaskId && params?.milestoneId && onToggleSubtask) {
            await onToggleSubtask(compId, params.milestoneId, params.subtaskId);
          } else if (params?.milestoneId && onToggleMilestone) {
            await onToggleMilestone(compId, params.milestoneId);
          }
          setMessages(prev => [...prev, {
            role: 'model',
            text: `[System]: Task marked complete.`,
            ts: Date.now()
          }]);
        }
        break;
      }
      case 'CREATE_GOAL':
      case 'CREATE_STUDY_PLAN':
      case 'GENERATE_ROADMAP': {
        if (params?.goalTitle && params?.deadline) {
          setMessages(prev => [...prev, {
            role: 'model',
            text: `[System]: Creating roadmap "${params.goalTitle}"...`,
            ts: Date.now()
          }]);
          const newId = await onCreateGoal({
            goalTitle: params.goalTitle,
            goalDescription: params.goalDescription || '',
            deadline: params.deadline,
            difficultyLevel: params.difficultyLevel || 'medium',
            priorityLevel: params.priorityLevel || 'medium',
            overview: params.overview || '',
            urgencyLevel: params.urgencyLevel || '',
            milestones: params.milestones,
            weeklyObjectives: params.weeklyObjectives
          });
          if (newId) {
            setSelectedGoalId(newId);
            setCurrentView('goals');
          }
        }
        break;
      }
      default:
        break;
    }
  }, [selectedGoalId, onMoveTasksToTomorrow, onCreateGoal, onDeleteGoal, onToggleMilestone, onToggleSubtask, setSelectedGoalId, setCurrentView]);

  // --- Core handler: sends text to local alias or API ---
  const handleSend = useCallback(async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || assistantState === 'processing' || assistantState === 'thinking') return;

    setInput('');
    setClarificationOptions([]);
    setAssistantState('processing');

    const userMsg: ChatMessage = { role: 'user', text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    // 1. Try local alias matching
    const localMatch = matchLocalAlias(text);
    if (localMatch) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: localMatch.reply || 'Executing command.',
        ts: Date.now()
      }]);
      speakResponse(localMatch.reply || 'Executing command.');
      await executeAction(localMatch.intent, localMatch.params);
      setAssistantState('idle');
      return;
    }

    // 2. Fallback to Gemini API
    setAssistantState('thinking');
    try {
      const token = user ? await user.getIdToken() : '';
      const response = await fetch('/api/voice-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: text,
          currentView,
          selectedGoalId,
          goals,
          history: messages.map(m => ({ role: m.role, text: m.text }))
        })
      });

      const data = await response.json();

      if (data.success) {
        const { intent, confidence, reply, params } = data;

        if (confidence < 0.75 || intent === 'UNKNOWN') {
          setAssistantState('idle');
          const options = ["Open Tasks", "Open Goals", "Open Dashboard"];
          setClarificationOptions(options);
          const clarifyMsg = "I'm not completely sure about that. Did you mean:\n1. Open Tasks\n2. Open Goals\n3. Open Dashboard";
          setMessages(prev => [...prev, { role: 'model', text: clarifyMsg, ts: Date.now() }]);
          speakResponse("Did you mean, Open Tasks, Open Goals, or Open Dashboard?");
          return;
        }

        setMessages(prev => [...prev, { role: 'model', text: reply, ts: Date.now() }]);
        speakResponse(reply);
        if (intent !== 'CHAT') {
          await executeAction(intent, params);
        }
        setAssistantState('idle');
      } else {
        throw new Error('API returned success=false');
      }
    } catch (error) {
      const errMsg = "I had trouble processing your request. Please try again.";
      setAssistantState('error');
      setMessages(prev => [...prev, { role: 'model', text: `[System]: ${errMsg}`, ts: Date.now() }]);
      speakResponse(errMsg);
      // Auto‑reset error state after a moment
      setTimeout(() => setAssistantState('idle'), 3000);
    }
  }, [input, assistantState, currentView, selectedGoalId, goals, messages, user, speakResponse, executeAction]);

  // Refs to keep handlers fresh in speech callbacks
  const handleSendRef = useRef(handleSend);
  const speakResponseRef = useRef(speakResponse);

  useEffect(() => {
    handleSendRef.current = handleSend;
    speakResponseRef.current = speakResponse;
  }, [handleSend, speakResponse]);

  // --- Speech Recognition setup with continuous listening & silence detection ---
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setTimeout(() => {
        setRecognitionSupported(false);
      }, 0);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;          // Keep listening until we stop it
    rec.interimResults = true;      // We'll use interim for live feedback (optional)
    rec.lang = 'en-US';

    rec.onstart = () => {
      setAssistantState('listening');
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        }
      }

      if (final) {
        // Append to the accumulated final transcript
        finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + final;

        // Clear any existing silence timer and set a new one
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        silenceTimerRef.current = setTimeout(() => {
          // Silence detected – send the accumulated transcript
          if (finalTranscriptRef.current.trim()) {
            handleSendRef.current(finalTranscriptRef.current.trim());
            finalTranscriptRef.current = ''; // Reset for next command
          }
          silenceTimerRef.current = null;
        }, 1500); // 1.5 seconds of silence triggers send
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' is common – we can ignore it and keep listening
      if (event.error === 'no-speech') {
        // Do nothing, just wait for speech
        return;
      }

      // For other errors, show a message and stop listening
      let userMessage = '';
      if (event.error === 'network') {
        userMessage = "Speech recognition network failed. Please check connection.";
      } else if (event.error === 'not-allowed') {
        userMessage = "Microphone access blocked. Please enable browser microphone permissions.";
      } else if (event.error === 'audio-capture') {
        userMessage = "No microphone detected. Please plug in a recording device.";
      } else {
        userMessage = `Speech error: "${event.error}". Please try typing.`;
      }

      setAssistantState('error');
      setMessages(prev => [...prev, { role: 'model', text: `[System]: ${userMessage}`, ts: Date.now() }]);
      speakResponseRef.current(userMessage);
      // Stop recognition to avoid endless error loops
      try { rec.stop(); } catch (_) {}
      // Reset error state after a few seconds
      setTimeout(() => setAssistantState('idle'), 4000);
    };

    rec.onend = () => {
      // If we're still in 'listening' state, it means we were stopped manually or due to error
      setAssistantState((s) => (s === 'listening' ? 'idle' : s));
      // Clear any pending timer and transcript when recognition ends
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      finalTranscriptRef.current = '';
    };

    recognitionRef.current = rec;

    // Initial greeting
    setTimeout(() => {
      setMessages([
        {
          role: 'model',
          text: "Hi, I'm your Chief of Staff Voice Assistant. Try saying 'Show my deadlines' or 'Create a study plan'. How can I help you today?",
          ts: Date.now()
        }
      ]);
    }, 0);

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []); // empty deps – run once on mount

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, assistantState]);

  // --- Toggle microphone ---
  const startVoiceInput = () => {
    if (!recognitionRef.current) return;

    if (assistantState === 'listening') {
      // Stop listening
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setAssistantState('idle');
      // Clear any pending transcript and timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      finalTranscriptRef.current = '';
    } else {
      // Start listening
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
      try {
        // Reset transcript and timer before starting
        finalTranscriptRef.current = '';
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        recognitionRef.current.start();
      } catch (_) {
        // Ignore start errors (e.g., already started)
      }
    }
  };

  // --- Clear chat ---
  const clearChat = () => {
    setMessages([
      {
        role: 'model',
        text: "Conversation cleared. What can I do for you now?",
        ts: Date.now()
      }
    ]);
    setClarificationOptions([]);
    setAssistantState('idle');
  };

  const handleClarificationSelect = (option: string) => {
    setClarificationOptions([]);
    handleSend(option);
  };

  // --- UI state helpers ---
  const statusMap = {
    idle: { color: 'bg-emerald-500', text: 'Voice active' },
    listening: { color: 'bg-indigo-500 animate-ping', text: 'Listening...' },
    processing: { color: 'bg-amber-400 animate-pulse', text: 'Processing...' },
    thinking: { color: 'bg-indigo-600 animate-bounce', text: 'Thinking...' },
    speaking: { color: 'bg-pink-500 animate-pulse', text: 'Speaking...' },
    error: { color: 'bg-rose-500 animate-pulse', text: 'Error' }
  };
  const status = statusMap[assistantState] || statusMap.idle;

  // --- Render (unchanged, only minor adjustments if needed) ---
  return (
    <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 left-6 sm:left-auto sm:right-24 z-50 w-auto sm:w-[380px] h-[520px] glass-panel flex flex-col overflow-hidden border border-indigo-150/40 shadow-2xl pointer-events-auto"
            style={{
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(30px) saturate(190%)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white/40">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-linear-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
                  <Brain size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">AI Chief of Staff</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                    <span className="text-[10px] text-slate-500 font-bold">{status.text}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-1.5 rounded-lg border border-slate-200/50 hover:bg-slate-50 transition-colors text-slate-500 ${isMuted ? 'text-rose-500 bg-rose-50/50 border-rose-100' : ''}`}
                  title={isMuted ? "Unmute speech feedback" : "Mute speech feedback"}
                >
                  {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
                </button>
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg border border-slate-200/50 hover:bg-slate-50 hover:text-rose-500 transition-colors text-slate-500"
                  title="Clear conversation"
                >
                  <Trash2 size={13} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg border border-slate-200/50 hover:bg-slate-50 transition-colors text-slate-500"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar bg-slate-50/10">
              {messages.map((msg, i) => {
                const isSystem = msg.text.startsWith('[System]:');
                const displayText = isSystem ? msg.text.replace('[System]:', '') : msg.text;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="max-w-[85%] space-y-1">
                      {msg.role === 'model' && !isSystem && (
                        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider ml-1.5">
                          Chief of Staff
                        </span>
                      )}
                      <div
                        className={
                          isSystem
                            ? 'text-[11px] font-bold bg-indigo-50/80 border border-indigo-100 text-indigo-700 rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-sm'
                            : msg.role === 'user'
                            ? 'chat-bubble-user'
                            : 'chat-bubble-ai'
                        }
                      >
                        {isSystem && <Sparkles size={11} className="text-indigo-500 shrink-0" />}
                        <span>{displayText}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {clarificationOptions.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-amber-50/50 flex flex-col gap-2">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Clarify your intent:</p>
                <div className="flex flex-wrap gap-2">
                  {clarificationOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleClarificationSelect(opt)}
                      className="text-xs px-3 py-1.5 bg-white border border-amber-200 text-amber-800 rounded-xl hover:bg-amber-100 transition-colors shadow-sm font-semibold cursor-pointer"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-5 py-2.5 border-t border-slate-100/50 bg-white/30 flex flex-wrap gap-1.5">
              {quickTemplates.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(t.text)}
                  className="text-[9px] font-bold px-2 py-1 bg-white hover:bg-indigo-50 border border-slate-200/60 text-slate-600 hover:text-indigo-600 rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  {t.label}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {assistantState !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="absolute bottom-16 left-5 right-5 h-14 glass-panel border border-indigo-200/50 shadow-lg flex items-center justify-between px-4 bg-indigo-50/95"
                >
                  <div className="flex items-center gap-2.5">
                    {assistantState === 'listening' && (
                      <>
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                        <span className="text-xs font-bold text-indigo-700">Listening to your command...</span>
                      </>
                    )}
                    {assistantState === 'processing' && (
                      <>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-xs font-bold text-amber-700">Normalizing & parsing...</span>
                      </>
                    )}
                    {assistantState === 'thinking' && (
                      <>
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" />
                        <span className="text-xs font-bold text-indigo-700">Chief of Staff is thinking...</span>
                      </>
                    )}
                    {assistantState === 'speaking' && (
                      <>
                        <div className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
                        <span className="text-xs font-bold text-pink-700">Speaking...</span>
                      </>
                    )}
                    {assistantState === 'error' && (
                      <>
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-xs font-bold text-rose-700">Something went wrong.</span>
                      </>
                    )}
                  </div>

                  {(assistantState === 'listening' || assistantState === 'speaking') && (
                    <div className="flex items-end gap-1 h-6">
                      {[1.2, 0.6, 1.8, 0.9, 1.4, 0.7, 1.6, 1.1].map((val, idx) => (
                        <motion.div
                          key={idx}
                          className={`w-1 rounded-full ${
                            assistantState === 'listening'
                              ? 'bg-linear-gradient-to-t from-indigo-500 via-purple-500 to-pink-500'
                              : 'bg-linear-gradient-to-t from-pink-500 via-purple-500 to-indigo-500'
                          }`}
                          animate={{ height: ['20%', '100%', '20%'] }}
                          transition={{
                            duration: val,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: idx * 0.1
                          }}
                          style={{ height: '40%' }}
                        />
                      ))}
                    </div>
                  )}

                  {(assistantState === 'processing' || assistantState === 'thinking') && (
                    <div className="relative w-16 h-2 bg-indigo-100 rounded-full overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 w-6 bg-linear-gradient-to-r from-transparent via-indigo-500 to-transparent"
                        animate={{ left: ['-20%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-4 border-t border-slate-100 bg-white flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={
                  recognitionSupported
                    ? "Ask me anything or press mic to speak..."
                    : "Mic unsupported. Type your command here..."
                }
                className="flex-1 glass-input px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400"
                disabled={assistantState === 'processing' || assistantState === 'thinking'}
              />

              {recognitionSupported && (
                <button
                  onClick={startVoiceInput}
                  className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                    assistantState === 'listening'
                      ? 'bg-rose-500 text-white border-rose-600 glow-rose shadow-md animate-pulse'
                      : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                  }`}
                  title="Toggle Microphone"
                >
                  {assistantState === 'listening' ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
              )}

              <button
                onClick={() => handleSend()}
                disabled={assistantState === 'processing' || assistantState === 'thinking' || !input.trim()}
                className="btn-primary p-2.5 rounded-xl flex items-center justify-center shrink-0"
                style={{ width: '38px', height: '38px', padding: 0 }}
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 sm:right-24 z-50 w-14 h-14 rounded-full flex items-center justify-center text-white cursor-pointer shadow-xl overflow-hidden border border-indigo-400/20 pointer-events-auto"
        style={{
          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
          boxShadow: '0 8px 30px rgba(99, 102, 241, 0.45)',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent animate-spin-slow opacity-60 pointer-events-none" />

        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X size={20} className="stroke-[2.5]" />
            </motion.div>
          ) : (
            <motion.div
              key="mic"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="relative flex items-center justify-center"
            >
              <Sparkles size={20} className="animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        {!isOpen && (
          <div className="absolute inset-0 rounded-full border-2 border-indigo-400/30 animate-ping opacity-75" style={{ animationDuration: '3s' }} />
        )}
      </motion.button>
    </div>
  );
}
