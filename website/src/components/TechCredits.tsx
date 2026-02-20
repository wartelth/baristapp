/* eslint-disable @next/next/no-img-element */
const STACK = [
  { name: "Expo", logo: "https://cdn.simpleicons.org/expo/EDE5DC", href: "https://expo.dev/" },
  { name: "TypeScript", logo: "https://cdn.simpleicons.org/typescript/EDE5DC", href: "https://www.typescriptlang.org/" },
  { name: "React Native", logo: "https://cdn.simpleicons.org/react/EDE5DC", href: "https://reactnative.dev/" },
  { name: "Next.js", logo: "https://cdn.simpleicons.org/nextdotjs/EDE5DC", href: "https://nextjs.org/" },
  { name: "Supabase", logo: "https://cdn.simpleicons.org/supabase/EDE5DC", href: "https://supabase.com/" },
  { name: "Anthropic", logo: "https://cdn.simpleicons.org/anthropic/EDE5DC", href: "https://www.anthropic.com/" },
  { name: "OpenAI", logo: "https://cdn.simpleicons.org/openai/EDE5DC", href: "https://openai.com/" },
  { name: "Aider", logo: "https://cdn.simpleicons.org/gnuemacs/EDE5DC", href: "https://aider.chat/" },
  { name: "Daytona", logo: "https://cdn.simpleicons.org/docker/EDE5DC", href: "https://daytona.io/" },
];

export default function TechCredits() {
  return (
    <section className="relative py-18 sm:py-22">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-2xl sm:text-3xl font-bold">Built with great tools</h2>
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-muted">
            Credits to the open source and AI stack powering Baristapp.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STACK.map((item) => (
            <a
              key={item.name}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="glass rounded-xl p-3 flex items-center gap-2 hover:border-accent/20 transition-colors"
            >
              <img src={item.logo} alt={`${item.name} logo`} className="h-5 w-5 shrink-0" loading="lazy" />
              <span className="text-sm text-foreground/90">{item.name}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
