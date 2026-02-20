"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Github, Coffee, BookOpen } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Prevent background scroll while the mobile menu is open.
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-lg shadow-black/20" : "bg-transparent"
      }`}
    >
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center">
            <Coffee className="w-4 h-4 text-amber-100" />
          </div>
          <span className="text-lg font-bold tracking-tight">Baristapp</span>
        </a>

        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm text-muted hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-muted hover:text-foreground transition-colors">How It Works</a>
          <a href="#screenshots" className="text-sm text-muted hover:text-foreground transition-colors">Screenshots</a>
          <a
            href="https://docs.baristapp.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Docs
          </a>
          <a
            href="https://github.com/Baristapp"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
          <a
            href="#get-started"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-50 transition-all"
          >
            Get Started
          </a>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-muted hover:text-foreground"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 top-16 bg-black/40 backdrop-blur-[1px]"
              onClick={() => setMobileOpen(false)}
              aria-label="Close mobile menu backdrop"
            />
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden absolute top-16 left-0 right-0 glass border-t border-border/50 overflow-hidden"
            >
              <div className="px-6 py-4 flex flex-col gap-3">
                <a href="#features" onClick={() => setMobileOpen(false)} className="text-sm text-muted hover:text-foreground py-1">Features</a>
                <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="text-sm text-muted hover:text-foreground py-1">How It Works</a>
                <a href="#screenshots" onClick={() => setMobileOpen(false)} className="text-sm text-muted hover:text-foreground py-1">Screenshots</a>
                <a href="#get-started" onClick={() => setMobileOpen(false)} className="text-sm text-muted hover:text-foreground py-1">Get Started</a>
                <a
                  href="https://docs.baristapp.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground py-1"
                >
                  <BookOpen className="w-4 h-4" />
                  Docs
                </a>
                <a href="https://github.com/Baristapp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground py-1">
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
