"use client";

import { Zap, Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative border-t border-border/50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">SwissKnife</span>
            <span className="text-xs text-muted">
              &middot; AI-Powered Mini App Studio
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted">
            <a
              href="https://github.com/SwissKnife/swissknife"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#skills" className="hover:text-foreground transition-colors">
              Skills
            </a>
            <a href="#security" className="hover:text-foreground transition-colors">
              Security
            </a>
          </div>

          <p className="text-xs text-muted/60">
            MIT License &middot; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
