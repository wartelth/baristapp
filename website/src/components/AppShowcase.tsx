"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const apps = [
  {
    name: "Weather Dashboard",
    prompt: "\"Show me the weather for Paris\"",
    image: "/images/showcase/app-1.webp",
    tags: ["weather", "live data"],
  },
  {
    name: "Habit Tracker",
    prompt: "\"A daily habit tracker with streaks\"",
    image: "/images/showcase/app-2.webp",
    tags: ["state", "charts"],
  },
  {
    name: "Crypto Portfolio",
    prompt: "\"Track my crypto with live prices\"",
    image: "/images/showcase/app-3.webp",
    tags: ["crypto", "live data"],
  },
  {
    name: "Task Planner",
    prompt: "\"A planner app with priorities and reminders\"",
    image: "/images/showcase/app-4.webp",
    tags: ["productivity", "planner"],
  },
];

export default function AppShowcase() {
  return (
    <section id="screenshots" className="relative overflow-hidden py-20 sm:py-28">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-800/5 rounded-full blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">
            Apps people are brewing
          </h2>
          <p className="text-muted max-w-lg mx-auto">
            From a sentence to a working app. Here&apos;s what a single prompt can create.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {apps.map((app, i) => (
            <motion.div
              key={app.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="mb-4 w-full max-w-[17rem]">
                <div className="relative rounded-[2rem] border-[5px] border-[#2A1F18] bg-surface p-1.5 shadow-xl shadow-black/30">
                  <div className="absolute left-1/2 top-0 z-10 h-5 w-20 -translate-x-1/2 rounded-b-xl bg-[#2A1F18]" />
                  <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-surface-light to-surface">
                    <Image
                      src={app.image}
                      alt={`${app.name} app screenshot`}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 640px) 80vw, (max-width: 1024px) 40vw, 22vw"
                      priority={i === 0}
                    />
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-muted italic">{app.prompt}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {app.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
