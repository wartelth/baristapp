import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    "intro",
    {
      type: "category",
      label: "Architecture",
      collapsed: false,
      items: [
        "architecture/overview",
        "architecture/data-flow",
        "architecture/security",
      ],
    },
    {
      type: "category",
      label: "Schema Reference",
      collapsed: false,
      items: [
        "schema/components",
        "schema/actions",
        "schema/effects",
        "schema/capabilities",
      ],
    },
    {
      type: "category",
      label: "App (React Native)",
      items: [
        "app/overview",
        "app/renderer",
        "app/storage",
        "app/navigation",
      ],
    },
    {
      type: "category",
      label: "Server (Express)",
      items: [
        "server/overview",
        "server/generation",
        "server/endpoints",
      ],
    },
    {
      type: "category",
      label: "Guides",
      items: [
        "guides/getting-started",
        "guides/how-to-use",
        "guides/adding-components",
        "guides/adding-actions",
        "guides/environment",
        "guides/hosting-docs",
        "guides/release-checklist",
      ],
    },
  ],
};

export default sidebars;
