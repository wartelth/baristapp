"use client";

import { Coffee, Github, BookOpen } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border/30 py-10">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center">
              <Coffee className="w-3 h-3 text-amber-100" />
            </div>
            <span className="text-sm font-semibold">Baristapp</span>
            <span className="text-xs text-muted">&middot; Your barista for apps</span>
          </div>

          <div className="flex items-center gap-5 text-xs text-muted">
            <a
              href="https://docs.baristapp.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Docs
            </a>
            <a
              href="https://github.com/wartelth/baristapp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              GitHub
            </a>
            <span>MIT License &middot; {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
