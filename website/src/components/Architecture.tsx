"use client";

import { motion } from "framer-motion";
import {
  Smartphone,
  Server,
  Package,
  ArrowLeftRight,
  Database,
  Brain,
} from "lucide-react";

const layers = [
  {
    icon: Smartphone,
    label: "App",
    tech: "React Native / Expo",
    description:
      "Generic mini-app renderer. Interprets JSON specs, manages state, dispatches actions, syncs to cloud.",
    items: [
      "MiniAppRenderer engine",
      "20 component renderers",
      "Capability manager",
      "Local + cloud storage",
      "Social sharing (QR + codes)",
    ],
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: Server,
    label: "Server",
    tech: "Express / Node.js",
    description:
      "Generation, modification, per-app endpoints, skill execution, storage proxy, social APIs.",
    items: [
      "Claude AI generation",
      "Skill executor + cache",
      "Rate limiting + validation",
      "Per-app server endpoints",
      "Supabase storage proxy",
    ],
    color: "from-violet-500 to-purple-400",
  },
  {
    icon: Package,
    label: "Shared",
    tech: "Zod + TypeScript",
    description:
      "Single source of truth. Zod schemas define every component, action, and API contract. Used by both app and server.",
    items: [
      "20 component schemas",
      "13+ action schemas",
      "API request/response types",
      "Skill definitions",
      "Schema validation",
    ],
    color: "from-emerald-500 to-green-400",
  },
];

const techStack = [
  { category: "Frontend", items: ["React Native", "Expo", "React Navigation", "AsyncStorage"] },
  { category: "Backend", items: ["Express", "Claude API", "OpenAI (optional)", "Supabase"] },
  { category: "Shared", items: ["TypeScript", "Zod", "JSON Schema"] },
  { category: "Infrastructure", items: ["Vercel (web)", "Supabase (DB)", "npm workspaces"] },
];

export default function Architecture() {
  return (
    <section id="architecture" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Clean architecture.{" "}
            <span className="text-gradient">Monorepo power.</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Three packages, one schema, zero ambiguity. The shared package is
            the single source of truth for the entire system.
          </p>
        </motion.div>

        {/* Monorepo visual */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          {layers.map((layer, i) => (
            <motion.div
              key={layer.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative group"
            >
              <div className="p-6 rounded-2xl glass hover:border-accent/20 transition-all duration-300 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${layer.color} flex items-center justify-center`}
                  >
                    <layer.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{layer.label}</h3>
                    <p className="text-xs text-muted font-mono">{layer.tech}</p>
                  </div>
                </div>
                <p className="text-sm text-muted leading-relaxed mb-4">
                  {layer.description}
                </p>
                <ul className="space-y-1.5">
                  {layer.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-xs text-foreground/70"
                    >
                      <div className="w-1 h-1 rounded-full bg-accent/50" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Data flow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <div className="code-block p-6 glow-blue">
            <h3 className="text-sm font-semibold mb-6 text-center text-muted">
              Data Flow
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              {[
                { icon: Smartphone, label: "User Prompt" },
                { icon: Brain, label: "Claude AI" },
                { icon: Package, label: "JSON Spec" },
                { icon: Smartphone, label: "Renderer" },
                { icon: Database, label: "Persist" },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-accent-light" />
                    </div>
                    <span className="text-xs text-muted whitespace-nowrap">
                      {step.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowLeftRight className="w-4 h-4 text-border hidden sm:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tech stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-xl font-bold text-center mb-8">Tech Stack</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {techStack.map((group) => (
              <div key={group.category} className="p-5 rounded-xl glass">
                <h4 className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">
                  {group.category}
                </h4>
                <ul className="space-y-1.5">
                  {group.items.map((item) => (
                    <li key={item} className="text-sm text-muted">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
