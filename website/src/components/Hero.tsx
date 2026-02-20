"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Github, Star } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-600/6 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/3 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-accent-light mb-8"
        >
          <Sparkles className="w-4 h-4" />
          Open Source &middot; AI-Powered &middot; Declarative
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
        >
          Describe it.{" "}
          <span className="text-gradient">Build it.</span>
          <br />
          Use it.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          SwissKnife turns plain English into fully interactive mobile mini-apps.
          Powered by AI, rendered declaratively, secured by design.
          No code. No deploy. Just describe what you need.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <a
            href="#get-started"
            className="group flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-medium bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white transition-all hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5"
          >
            Get Started
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="https://github.com/SwissKnife"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-medium glass hover:border-accent/30 transition-all hover:-translate-y-0.5"
          >
            <Github className="w-5 h-5" />
            Star on GitHub
            <Star className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
          </a>
        </motion.div>

        {/* Prompt demo */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <div className="code-block p-1 glow-blue">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-muted ml-2">swissknife create</span>
            </div>
            <div className="p-5 text-left">
              <div className="flex items-start gap-3">
                <span className="text-accent font-mono text-sm mt-0.5">&gt;</span>
                <div>
                  <TypingAnimation text="Build me a workout tracker with exercise logging, rep counting, and weekly progress charts" />
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 4, duration: 0.5 }}
                className="mt-4 pl-6 text-sm text-muted/80 space-y-1"
              >
                <p className="text-green-400/80">&#10003; Clarifying requirements...</p>
                <p className="text-green-400/80">&#10003; Generating declarative spec (20 components, 5 screens)...</p>
                <p className="text-green-400/80">&#10003; Wiring live data feeds...</p>
                <p className="text-accent">&#9656; Your app is ready.</p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}

function TypingAnimation({ text }: { text: string }) {
  return (
    <motion.span className="text-foreground/90 text-sm sm:text-base leading-relaxed">
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 + i * 0.03, duration: 0.1 }}
        >
          {char}
        </motion.span>
      ))}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ delay: 0.8, duration: 1, repeat: Infinity }}
        className="text-accent"
      >
        |
      </motion.span>
    </motion.span>
  );
}
