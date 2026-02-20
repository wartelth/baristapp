"use client";

import { motion } from "framer-motion";
import { Github, ArrowRight, Heart } from "lucide-react";

export default function GetStarted() {
  return (
    <section id="get-started" className="relative py-28">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-800/4 rounded-full blur-[150px]" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 text-sm text-accent mb-6">
            <Heart className="w-4 h-4" />
            Open Source &middot; MIT License
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to brew?
          </h2>

          <p className="text-muted max-w-md mx-auto mb-10">
            Clone the repo, add your API keys, start building. Contributions welcome.
          </p>

          <div className="code-block p-1 max-w-xl mx-auto mb-10 text-left">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              </div>
              <span className="text-[11px] text-muted ml-2">Quick Start</span>
            </div>
            <div className="p-5 space-y-1.5 text-sm">
              <div className="flex gap-3">
                <span className="text-muted/60 select-none">$</span>
                <span className="text-foreground/80">git clone https://github.com/Baristapp/baristapp.git</span>
              </div>
              <div className="flex gap-3">
                <span className="text-muted/60 select-none">$</span>
                <span className="text-foreground/80">cd baristapp</span>
              </div>
              <div className="flex gap-3">
                <span className="text-muted/60 select-none">$</span>
                <span className="text-foreground/80">npm install</span>
              </div>
              <div className="flex gap-3">
                <span className="text-muted/60 select-none">$</span>
                <span className="text-foreground/80">copy server/.env.example to server/.env</span>
              </div>
              <div className="flex gap-3">
                <span className="text-muted/60 select-none">$</span>
                <span className="text-foreground/80">npm run server</span>
              </div>
              <div className="flex gap-3">
                <span className="text-muted/60 select-none">$</span>
                <span className="text-foreground/80">npm run app</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/Baristapp/baristapp"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-7 py-3.5 rounded-xl font-medium bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-50 transition-all hover:shadow-xl hover:shadow-amber-800/20 hover:-translate-y-0.5"
            >
              <Github className="w-5 h-5" />
              View on GitHub
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
