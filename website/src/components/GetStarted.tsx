"use client";

import { motion } from "framer-motion";
import { Github, Terminal, ArrowRight, Heart } from "lucide-react";

export default function GetStarted() {
  return (
    <section id="get-started" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[150px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-accent-light mb-8">
            <Heart className="w-4 h-4" />
            Open Source &middot; MIT License
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Ready to build?{" "}
            <span className="text-gradient">Start in minutes.</span>
          </h2>

          <p className="text-muted text-lg max-w-xl mx-auto mb-12">
            Clone the repo, set your API keys, and start generating mini-apps.
            Contributions welcome — from skills to components to docs.
          </p>

          {/* Quick start */}
          <div className="code-block p-1 glow-blue-strong max-w-2xl mx-auto mb-12 text-left">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
              <Terminal className="w-3.5 h-3.5 text-muted" />
              <span className="text-xs text-muted">Quick Start</span>
            </div>
            <div className="p-5 space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-muted select-none">$</span>
                <span className="text-foreground/80">
                  git clone https://github.com/SwissKnife/swissknife.git
                </span>
              </div>
              <div className="flex gap-3">
                <span className="text-muted select-none">$</span>
                <span className="text-foreground/80">cd swissknife</span>
              </div>
              <div className="flex gap-3">
                <span className="text-muted select-none">$</span>
                <span className="text-foreground/80">npm install</span>
              </div>
              <div className="flex gap-3">
                <span className="text-muted select-none">$</span>
                <span className="text-foreground/80">
                  cp server/.env.example server/.env
                </span>
              </div>
              <div className="flex gap-3">
                <span className="text-muted select-none">$</span>
                <span className="text-foreground/80">
                  npm run server{" "}
                  <span className="text-muted">&amp;</span> npm run app
                </span>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a
              href="https://github.com/SwissKnife/swissknife"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-medium bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white transition-all hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5"
            >
              <Github className="w-5 h-5" />
              View on GitHub
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="https://github.com/SwissKnife/swissknife/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-medium glass hover:border-accent/30 transition-all hover:-translate-y-0.5"
            >
              Read the Docs
            </a>
          </div>

          {/* Contribution areas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {[
              { label: "Add Skills", desc: "Data connectors" },
              { label: "Components", desc: "New UI types" },
              { label: "Actions", desc: "New behaviors" },
              { label: "Docs", desc: "Guides & examples" },
            ].map((item) => (
              <div
                key={item.label}
                className="p-4 rounded-xl glass text-center"
              >
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
