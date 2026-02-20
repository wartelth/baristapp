"use client";

import { motion } from "framer-motion";
import {
  FileCheck,
  ShieldCheck,
  Scale,
  Lock,
  ArrowRight,
} from "lucide-react";

const layers = [
  {
    number: 1,
    icon: FileCheck,
    title: "Declaration",
    subtitle: "Schema-level",
    description:
      "Mini apps declare which skills they need in the spec. Only declared skills can be invoked. The server rejects calls to undeclared skills.",
    detail: 'skills: ["weather", "crypto-prices"]',
    color: "from-blue-500 to-cyan-400",
  },
  {
    number: 2,
    icon: ShieldCheck,
    title: "Capability Gate",
    subtitle: "Client-side",
    description:
      'Users see exactly what each app wants to access — "This app wants: Weather, Crypto Prices" — and approve or deny.',
    detail: "capability: network + skills",
    color: "from-violet-500 to-purple-400",
  },
  {
    number: 3,
    icon: Scale,
    title: "Policy Enforcement",
    subtitle: "Server-side",
    description:
      "Per-skill rate limiting, parameter validation against the skill schema, domain allowlisting, and full audit logging of every invocation.",
    detail: "60 req/min per skill, validated params",
    color: "from-emerald-500 to-green-400",
  },
  {
    number: 4,
    icon: Lock,
    title: "Sandboxed Execution",
    subtitle: "Server-side only",
    description:
      "API keys injected from environment variables. Response transformation strips sensitive data. Size limits prevent exfiltration. Timeouts enforced.",
    detail: "secrets never reach the client",
    color: "from-amber-500 to-orange-400",
  },
];

const principles = [
  {
    title: "No eval()",
    description: "Apps are declarative JSON — no executable code, no remote scripts, no code injection vectors.",
  },
  {
    title: "Allowlist-first",
    description: "Tools are denied by default. Each app declares what it needs; the server enforces it.",
  },
  {
    title: "Secrets server-side",
    description: "API keys and tokens live in environment variables. Mini app specs never contain credentials.",
  },
  {
    title: "SSRF protection",
    description: "URL hostname validation prevents server-side request forgery. Skills can only call their declared provider.",
  },
  {
    title: "Response limits",
    description: "500KB max response size, 15s timeout per skill call. Prevents data exfiltration and resource abuse.",
  },
  {
    title: "Audit logging",
    description: "Every skill invocation is logged with appId, userId, skillId, and timestamp for full traceability.",
  },
];

export default function Security() {
  return (
    <section id="security" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-600/4 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Security is{" "}
            <span className="text-gradient">not an afterthought</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Four layers of defense, inspired by real-world security incidents.
            Every data feed passes through declaration, gating, validation, and
            sandboxed execution.
          </p>
        </motion.div>

        {/* 4 Layers */}
        <div className="relative mb-24">
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

          <div className="space-y-12">
            {layers.map((layer, index) => (
              <motion.div
                key={layer.number}
                initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className={`flex flex-col ${
                  index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                } items-center gap-8`}
              >
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${layer.color} flex items-center justify-center`}
                    >
                      <layer.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted">
                          LAYER {layer.number}
                        </span>
                        <span className="text-xs text-muted/60">
                          &middot; {layer.subtitle}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold">{layer.title}</h3>
                    </div>
                  </div>
                  <p className="text-muted leading-relaxed pl-[52px]">
                    {layer.description}
                  </p>
                  <div className="pl-[52px]">
                    <code className="text-xs font-mono text-accent/80 bg-accent/5 px-3 py-1.5 rounded-lg">
                      {layer.detail}
                    </code>
                  </div>
                </div>

                <div className="hidden lg:flex items-center justify-center w-12">
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${layer.color} flex items-center justify-center text-white text-xs font-bold shadow-lg`}
                  >
                    {layer.number}
                  </div>
                </div>

                <div className="flex-1" />
              </motion.div>
            ))}
          </div>

          {/* Flow arrow */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="hidden lg:flex items-center justify-center mt-8 gap-2 text-muted"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="text-sm font-mono">
              Sanitized data reaches the mini app
            </span>
          </motion.div>
        </div>

        {/* Principles grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h3 className="text-xl font-bold text-center mb-8">
            Core Security Principles
          </h3>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {principles.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="p-5 rounded-xl glass"
            >
              <h4 className="text-sm font-semibold mb-1.5 text-emerald-400">
                {p.title}
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                {p.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
