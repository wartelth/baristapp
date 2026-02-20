"use client";

import { motion } from "framer-motion";
import {
  MessageSquare,
  Cpu,
  Layers,
  Shield,
  Zap,
  Share2,
  Smartphone,
  Palette,
  RefreshCw,
  Database,
  Globe,
  Lock,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Natural Language Input",
    description:
      "Describe any tool in plain English. The AI asks clarifying questions, then generates a complete app spec.",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: Cpu,
    title: "Declarative JSON Engine",
    description:
      "No eval, no code execution. Apps are pure JSON schemas rendered by a generic engine. Safe by design.",
    color: "from-violet-500 to-purple-400",
  },
  {
    icon: Layers,
    title: "20+ Component Types",
    description:
      "Text, inputs, charts, maps, cameras, audio recorders, tabs, modals, lists — all declarative, all composable.",
    color: "from-blue-500 to-indigo-400",
  },
  {
    icon: Zap,
    title: "Live Data Feeds",
    description:
      "Skills system connects apps to weather, crypto, news, sports, and more. Server-side, rate-limited, cached.",
    color: "from-amber-500 to-orange-400",
  },
  {
    icon: Shield,
    title: "4-Layer Security",
    description:
      "Declaration, capability gates, policy enforcement, sandboxed execution. API keys never reach the client.",
    color: "from-emerald-500 to-green-400",
  },
  {
    icon: RefreshCw,
    title: "Modify with Words",
    description:
      'Say "add a dark mode toggle" or "change the chart to bar chart" — the AI modifies the spec in-place.',
    color: "from-pink-500 to-rose-400",
  },
  {
    icon: Share2,
    title: "Social Sharing",
    description:
      "Share apps via short codes or QR. Friends import with one tap. Social feed shows shared apps.",
    color: "from-teal-500 to-cyan-400",
  },
  {
    icon: Smartphone,
    title: "Native + WebView",
    description:
      "React Native components for hardware access. WebView mode for pixel-perfect HTML5 mini-apps with a built-in design system.",
    color: "from-blue-600 to-blue-400",
  },
  {
    icon: Palette,
    title: "Theming Engine",
    description:
      "Full theme support with primary colors, backgrounds, text colors, and border radius. Dark mode built-in.",
    color: "from-fuchsia-500 to-pink-400",
  },
  {
    icon: Database,
    title: "Persistent State",
    description:
      "Local-first with cloud sync. AsyncStorage for instant writes, Supabase for cross-device persistence.",
    color: "from-sky-500 to-blue-400",
  },
  {
    icon: Globe,
    title: "Server Endpoints",
    description:
      "Apps can declare server-side endpoints for HuggingFace inference, data transforms, and API proxying.",
    color: "from-indigo-500 to-violet-400",
  },
  {
    icon: Lock,
    title: "Capability System",
    description:
      "Apps declare what they need. Camera, location, network — each permission is requested and approved by the user.",
    color: "from-red-500 to-orange-400",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Features() {
  return (
    <section id="features" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-50" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Everything you need.{" "}
            <span className="text-gradient">Nothing you don&apos;t.</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            A complete platform for generating, rendering, and sharing interactive
            mini-apps — built on a secure, declarative foundation.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative p-6 rounded-2xl glass hover:border-accent/20 transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:shadow-lg transition-shadow`}
              >
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
