"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "1",
    title: "Describe",
    description: "Tell Baristapp what you need in plain English. It asks smart follow-up questions to get the details right.",
    visual: "💬",
  },
  {
    number: "2",
    title: "Brew",
    description: "AI generates a complete app — screens, components, data, and theme. Pure declarative JSON, no code.",
    visual: "☕",
  },
  {
    number: "3",
    title: "Use & Iterate",
    description: "Your app is live instantly. Tweak it with words: \"add a pie chart\", \"make it dark mode\". Repeat until perfect.",
    visual: "✨",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-28">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">
            How It Works
          </h2>
          <p className="text-muted max-w-lg mx-auto">
            From idea to app in three steps. No boilerplate, no deployment.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative text-center"
            >
              <div className="text-5xl mb-6">{step.visual}</div>
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent text-sm font-bold mb-4">
                {step.number}
              </div>
              <h3 className="text-xl font-bold mb-2">{step.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{step.description}</p>

              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 -right-4 w-8 text-center text-muted/30 text-2xl">
                  →
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
