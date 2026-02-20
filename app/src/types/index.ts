import type { MiniAppComponent, MiniAppAction } from "@baristapp/shared";

export interface RendererProps {
  component: MiniAppComponent;
  state: Record<string, unknown>;
  dispatch: (action: MiniAppAction) => void;
  onNavigate: (screenId: string) => void;
  /** Passed to container-like renderers so they can render children without circular imports */
  renderChild?: (
    component: MiniAppComponent,
    state: Record<string, unknown>,
    dispatch: (action: MiniAppAction) => void,
    onNavigate: (screenId: string) => void
  ) => React.ReactNode;
}

export type { MiniApp, MiniAppScreen, MiniAppComponent, MiniAppAction } from "@baristapp/shared";
