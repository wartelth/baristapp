"use client";

import { motion } from "framer-motion";
import { MessageSquare, Shield, Zap, Share2, RefreshCw, Smartphone, Coffee } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Talk to It",
    description: "Describe what you need in plain English. The AI asks the right questions, then builds it.",
  },
  {
    icon: Zap,
    title: "Live Data",
    description: "Weather, crypto, news, sports — your apps connect to real-world data out of the box.",
  },
  {
    icon: Shield,
    title: "Secure by Design",
    description: "No code execution. No eval. Apps are pure data rendered by a safe engine. API keys never leave the server.",
  },
  {
    icon: RefreshCw,
    title: "Iterate with Words",
    description: "\"Add dark mode\" or \"change the chart\" — just say it and the app updates in-place.",
  },
  {
    icon: Smartphone,
    title: "Real Native Apps",
    description: "Not web wrappers. Real React Native components with camera, maps, charts, and sensors.",
  },
  {
    icon: Share2,
    title: "Share Instantly",
    description: "Share any app with a short code or QR. Friends import it in one tap.",
  },
  {
    icon: Coffee,
    title: "Beans + Curated Tools",
    description: "Every native mini-app is called a Bean. Each Bean can use curated APIs and tools we maintain for quality and safety.",
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function WhatItDoes() {
  return (
    <section id="features" className="relative py-28">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">
            What It Does
          </h2>
          <p className="text-muted max-w-lg mx-auto">
            Everything you need to go from idea to interactive Bean.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="group p-6 rounded-2xl glass hover:border-accent/15 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/15 transition-colors">
                <f.icon className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
