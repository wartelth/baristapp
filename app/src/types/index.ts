import type { MiniAppComponent, MiniAppAction } from "@swissknife/shared";

export interface RendererProps {
  component: MiniAppComponent;
  state: Record<string, unknown>;
  dispatch: (action: MiniAppAction) => void;
  onNavigate: (screenId: string) => void;
}

export type { MiniApp, MiniAppScreen, MiniAppComponent, MiniAppAction } from "@swissknife/shared";
