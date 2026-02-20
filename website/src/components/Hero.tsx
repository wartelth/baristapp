"use client";

import { motion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-amber-800/8 rounded-full blur-[140px] animate-pulse-glow" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-amber-900/6 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-sm text-accent tracking-wide uppercase mb-6"
        >
          Open Source &middot; AI-Powered &middot; Secure by Design
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
        >
          Your barista{" "}
          <span className="text-gradient">for apps.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-muted max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Describe any tool in plain English.
          Baristapp brews a fully interactive mobile app in seconds.
          No code. No deploy. Just say what you need.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
        >
          <a
            href="#get-started"
            className="group flex items-center gap-2 px-7 py-3.5 rounded-xl font-medium bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-50 transition-all hover:shadow-xl hover:shadow-amber-800/20 hover:-translate-y-0.5"
          >
            Get Started
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="https://github.com/Baristapp"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-medium glass hover:border-accent/20 transition-all hover:-translate-y-0.5"
          >
            <Github className="w-5 h-5" />
            View on GitHub
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <PhoneMockup />
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto max-w-xs">
      <div className="relative rounded-[2.5rem] border-[6px] border-[#2A1F18] bg-surface p-2 shadow-2xl shadow-black/40">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#2A1F18] rounded-b-2xl" />
        <div className="rounded-[2rem] bg-gradient-to-b from-surface-light to-surface overflow-hidden aspect-[9/19.5] flex flex-col">
          <div className="px-4 pt-10 pb-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center">
                <span className="text-[10px] text-amber-100 font-bold">B</span>
              </div>
              <span className="text-xs font-semibold text-foreground">Baristapp</span>
            </div>
            <div className="space-y-2.5 mb-4">
              <div className="glass rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-muted mb-1">What do you want to build?</p>
                <p className="text-[11px] text-foreground/90 leading-relaxed">A workout tracker with exercise logging and weekly charts</p>
              </div>
              <div className="flex justify-end">
                <div className="bg-gradient-to-r from-amber-800 to-amber-900 rounded-xl px-3 py-2 max-w-[85%]">
                  <p className="text-[10px] text-amber-100 leading-relaxed">Brewing your app... 5 screens, 20 components</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 px-4 pb-4 flex flex-col gap-2">
            <div className="glass rounded-xl p-3 flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-foreground">Workout Tracker</span>
                <span className="text-[8px] text-sage">Live</span>
              </div>
              <div className="space-y-1.5">
                <div className="h-2 rounded-full bg-amber-800/30 w-full" />
                <div className="h-2 rounded-full bg-amber-800/20 w-3/4" />
                <div className="h-2 rounded-full bg-amber-800/15 w-5/6" />
              </div>
              <div className="mt-3 flex gap-1.5">
                {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
                  <div key={i} className="flex-1 flex items-end">
                    <div
                      className="w-full rounded-sm bg-gradient-to-t from-amber-700 to-amber-500 opacity-60"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 glass rounded-lg p-2 text-center">
                <p className="text-[9px] text-muted">Today</p>
                <p className="text-[12px] font-bold text-accent">3 sets</p>
              </div>
              <div className="flex-1 glass rounded-lg p-2 text-center">
                <p className="text-[9px] text-muted">Week</p>
                <p className="text-[12px] font-bold text-sage">12 sets</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -inset-8 bg-gradient-to-t from-amber-800/5 to-transparent rounded-full blur-3xl -z-10" />
    </div>
  );
}
