import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "SwissKnife",
  tagline: "AI-powered declarative micro-app engine",
  favicon: "img/favicon.ico",
  url: "https://swissknife.dev",
  baseUrl: "/",
  onBrokenLinks: "throw",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  themes: ["@docusaurus/theme-mermaid"],

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Baristapp Docs",
      logo: {
        alt: "Baristapp Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docs",
          position: "left",
          label: "Docs",
        },
        {
          href: "https://baristapp.vercel.app",
          label: "Website",
          position: "right",
        },
        {
          href: "https://github.com/Baristapp/baristapp",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Getting Started", to: "/" },
            { label: "Architecture", to: "/architecture/overview" },
            { label: "Schema Reference", to: "/schema/components" },
            { label: "Release Checklist", to: "/guides/release-checklist" },
          ],
        },
        {
          title: "Project",
          items: [
            { label: "Website", href: "https://baristapp.vercel.app" },
            { label: "GitHub", href: "https://github.com/Baristapp/baristapp" },
            { label: "App (Expo)", to: "/app/overview" },
            { label: "Server (Express)", to: "/server/overview" },
          ],
        },
      ],
      copyright: `Baristapp &mdash; Built with Docusaurus`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json"],
    },
    mermaid: {
      theme: { light: "default", dark: "dark" },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
