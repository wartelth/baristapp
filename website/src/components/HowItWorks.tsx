"use client";

import { motion } from "framer-motion";
import { MessageCircle, Brain, Play, Pencil } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MessageCircle,
    title: "Describe",
    subtitle: "Natural language in, questions out",
    description:
      "Tell SwissKnife what you need. The AI asks smart follow-up questions to nail down exactly what you want — screens, data, interactions.",
    code: `POST /api/clarify
{
  "prompt": "A habit tracker with
    streaks and weekly stats"
}`,
    color: "from-blue-500 to-cyan-400",
  },
  {
    number: "02",
    icon: Brain,
    title: "Generate",
    subtitle: "AI produces a declarative JSON spec",
    description:
      "Claude generates a complete app specification — screens, components, actions, state, effects, theme. Pure JSON, no executable code.",
    code: `{
  "appId": "habit-tracker-x7k",
  "name": "Habit Tracker",
  "screens": [...],
  "components": 20,
  "actions": 13,
  "skills": ["weather"]
}`,
    color: "from-violet-500 to-purple-400",
  },
  {
    number: "03",
    icon: Play,
    title: "Render",
    subtitle: "Generic engine interprets the spec",
    description:
      "The app is a generic renderer that reads the JSON spec and produces a fully interactive React Native UI. State persists locally and syncs to the cloud.",
    code: `<MiniAppRenderer
  spec={generatedSpec}
  state={appState}
  dispatch={handleAction}
/>`,
    color: "from-emerald-500 to-green-400",
  },
  {
    number: "04",
    icon: Pencil,
    title: "Modify",
    subtitle: "Iterate with natural language",
    description:
      '"Add a pie chart for category breakdown" — the AI modifies the existing spec, preserving state and identity. Iterate until it\'s perfect.',
    code: `POST /api/modify
{
  "spec": existingSpec,
  "prompt": "Add dark mode toggle
    to the settings screen"
}`,
    color: "from-amber-500 to-orange-400",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32 overflow-hidden">
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
            From idea to app in{" "}
            <span className="text-gradient">four steps</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            No boilerplate. No deployment. Just describe, generate, use, and iterate.
          </p>
        </motion.div>

        <div className="space-y-24">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={`flex flex-col ${
                index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              } items-center gap-12`}
            >
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-mono font-bold bg-gradient-to-r ${step.color} bg-clip-text text-transparent`}
                  >
                    STEP {step.number}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shrink-0`}
                  >
                    <step.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold">{step.title}</h3>
                </div>
                <p className="text-accent-light text-sm font-medium">
                  {step.subtitle}
                </p>
                <p className="text-muted leading-relaxed">{step.description}</p>
              </div>

              <div className="flex-1 w-full">
                <div className="code-block p-1 glow-blue">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                    </div>
                  </div>
                  <pre className="p-5 text-sm text-foreground/80 overflow-x-auto">
                    <code>{step.code}</code>
                  </pre>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
