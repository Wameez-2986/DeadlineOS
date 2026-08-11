'use client';

import React from 'react';

/** Base pulse block helper */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`}
    />
  );
}

/** 1. Main Dashboard Skeleton */
export function MainDashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
      {/* Top Banner / Hero Skeleton */}
      <div className="bg-white/60 border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <SkeletonBlock className="h-7 w-56" />
            <SkeletonBlock className="h-4 w-96" />
          </div>
          <SkeletonBlock className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/60 border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-8 w-8 rounded-lg" />
            </div>
            <SkeletonBlock className="h-8 w-20" />
            <SkeletonBlock className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Main Grid: Recent Goals & Risk Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/60 border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <SkeletonBlock className="h-6 w-36" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <SkeletonBlock className="h-5 w-48" />
                  <SkeletonBlock className="h-4 w-16" />
                </div>
                <SkeletonBlock className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/60 border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <SkeletonBlock className="h-6 w-32" />
          <SkeletonBlock className="h-40 w-full rounded-xl" />
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** 2. Goals View Skeleton */
export function GoalsViewSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <SkeletonBlock className="h-8 w-40" />
        <SkeletonBlock className="h-10 w-32 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goal Selector Column */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-white/70 border border-slate-200/80 rounded-xl space-y-2">
              <SkeletonBlock className="h-5 w-40" />
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-2 w-full" />
            </div>
          ))}
        </div>

        {/* Goal Detail & Milestones */}
        <div className="lg:col-span-2 bg-white/70 border border-slate-200/80 rounded-2xl p-6 space-y-5">
          <div className="flex justify-between items-center">
            <SkeletonBlock className="h-7 w-64" />
            <SkeletonBlock className="h-6 w-20" />
          </div>
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-5/6" />

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <SkeletonBlock className="h-5 w-32" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <SkeletonBlock className="h-5 w-5 rounded-md" />
                <SkeletonBlock className="h-4 flex-1" />
                <SkeletonBlock className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 3. AutoPlanner Skeleton */
export function AutoPlannerSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="bg-white/70 border border-slate-200/80 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <SkeletonBlock className="h-7 w-48" />
            <SkeletonBlock className="h-4 w-80" />
          </div>
          <SkeletonBlock className="h-10 w-44 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white/70 border border-slate-200/80 rounded-2xl p-6 space-y-4">
            <SkeletonBlock className="h-6 w-36" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="p-3 bg-slate-50 rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <SkeletonBlock className="h-4 w-40" />
                    <SkeletonBlock className="h-4 w-12" />
                  </div>
                  <SkeletonBlock className="h-3 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 4. Risk Dashboard Skeleton */
export function RiskDashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <SkeletonBlock className="h-10 w-36 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/70 border border-slate-200/80 rounded-2xl p-5 space-y-3">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="h-8 w-16" />
            <SkeletonBlock className="h-3 w-full" />
          </div>
        ))}
      </div>

      <div className="bg-white/70 border border-slate-200/80 rounded-2xl p-6 space-y-4">
        <SkeletonBlock className="h-6 w-44" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border border-rose-100 bg-rose-50/40 rounded-xl space-y-2">
            <div className="flex justify-between">
              <SkeletonBlock className="h-5 w-48" />
              <SkeletonBlock className="h-5 w-20 rounded-full" />
            </div>
            <SkeletonBlock className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 5. Calendar Grid Skeleton */
export function CalendarGridSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <SkeletonBlock className="h-8 w-36" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-20 rounded-lg" />
          <SkeletonBlock className="h-9 w-20 rounded-lg" />
        </div>
      </div>

      <div className="bg-white/70 border border-slate-200/80 rounded-2xl p-4 space-y-4">
        <div className="grid grid-cols-7 gap-2 text-center pb-2 border-b border-slate-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <SkeletonBlock key={d} className="h-5 w-12 mx-auto" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-50/80 border border-slate-100 rounded-xl p-2 space-y-2">
              <SkeletonBlock className="h-4 w-5" />
              {i % 4 === 0 && <SkeletonBlock className="h-3 w-full rounded" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 6. Tasks View Skeleton */
export function TasksViewSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <SkeletonBlock className="h-8 w-44" />
        <SkeletonBlock className="h-10 w-28 rounded-xl" />
      </div>

      <div className="flex gap-3">
        <SkeletonBlock className="h-9 w-24 rounded-lg" />
        <SkeletonBlock className="h-9 w-24 rounded-lg" />
        <SkeletonBlock className="h-9 w-24 rounded-lg" />
      </div>

      <div className="bg-white/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-xl">
            <div className="flex items-center gap-3 flex-1">
              <SkeletonBlock className="h-5 w-5 rounded-md" />
              <SkeletonBlock className="h-4 w-64" />
            </div>
            <SkeletonBlock className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 7. AI Assistant Skeleton */
export function AIAssistantSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full h-full flex flex-col">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200/80">
        <SkeletonBlock className="h-9 w-9 rounded-full" />
        <div className="space-y-1">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
      </div>

      <div className="flex-1 space-y-4 py-4">
        <div className="flex items-start gap-3">
          <SkeletonBlock className="h-8 w-8 rounded-full shrink-0" />
          <SkeletonBlock className="h-16 w-3/4 rounded-2xl" />
        </div>
        <div className="flex items-start gap-3 justify-end">
          <SkeletonBlock className="h-12 w-2/3 rounded-2xl" />
          <SkeletonBlock className="h-8 w-8 rounded-full shrink-0" />
        </div>
        <div className="flex items-start gap-3">
          <SkeletonBlock className="h-8 w-8 rounded-full shrink-0" />
          <SkeletonBlock className="h-24 w-4/5 rounded-2xl" />
        </div>
      </div>

      <div className="pt-2">
        <SkeletonBlock className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** 8. Settings View Skeleton */
export function SettingsViewSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
      <SkeletonBlock className="h-8 w-32" />
      <div className="bg-white/70 border border-slate-200/80 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-4 w-56" />
          </div>
        </div>
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <SkeletonBlock className="h-10 w-full rounded-xl" />
          <SkeletonBlock className="h-10 w-full rounded-xl" />
          <SkeletonBlock className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
