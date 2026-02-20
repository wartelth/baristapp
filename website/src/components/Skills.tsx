"use client";

import { motion } from "framer-motion";
import {
  Cloud,
  TrendingUp,
  Newspaper,
  MapPin,
  Laugh,
  Coins,
  Film,
  Dumbbell,
  Palette,
  QrCode,
  Wind,
  BookOpen,
  Gamepad2,
  DollarSign,
  Rss,
} from "lucide-react";

const skillCategories = [
  {
    category: "Weather & Environment",
    skills: [
      {
        id: "weather",
        name: "Weather",
        icon: Cloud,
        api: "Open-Meteo",
        free: true,
        description: "Current conditions, forecasts, hourly data",
      },
      {
        id: "air-quality",
        name: "Air Quality",
        icon: Wind,
        api: "Open-Meteo AQ",
        free: true,
        description: "Air quality index and pollutant levels",
      },
    ],
  },
  {
    category: "Finance",
    skills: [
      {
        id: "crypto-prices",
        name: "Crypto Prices",
        icon: Coins,
        api: "CoinGecko",
        free: true,
        description: "Live prices, trending coins, market data",
      },
      {
        id: "stock-quotes",
        name: "Stock Quotes",
        icon: TrendingUp,
        api: "Alpha Vantage",
        free: false,
        description: "Real-time and historical stock data",
      },
      {
        id: "exchange-rates",
        name: "Exchange Rates",
        icon: DollarSign,
        api: "ExchangeRate-API",
        free: true,
        description: "Currency conversion rates",
      },
    ],
  },
  {
    category: "News & Information",
    skills: [
      {
        id: "news-headlines",
        name: "News Headlines",
        icon: Newspaper,
        api: "NewsAPI",
        free: false,
        description: "Top headlines and search by topic",
      },
      {
        id: "wikipedia",
        name: "Wikipedia",
        icon: BookOpen,
        api: "Wikipedia API",
        free: true,
        description: "Article summaries and search",
      },
    ],
  },
  {
    category: "Utilities",
    skills: [
      {
        id: "geocoding",
        name: "Geocoding",
        icon: MapPin,
        api: "Open-Meteo",
        free: true,
        description: "Location search and coordinates",
      },
      {
        id: "qr-code",
        name: "QR Code",
        icon: QrCode,
        api: "QR API",
        free: true,
        description: "Generate QR codes from text",
      },
      {
        id: "color-palette",
        name: "Color Palette",
        icon: Palette,
        api: "Colormind",
        free: true,
        description: "AI-generated color schemes",
      },
    ],
  },
  {
    category: "Entertainment",
    skills: [
      {
        id: "movie-db",
        name: "Movie Database",
        icon: Film,
        api: "TMDB",
        free: false,
        description: "Movie info, ratings, and search",
      },
      {
        id: "jokes",
        name: "Jokes",
        icon: Laugh,
        api: "JokeAPI",
        free: true,
        description: "Random jokes by category",
      },
      {
        id: "pokemon",
        name: "Pokemon",
        icon: Gamepad2,
        api: "PokeAPI",
        free: true,
        description: "Pokemon data and stats",
      },
    ],
  },
  {
    category: "Sports",
    skills: [
      {
        id: "sports-scores",
        name: "Sports Scores",
        icon: Dumbbell,
        api: "TheSportsDB",
        free: true,
        description: "Live scores and schedules",
      },
      {
        id: "random-facts",
        name: "Random Facts",
        icon: Rss,
        api: "Various",
        free: true,
        description: "Fun facts and trivia",
      },
    ],
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
};

export default function Skills() {
  return (
    <section id="skills" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Live Data Feeds.{" "}
            <span className="text-gradient">Built-in Skills.</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto mb-4">
            Mini apps connect to real-world data through curated, server-side
            skills. No API keys exposed. Rate-limited. Cached. Secure.
          </p>
        </motion.div>

        {/* Usage example */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-2xl mx-auto mb-16"
        >
          <div className="code-block p-1">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              </div>
              <span className="text-xs text-muted ml-2">skill usage in mini app spec</span>
            </div>
            <pre className="p-5 text-sm text-foreground/80 overflow-x-auto">
              <code>{`{
  "skills": ["weather", "crypto-prices"],
  "effects": [{
    "trigger": "onMount",
    "action": {
      "type": "skillCall",
      "skillId": "weather",
      "actionId": "current",
      "params": { "lat": 48.85, "lon": 2.35 },
      "resultKey": "weatherData"
    }
  }]
}`}</code>
            </pre>
          </div>
        </motion.div>

        {/* Skill grid by category */}
        {skillCategories.map((cat) => (
          <div key={cat.category} className="mb-10">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
              {cat.category}
            </h3>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              {cat.skills.map((skill) => (
                <motion.div
                  key={skill.id}
                  variants={itemVariants}
                  className="skill-card group flex items-start gap-3.5 p-4 rounded-xl glass hover:border-accent/20 transition-all duration-300"
                >
                  <div className="skill-icon w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center shrink-0 transition-all duration-300">
                    <skill.icon className="w-4.5 h-4.5 text-accent-light" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold">{skill.name}</span>
                      {skill.free && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                          FREE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      {skill.description}
                    </p>
                    <p className="text-[10px] text-muted/60 mt-1 font-mono">
                      {skill.api}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}
