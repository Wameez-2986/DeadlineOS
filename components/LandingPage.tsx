'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Zap, ArrowRight, Target, Clock, Brain, CheckCircle2,
  Sparkles, Star, Loader2, BarChart3, MessageSquare, Play
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DemoMilestone {
  title: string;
  description: string;
  daysFromStart: number;
  priority: 'high' | 'medium' | 'low';
  suggestions: string[];
}

function FloatingOrb({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{ filter: 'blur(60px)', ...style }}
    />
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  accent,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
  delay: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="bento-card p-6 flex flex-col gap-4"
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center"
        style={{ background: accent, boxShadow: `0 4px 14px ${accent}55` }}
      >
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <h3 className="font-bold text-slate-800 text-base mb-1.5">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

function StepCard({ number, title, description, delay }: { number: string; title: string; description: string; delay: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="flex gap-5"
    >
      <div className="shrink-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
        >
          {number}
        </div>
      </div>
      <div className="pt-1">
        <h3 className="font-bold text-slate-800 mb-1">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

const priorityConfig = {
  high: { label: 'High', className: 'badge badge-pending', dot: 'bg-amber-400' },
  medium: { label: 'Medium', className: 'badge badge-progress', dot: 'bg-indigo-400' },
  low: { label: 'Low', className: 'badge badge-done', dot: 'bg-green-400' },
};

const phrases = ['before deadlines slip.', 'with AI-backed clarity.', 'like a Chief of Staff.'];

export default function LandingPage() {
  const router = useRouter();

  const [demoGoal, setDemoGoal] = useState('');
  const [demoDeadline, setDemoDeadline] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoMilestones, setDemoMilestones] = useState<DemoMilestone[]>([]);
  const [demoOverview, setDemoOverview] = useState('');
  const [demoUrgency, setDemoUrgency] = useState('');
  const [demoError, setDemoError] = useState('');

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const full = phrases[phraseIndex];
    let timeout: ReturnType<typeof setTimeout>;
    if (typing) {
      if (displayed.length < full.length) {
        timeout = setTimeout(() => setDisplayed(full.slice(0, displayed.length + 1)), 55);
      } else {
        timeout = setTimeout(() => setTyping(false), 2200);
      }
    } else {
      if (displayed.length > 0) {
        timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 28);
      } else {
        timeout = setTimeout(() => {
          setPhraseIndex((i) => (i + 1) % phrases.length);
          setTyping(true);
        }, 0);
      }
    }
    return () => clearTimeout(timeout);
  }, [displayed, typing, phraseIndex]);

  const runDemo = async () => {
    router.push('/auth');
    return;
  };

  const minDeadline = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  const urgencyColors: Record<string, string> = {
    critical: '#EF4444',
    high: '#F59E0B',
    moderate: '#6366F1',
    relaxed: '#22C55E',
  };

  return (
    <div className="flex flex-col min-h-screen bg-luxury-grid overflow-x-hidden">

      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 w-full"
        style={{
          background: 'rgba(250, 250, 247, 0.82)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
            >
              <Zap size={15} className="text-white" />
            </div>
            <span className="text-base font-bold text-slate-800 tracking-tight">DeadlineOS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium">Features</a>
            <a href="#how-it-works" className="text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium">How it Works</a>
            <a href="#demo" className="text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium">Live Demo</a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              id="nav-signin"
              onClick={() => router.push('/auth')}
              className="btn-secondary px-5 py-2 text-sm"
            >
              Sign In
            </button>
            <button
              id="nav-getstarted"
              onClick={() => router.push('/auth')}
              className="btn-primary px-5 py-2 text-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </motion.header>

      <section className="relative flex flex-col items-center justify-center pt-24 pb-20 px-6 overflow-hidden">
        <FloatingOrb
          className="w-150 h-100 -top-20 left-1/2 -translate-x-1/2"
          style={{ background: 'rgba(99, 102, 241, 0.08)' }}
        />
        <FloatingOrb
          className="w-96 h-96 bottom-0 right-10"
          style={{ background: 'rgba(245, 158, 11, 0.06)' }}
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
          style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
          }}
        >
          <Sparkles size={13} className="text-indigo-500" />
          <span className="text-xs font-semibold text-indigo-600 tracking-wide">Powered by Google Gemini</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="heading-display text-center max-w-4xl mb-4"
        >
          <span className="text-gradient-hero">Time is your only</span>
          <br />
          <span className="text-gradient-hero">currency. Spend it</span>
          <br />
          <span className="text-slate-700 min-h-[1.2em] inline-block">
            {displayed}
            <span className="inline-block w-0.5 h-10 bg-indigo-500 ml-1 align-middle animate-pulse" />
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center text-slate-500 text-lg max-w-xl mb-10 leading-relaxed"
        >
          DeadlineOS is your AI-powered Chief of Staff — it breaks any goal into a
          bulletproof milestone plan and coaches you to the finish line.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-12"
        >
          <button
            id="hero-cta-primary"
            onClick={() => router.push('/auth')}
            className="btn-primary text-base px-7 py-3.5"
          >
            Start for Free <ArrowRight size={18} />
          </button>
          <a href="#demo" className="btn-secondary text-base px-7 py-3.5">
            <Play size={16} /> See Live Demo
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-6 text-sm text-slate-400"
        >
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {['#6366F1', '#F59E0B', '#22C55E', '#EF4444'].map((c, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-white"
                  style={{ background: c }}
                />
              ))}
            </div>
            <span>1,200+ goals achieved</span>
          </div>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
            ))}
            <span className="ml-1">4.9/5</span>
          </div>
        </motion.div>
      </section>

      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="label-luxury mb-3">Everything you need</p>
            <h2 className="heading-xl text-slate-800">
              Built for people who <span className="text-gradient-indigo">refuse to miss</span>
            </h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto text-base">
              From AI-generated milestones to real-time coaching — every feature is designed to keep you relentlessly on track.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={Brain}
              title="AI Milestone Generation"
              description="Describe any goal and a deadline. Gemini breaks it into a precise, actionable milestone roadmap instantly."
              accent="linear-gradient(135deg, #6366F1, #4F46E5)"
              delay={0}
            />
            <FeatureCard
              icon={Clock}
              title="Urgency Meter"
              description="Visual countdown rings color-code your deadline pressure — so you always know exactly how critical your situation is."
              accent="linear-gradient(135deg, #F59E0B, #D97706)"
              delay={0.08}
            />
            <FeatureCard
              icon={MessageSquare}
              title="AI Chief of Staff Chat"
              description="Conversational AI advisor that knows your milestones, tracks your progress, and gives sharp, contextual coaching."
              accent="linear-gradient(135deg, #8B5CF6, #6366F1)"
              delay={0.16}
            />
            <FeatureCard
              icon={CheckCircle2}
              title="Live Milestone Tracking"
              description="Interactive checklists sync to Firestore in real time. Check a milestone and every metric updates instantly."
              accent="linear-gradient(135deg, #22C55E, #16A34A)"
              delay={0.24}
            />
            <FeatureCard
              icon={BarChart3}
              title="Progress Analytics"
              description="At-a-glance completion metrics show exactly how far you've come — and how much runway you have left."
              accent="linear-gradient(135deg, #3B82F6, #1D4ED8)"
              delay={0.32}
            />
            <FeatureCard
              icon={Target}
              title="Firebase-Backed Security"
              description="Your goals and data are protected by Google's enterprise-grade Firebase Auth and Firestore infrastructure."
              accent="linear-gradient(135deg, #EF4444, #DC2626)"
              delay={0.4}
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-6" style={{ background: 'rgba(238, 242, 255, 0.4)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="label-luxury mb-3">Simple & powerful</p>
            <h2 className="heading-xl text-slate-800">
              From idea to <span className="text-gradient-amber">done in minutes</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="flex flex-col gap-10">
              <StepCard
                number="01"
                title="Define your goal & deadline"
                description="Enter any goal — a product launch, an exam, a business milestone — and set your deadline. No templates, no friction."
                delay={0}
              />
              <StepCard
                number="02"
                title="AI generates your roadmap"
                description="Gemini analyzes the timeline pressure and crafts a bespoke, prioritized milestone plan tailored to your specific goal."
                delay={0.1}
              />
              <StepCard
                number="03"
                title="Execute with AI coaching"
                description="Check off milestones as you complete them. Consult your AI Chief of Staff anytime for strategic guidance and motivation."
                delay={0.2}
              />
              <StepCard
                number="04"
                title="Hit your deadline"
                description="With clear milestones and real-time urgency tracking, you always know what's next — and never lose sight of the finish line."
                delay={0.3}
              />
            </div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
            >
              <div className="glass-panel p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="label-luxury">Active Goal</p>
                    <h3 className="font-bold text-slate-800 text-lg mt-1">Launch iOS App</h3>
                  </div>
                  <div
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#D97706', border: '1px solid rgba(245,158,11,0.25)' }}
                  >
                    14 days left
                  </div>
                </div>

                <div className="flex items-center gap-4 py-3">
                  <div className="relative w-16 h-16 shrink-0">
                    <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#E2E8F0" strokeWidth="6" />
                      <circle
                        cx="32" cy="32" r="26"
                        fill="none" stroke="#F59E0B" strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 26 * 0.43} ${2 * Math.PI * 26}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-slate-700">43%</span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-slate-700">3 of 7 milestones done</p>
                    <p className="text-slate-400 text-xs mt-0.5">Ahead of schedule</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { title: 'Design System Setup', done: true },
                    { title: 'Core API Integration', done: true },
                    { title: 'Auth & User Profiles', done: true },
                    { title: 'App Store Submission', done: false },
                    { title: 'Beta Testing Round', done: false },
                  ].map((m, i) => (
                    <div key={i} className="milestone-item">
                      <div className={`milestone-checkbox ${m.done ? 'checked' : ''}`}>
                        {m.done && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <span className={`text-sm ${m.done ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>
                        {m.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="demo" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="label-luxury mb-3">Try it now — sign in required</p>
            <h2 className="heading-xl text-slate-800">
              See AI <span className="text-gradient-indigo">plan your goal</span> live
            </h2>
            <p className="text-slate-500 mt-4">
              Enter any real goal and a deadline. Watch Gemini break it into milestones instantly.
            </p>
          </div>

          <div className="glass-panel p-8">
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label-luxury block mb-2">Your Goal</label>
                <input
                  id="demo-goal"
                  type="text"
                  value={demoGoal}
                  onChange={(e) => setDemoGoal(e.target.value)}
                  placeholder="e.g. Launch my SaaS MVP"
                  className="glass-input w-full px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400"
                  onKeyDown={(e) => e.key === 'Enter' && runDemo()}
                />
              </div>
              <div>
                <label className="label-luxury block mb-2">Deadline</label>
                <input
                  id="demo-deadline"
                  type="date"
                  value={demoDeadline}
                  onChange={(e) => setDemoDeadline(e.target.value)}
                  min={minDeadline}
                  className="glass-input w-full px-4 py-3 text-sm text-slate-800"
                />
              </div>
            </div>

            {demoError && (
              <p className="text-rose-500 text-sm mb-4 px-1">{demoError}</p>
            )}

            <button
              id="demo-generate"
              onClick={runDemo}
              disabled={demoLoading}
              className="btn-primary w-full justify-center"
            >
              {demoLoading ? (
                <><Loader2 size={18} className="animate-spin" /> Generating roadmap…</>
              ) : (
                <><Sparkles size={18} /> Generate My Roadmap</>
              )}
            </button>

            <AnimatePresence>
              {(demoMilestones.length > 0 || demoOverview) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-6"
                >
                  <div className="divider mb-5" />

                  {demoUrgency && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="label-luxury">Urgency Level:</span>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold capitalize"
                        style={{
                          background: `${urgencyColors[demoUrgency]}18`,
                          color: urgencyColors[demoUrgency],
                          border: `1px solid ${urgencyColors[demoUrgency]}30`,
                        }}
                      >
                        {demoUrgency}
                      </span>
                    </div>
                  )}

                  {demoOverview && (
                    <div
                      className="rounded-xl p-4 mb-5 text-sm text-slate-600 leading-relaxed"
                      style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99,102,241,0.12)' }}
                    >
                      <p className="flex items-start gap-2">
                        <Brain size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                        {demoOverview}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {demoMilestones.map((m, i) => {
                      const cfg = priorityConfig[m.priority] ?? priorityConfig.medium;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="glass-panel-sm p-4"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
                              >
                                {i + 1}
                              </div>
                              <h4 className="font-semibold text-slate-800 text-sm">{m.title}</h4>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cfg.className}>{cfg.label}</span>
                              <span className="text-xs text-slate-400">Day {m.daysFromStart}</span>
                            </div>
                          </div>
                          <p className="text-slate-500 text-xs leading-relaxed ml-8 mb-2">{m.description}</p>
                          {m.suggestions?.length > 0 && (
                            <div className="ml-8 flex flex-wrap gap-1.5">
                              {m.suggestions.map((s, si) => (
                                <span
                                  key={si}
                                  className="text-xs px-2.5 py-1 rounded-full text-indigo-600 font-medium"
                                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 p-5 rounded-2xl text-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(245,158,11,0.06) 100%)',
                      border: '1px solid rgba(99,102,241,0.15)',
                    }}
                  >
                    <p className="font-semibold text-slate-800 mb-1">Love what you see?</p>
                    <p className="text-slate-500 text-sm mb-4">Sign up to save your goals, track milestones, and chat with your AI Chief of Staff.</p>
                    <button
                      id="demo-upsell-cta"
                      onClick={() => router.push('/auth')}
                      className="btn-primary"
                    >
                      Get Full Access — Free <ArrowRight size={16} />
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="glass-panel p-12 relative overflow-hidden"
          >
            <FloatingOrb
              className="w-80 h-80 -top-20 -right-20"
              style={{ background: 'rgba(99, 102, 241, 0.1)' }}
            />
            <FloatingOrb
              className="w-60 h-60 -bottom-16 -left-16"
              style={{ background: 'rgba(245, 158, 11, 0.08)' }}
            />
            <div className="relative z-10">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}
              >
                <Target size={24} className="text-white" />
              </div>
              <h2 className="heading-xl text-slate-800 mb-4">
                Your next deadline<br />
                <span className="text-gradient-indigo">will not slip.</span>
              </h2>
              <p className="text-slate-500 max-w-md mx-auto mb-8 text-base">
                Join hundreds of professionals who use DeadlineOS to stay relentlessly on track — with a powerful AI Chief of Staff in their corner.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  id="final-cta"
                  onClick={() => router.push('/auth')}
                  className="btn-primary text-base px-8 py-3.5"
                >
                  Start for Free <ArrowRight size={18} />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-5">No credit card required · Powered by Firebase + Gemini</p>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-slate-200/60">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
            >
              <Zap size={11} className="text-white" />
            </div>
            <span className="text-sm font-bold text-slate-600 tracking-tight">DeadlineOS</span>
          </div>
          <p className="text-xs text-slate-400">© 2026 DeadlineOS. Built with Next.js, Firebase & Gemini.</p>
          <div className="flex items-center gap-4">
            <a href="/auth" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Sign In</a>
            <a href="/auth" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Sign Up</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
