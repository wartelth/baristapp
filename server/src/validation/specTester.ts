import type { MiniApp } from "@swissknife/shared";
import { hasSkill, getSkillIds, getSkill } from "../skills/skillRegistry";

export interface SpecTestResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Deep runtime-safety tests for a MiniApp spec.
 * Catches issues that would cause the app to fail or behave incorrectly
 * at render time on the client. Runs after Zod schema validation passes.
 *
 * Errors = the app WILL break. Warnings = likely bugs but non-fatal.
 */
export function runSpecTests(spec: MiniApp): SpecTestResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = spec as any;

  // Collect all state keys that will exist at runtime
  const declaredStateKeys = new Set<string>(
    Object.keys(s.initialState ?? {})
  );

  // Keys that async actions will populate (resultKey, loadingKey, errorKey)
  const asyncPopulatedKeys = new Set<string>();

  // Collect all component IDs for uniqueness check
  const componentIds = new Map<string, string>(); // id → screen

  // -----------------------------------------------------------------------
  // 1. Basic structural checks
  // -----------------------------------------------------------------------

  if (!s.screens?.length) {
    errors.push("App has no screens");
  }

  if (!s.title || String(s.title).trim().length < 2) {
    errors.push("App title is missing or too short (min 2 chars)");
  }

  if (!s.appId || !/^[a-z0-9-]+$/.test(s.appId)) {
    errors.push(`appId "${s.appId}" must be non-empty kebab-case (lowercase letters, numbers, hyphens)`);
  }

  // -----------------------------------------------------------------------
  // 2. Skills validation
  // -----------------------------------------------------------------------

  const declaredSkills = new Set<string>(s.skills ?? []);

  if (declaredSkills.size > 0) {
    if (!s.capabilities?.includes("skills")) {
      errors.push(
        `App declares skills [${[...declaredSkills].join(", ")}] but "skills" is not in capabilities`
      );
    }

    for (const skillId of declaredSkills) {
      if (!hasSkill(skillId)) {
        errors.push(
          `Unknown skill "${skillId}" in skills array. Available: ${getSkillIds().join(", ")}`
        );
      }
    }
  }

  // -----------------------------------------------------------------------
  // 3. Walk all actions recursively to collect async keys and validate
  // -----------------------------------------------------------------------

  function walkAction(action: any, location: string): void {
    if (!action || typeof action !== "object") return;

    switch (action.type) {
      case "setState":
        if (!action.key) errors.push(`${location}: setState missing "key"`);
        break;

      case "append":
      case "remove":
        if (!action.key) errors.push(`${location}: ${action.type} missing "key"`);
        if (action.key && !declaredStateKeys.has(action.key) && !asyncPopulatedKeys.has(action.key)) {
          warnings.push(`${location}: ${action.type} targets "${action.key}" which is not in initialState`);
        }
        break;

      case "http":
        if (!action.resultKey) errors.push(`${location}: http action missing "resultKey"`);
        if (action.resultKey) asyncPopulatedKeys.add(action.resultKey);
        if (action.loadingKey) asyncPopulatedKeys.add(action.loadingKey);
        if (action.errorKey) asyncPopulatedKeys.add(action.errorKey);
        if (action.url && !action.url.startsWith("http") && !action.url.includes("{{")) {
          warnings.push(`${location}: http URL "${action.url}" doesn't start with http and has no interpolation`);
        }
        break;

      case "serverCall":
        if (!action.resultKey) errors.push(`${location}: serverCall missing "resultKey"`);
        if (action.resultKey) asyncPopulatedKeys.add(action.resultKey);
        if (action.loadingKey) asyncPopulatedKeys.add(action.loadingKey);
        if (action.errorKey) asyncPopulatedKeys.add(action.errorKey);
        if (action.endpointId) {
          const endpoints = s.serverEndpoints ?? [];
          const found = endpoints.some((e: any) => e.id === action.endpointId);
          if (!found) {
            errors.push(
              `${location}: serverCall references endpoint "${action.endpointId}" which is not in serverEndpoints`
            );
          }
        }
        break;

      case "skillCall":
        if (!action.resultKey) errors.push(`${location}: skillCall missing "resultKey"`);
        if (!action.skillId) errors.push(`${location}: skillCall missing "skillId"`);
        if (!action.actionId) errors.push(`${location}: skillCall missing "actionId"`);
        if (action.resultKey) asyncPopulatedKeys.add(action.resultKey);
        if (action.loadingKey) asyncPopulatedKeys.add(action.loadingKey);
        if (action.errorKey) asyncPopulatedKeys.add(action.errorKey);

        if (action.skillId && !declaredSkills.has(action.skillId)) {
          errors.push(
            `${location}: skillCall uses skill "${action.skillId}" which is not in the top-level skills array`
          );
        }

        if (action.skillId && action.actionId && hasSkill(action.skillId)) {
          const skillDef = getSkill(action.skillId);
          if (skillDef && !skillDef.actions[action.actionId]) {
            const available = Object.keys(skillDef.actions).join(", ");
            errors.push(
              `${location}: skillCall action "${action.actionId}" does not exist on skill "${action.skillId}". Available: ${available}`
            );
          }
        }
        break;

      case "compute":
        if (!action.key) errors.push(`${location}: compute missing "key"`);
        break;

      case "transform":
        if (!action.expression) errors.push(`${location}: transform missing "expression"`);
        if (!action.resultKey) errors.push(`${location}: transform missing "resultKey"`);
        if (action.resultKey) asyncPopulatedKeys.add(action.resultKey);
        break;

      case "navigate":
        if (action.screenId) {
          const screenIds = (s.screens ?? []).map((sc: any) => sc.id);
          if (!screenIds.includes(action.screenId)) {
            errors.push(
              `${location}: navigate to screen "${action.screenId}" which doesn't exist. Screens: ${screenIds.join(", ")}`
            );
          }
        }
        break;

      case "conditional":
        if (!action.stateKey) errors.push(`${location}: conditional missing "stateKey"`);
        if (action.thenAction) walkAction(action.thenAction, `${location} → then`);
        if (action.elseAction) walkAction(action.elseAction, `${location} → else`);
        break;

      case "batch":
        if (Array.isArray(action.actions)) {
          action.actions.forEach((sub: any, i: number) =>
            walkAction(sub, `${location} → batch[${i}]`)
          );
        }
        break;

      case "timer":
        if (action.tickAction) walkAction(action.tickAction, `${location} → tick`);
        if (action.command === "start" && !action.intervalMs) {
          warnings.push(`${location}: timer start without intervalMs, defaults to 1000ms`);
        }
        break;
    }
  }

  // -----------------------------------------------------------------------
  // 4. Walk all components recursively
  // -----------------------------------------------------------------------

  const EXTERNAL_RESOURCE_RE = /<(?:script|link)\b[^>]*\b(?:src|href)\s*=\s*["']https?:\/\//i;

  function walkComponent(comp: any, screenId: string): void {
    if (!comp || typeof comp !== "object") return;

    // Unique ID check
    if (comp.id) {
      if (componentIds.has(comp.id)) {
        errors.push(
          `Duplicate component id "${comp.id}" (in screens "${componentIds.get(comp.id)}" and "${screenId}")`
        );
      }
      componentIds.set(comp.id, screenId);
    } else {
      errors.push(`Component of type "${comp.type}" in screen "${screenId}" is missing "id"`);
    }

    const props = comp.props ?? {};

    // visibleWhen references
    if (comp.visibleWhen?.stateKey) {
      const vk = comp.visibleWhen.stateKey;
      if (!declaredStateKeys.has(vk) && !asyncPopulatedKeys.has(vk)) {
        warnings.push(
          `${screenId}/${comp.id}: visibleWhen references "${vk}" not in initialState (may be set by async action)`
        );
      }
    }

    switch (comp.type) {
      case "text":
        if (props.stateKey && !declaredStateKeys.has(props.stateKey) && !asyncPopulatedKeys.has(props.stateKey)) {
          warnings.push(`${screenId}/${comp.id}: text stateKey "${props.stateKey}" not in initialState`);
        }
        break;

      case "input":
      case "slider":
      case "toggle":
      case "select":
      case "datePicker":
        if (props.stateKey && !declaredStateKeys.has(props.stateKey)) {
          errors.push(
            `${screenId}/${comp.id}: ${comp.type} binds to stateKey "${props.stateKey}" which is not in initialState (input will not work)`
          );
        }
        break;

      case "list":
        if (props.dataKey) {
          const initVal = (s.initialState ?? {})[props.dataKey];
          if (initVal !== undefined && !Array.isArray(initVal)) {
            errors.push(
              `${screenId}/${comp.id}: list dataKey "${props.dataKey}" is initialized to ${typeof initVal}, must be an array`
            );
          }
          if (initVal === undefined && !asyncPopulatedKeys.has(props.dataKey)) {
            warnings.push(
              `${screenId}/${comp.id}: list dataKey "${props.dataKey}" not in initialState (will be empty until set)`
            );
          }
        }
        if (props.renderItem?.components) {
          for (const child of props.renderItem.components) {
            walkComponent(child, screenId);
          }
        }
        break;

      case "chart":
        if (props.dataKey) {
          const initVal = (s.initialState ?? {})[props.dataKey];
          if (initVal !== undefined && !Array.isArray(initVal)) {
            errors.push(
              `${screenId}/${comp.id}: chart dataKey "${props.dataKey}" is initialized to ${typeof initVal}, must be an array`
            );
          }
        }
        break;

      case "webView": {
        const html: string = props.html ?? "";
        if (!html || html.trim().length < 50) {
          errors.push(`${screenId}/${comp.id}: webView HTML is empty or trivial (< 50 chars)`);
        }
        if (EXTERNAL_RESOURCE_RE.test(html)) {
          errors.push(
            `${screenId}/${comp.id}: webView contains external script/link tags (must be self-contained)`
          );
        }
        if (props.stateKeys?.length > 0 && !html.includes("SwissKnife")) {
          warnings.push(
            `${screenId}/${comp.id}: webView declares stateKeys but HTML doesn't reference the SwissKnife bridge`
          );
        }
        if (props.allowBridge && !html.includes("SwissKnife")) {
          warnings.push(
            `${screenId}/${comp.id}: webView has allowBridge=true but HTML doesn't use the SwissKnife bridge API`
          );
        }
        break;
      }

      case "progress":
        if (props.stateKey && !declaredStateKeys.has(props.stateKey) && !asyncPopulatedKeys.has(props.stateKey)) {
          warnings.push(`${screenId}/${comp.id}: progress stateKey "${props.stateKey}" not in initialState`);
        }
        break;

      case "mapView":
        if (props.markersKey && !declaredStateKeys.has(props.markersKey) && !asyncPopulatedKeys.has(props.markersKey)) {
          warnings.push(`${screenId}/${comp.id}: mapView markersKey "${props.markersKey}" not in initialState`);
        }
        break;

      case "modal":
        if (props.visibleKey && !declaredStateKeys.has(props.visibleKey)) {
          errors.push(
            `${screenId}/${comp.id}: modal visibleKey "${props.visibleKey}" not in initialState (modal will never show)`
          );
        }
        break;

      case "tabs":
        if (props.stateKey && !declaredStateKeys.has(props.stateKey)) {
          errors.push(
            `${screenId}/${comp.id}: tabs stateKey "${props.stateKey}" not in initialState (tabs won't work)`
          );
        }
        break;
    }

    // Walk button actions
    if (props.action) walkAction(props.action, `${screenId}/${comp.id}`);
    if (props.onPress) walkAction(props.onPress, `${screenId}/${comp.id}.onPress`);
    if (props.onCapture) walkAction(props.onCapture, `${screenId}/${comp.id}.onCapture`);
    if (props.onRecordComplete) walkAction(props.onRecordComplete, `${screenId}/${comp.id}.onRecordComplete`);
    if (props.onMarkerPress) walkAction(props.onMarkerPress, `${screenId}/${comp.id}.onMarkerPress`);
    if (props.onMessage) walkAction(props.onMessage, `${screenId}/${comp.id}.onMessage`);

    // Walk children recursively
    if (Array.isArray(props.children)) {
      for (const child of props.children) walkComponent(child, screenId);
    }
    if (Array.isArray(props.tabs)) {
      for (const tab of props.tabs) {
        if (Array.isArray(tab.children)) {
          for (const child of tab.children) walkComponent(child, screenId);
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // 5. Walk effects
  // -----------------------------------------------------------------------

  for (const effect of s.effects ?? []) {
    const loc = `effect(${effect.trigger}${effect.stateKey ? `:${effect.stateKey}` : ""})`;

    if (effect.trigger === "onInterval" && !effect.intervalMs) {
      errors.push(`${loc}: onInterval effect missing intervalMs`);
    }

    if (effect.trigger === "onInterval" && effect.intervalMs && effect.intervalMs < 1000) {
      warnings.push(`${loc}: intervalMs=${effect.intervalMs}ms is very fast, may cause rate limiting`);
    }

    if (effect.trigger === "onStateChange" && !effect.stateKey) {
      errors.push(`${loc}: onStateChange effect missing stateKey`);
    }

    if (effect.trigger === "onStateChange" && effect.stateKey) {
      if (!declaredStateKeys.has(effect.stateKey) && !asyncPopulatedKeys.has(effect.stateKey)) {
        warnings.push(`${loc}: watches "${effect.stateKey}" which is not in initialState`);
      }
    }

    if (effect.action) walkAction(effect.action, loc);
  }

  // -----------------------------------------------------------------------
  // 6. Walk all screens and components
  // -----------------------------------------------------------------------

  const screenIds = new Set<string>();
  for (const screen of s.screens ?? []) {
    if (screenIds.has(screen.id)) {
      errors.push(`Duplicate screen id "${screen.id}"`);
    }
    screenIds.add(screen.id);

    for (const comp of screen.components ?? []) {
      walkComponent(comp, screen.id);
    }
  }

  // -----------------------------------------------------------------------
  // 7. Server endpoint checks
  // -----------------------------------------------------------------------

  const endpointIds = new Set<string>();
  for (const ep of s.serverEndpoints ?? []) {
    if (endpointIds.has(ep.id)) {
      errors.push(`Duplicate server endpoint id "${ep.id}"`);
    }
    endpointIds.add(ep.id);

    if (ep.processing?.type === "proxy" && !ep.processing.targetUrl) {
      errors.push(`Server endpoint "${ep.id}": proxy type requires targetUrl`);
    }
    if (ep.processing?.type === "huggingface" && !ep.processing.model) {
      errors.push(`Server endpoint "${ep.id}": huggingface type requires model`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}
