import { z } from "zod";

// =============================================================================
// CONDITIONAL VISIBILITY
// =============================================================================

export const VisibleWhen = z.object({
  stateKey: z.string(),
  operator: z.enum(["eq", "neq", "gt", "lt", "gte", "lte", "truthy", "falsy", "contains"]),
  value: z.unknown().optional(),
});

// =============================================================================
// THEME
// =============================================================================

export const Theme = z.object({
  backgroundColor: z.string().optional(),
  surfaceColor: z.string().optional(),
  primaryColor: z.string().optional(),
  textColor: z.string().optional(),
  secondaryTextColor: z.string().optional(),
  borderColor: z.string().optional(),
  dangerColor: z.string().optional(),
  successColor: z.string().optional(),
});

// =============================================================================
// ACTIONS — v1 (kept for backward compat) + v2 new actions
// =============================================================================

export const NavigateAction = z.object({
  type: z.literal("navigate"),
  screenId: z.string(),
});

export const SetStateAction = z.object({
  type: z.literal("setState"),
  key: z.string(),
  value: z.unknown(),
});

export const AppendAction = z.object({
  type: z.literal("append"),
  key: z.string(),
  fromKey: z.string().optional(),
  value: z.unknown().optional(),
});

export const RemoveAction = z.object({
  type: z.literal("remove"),
  key: z.string(),
  index: z.number().optional(),
});

export const SubmitAction = z.object({
  type: z.literal("submit"),
  targetKey: z.string(),
});

// --- v2 actions ---

export const HttpAction = z.object({
  type: z.literal("http"),
  url: z.string(),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
  headers: z.record(z.string()).optional(),
  bodyKey: z.string().optional(),
  resultKey: z.string(),
  loadingKey: z.string().optional(),
  errorKey: z.string().optional(),
});

export const ComputeAction = z.object({
  type: z.literal("compute"),
  operation: z.enum([
    // Arithmetic
    "add", "subtract", "multiply", "divide", "modulo",
    "increment", "decrement",
    "round", "ceil", "floor", "abs", "random", "pow", "sqrt",
    "min", "max", "clamp",
    // String
    "concat", "toUpperCase", "toLowerCase", "trim",
    "replace", "split", "join", "padStart", "padEnd",
    "substring", "capitalize",
    // Array
    "length", "push", "pop", "shift", "unshift",
    "reverse", "sort", "unique", "flatten",
    "sum", "avg", "pluck",
    // Boolean
    "toggle",
    // Date/Time
    "now", "formatDate", "dateDiff",
    // Type conversion
    "toNumber", "toString", "toBoolean",
    // JSON
    "jsonParse", "jsonStringify",
  ]),
  key: z.string(),
  operands: z.array(z.unknown()).optional(),
  resultKey: z.string().optional(),
});

/** Transform action — evaluate an expression and store the result */
export const TransformAction = z.object({
  type: z.literal("transform"),
  expression: z.string(),
  resultKey: z.string(),
});

/** SetMultiple — set many state keys at once */
export const SetMultipleAction = z.object({
  type: z.literal("setMultiple"),
  values: z.record(z.string(), z.unknown()),
});

export const ServerCallAction = z.object({
  type: z.literal("serverCall"),
  endpointId: z.string(),
  dataKey: z.string().optional(),
  resultKey: z.string(),
  loadingKey: z.string().optional(),
  errorKey: z.string().optional(),
});

export const SkillCallAction = z.object({
  type: z.literal("skillCall"),
  skillId: z.string(),
  actionId: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
  resultKey: z.string(),
  loadingKey: z.string().optional(),
  errorKey: z.string().optional(),
});

export const HapticAction = z.object({
  type: z.literal("haptic"),
  style: z.enum(["light", "medium", "heavy", "success", "warning", "error"]).optional(),
});

export const CopyToClipboardAction = z.object({
  type: z.literal("copyToClipboard"),
  fromKey: z.string().optional(),
  value: z.string().optional(),
});

export const GetLocationAction = z.object({
  type: z.literal("getLocation"),
  resultKey: z.string(),
  latitudeKey: z.string().optional(),
  longitudeKey: z.string().optional(),
  loadingKey: z.string().optional(),
  errorKey: z.string().optional(),
});

// Forward-declare Action as ZodType for recursive references
export type ActionType = z.infer<typeof Action>;
export const Action: z.ZodType = z.lazy(() =>
  z.union([
    // v1 actions
    NavigateAction,
    SetStateAction,
    AppendAction,
    RemoveAction,
    SubmitAction,
    // v2 actions
    HttpAction,
    ComputeAction,
    ServerCallAction,
    SkillCallAction,
    HapticAction,
    CopyToClipboardAction,
    GetLocationAction,
    // v3 expression-powered actions
    TransformAction,
    SetMultipleAction,
    // recursive actions
    TimerAction,
    ConditionalAction,
    BatchAction,
  ])
);

export const TimerAction = z.object({
  type: z.literal("timer"),
  timerId: z.string(),
  command: z.enum(["start", "stop", "reset"]),
  intervalMs: z.number().optional(),
  tickAction: z.lazy((): z.ZodType => Action).optional(),
});

export const ConditionalAction = z.object({
  type: z.literal("conditional"),
  stateKey: z.string(),
  operator: z.enum(["eq", "neq", "gt", "lt", "gte", "lte", "truthy", "falsy"]),
  value: z.unknown().optional(),
  thenAction: z.lazy((): z.ZodType => Action),
  elseAction: z.lazy((): z.ZodType => Action).optional(),
});

export const BatchAction = z.object({
  type: z.literal("batch"),
  actions: z.array(z.lazy((): z.ZodType => Action)),
});

// =============================================================================
// COMPONENTS — v1 originals (5) + v2 new (15) = 20 total
// =============================================================================

// Forward-declare Component as ZodType for recursive children
export const Component: z.ZodType = z.lazy(() =>
  z.union([
    // v1 components
    TextComponent,
    ButtonComponent,
    InputComponent,
    ImageComponent,
    ListComponent,
    // v2 layout
    CardComponent,
    ContainerComponent,
    TabsComponent,
    ModalComponent,
    DividerComponent,
    SpacerComponent,
    // v2 input
    SliderComponent,
    ToggleComponent,
    SelectComponent,
    DatePickerComponent,
    // v2 media
    CameraViewComponent,
    AudioRecorderComponent,
    // v2 data viz
    ChartComponent,
    ProgressComponent,
    MapViewComponent,
    // v3 webview
    WebViewComponent,
  ])
);

// --- v1 components ---

export const TextComponent = z.object({
  type: z.literal("text"),
  id: z.string(),
  props: z.object({
    content: z.string(),
    variant: z.enum(["title", "subtitle", "body", "caption"]).optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    stateKey: z.string().optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

export const ButtonComponent = z.object({
  type: z.literal("button"),
  id: z.string(),
  props: z.object({
    label: z.string(),
    action: z.lazy((): z.ZodType => Action),
    variant: z.enum(["primary", "secondary", "danger"]).optional(),
    disabled: z.union([z.boolean(), z.string()]).optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

export const InputComponent = z.object({
  type: z.literal("input"),
  id: z.string(),
  props: z.object({
    placeholder: z.string().optional(),
    stateKey: z.string(),
    multiline: z.boolean().optional(),
    inputType: z.enum(["text", "number", "email"]).optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

export const ImageComponent = z.object({
  type: z.literal("image"),
  id: z.string(),
  props: z.object({
    uri: z.string().optional(),
    stateKey: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    resizeMode: z.enum(["cover", "contain", "stretch"]).optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

export const ListComponent = z.object({
  type: z.literal("list"),
  id: z.string(),
  props: z.object({
    dataKey: z.string(),
    emptyText: z.string().optional(),
    renderItem: z.object({
      components: z.array(z.lazy((): z.ZodType => Component)),
    }),
  }),
  visibleWhen: VisibleWhen.optional(),
});

// --- v2 layout components ---

export const CardComponent = z.object({
  type: z.literal("card"),
  id: z.string(),
  props: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    children: z.array(z.lazy((): z.ZodType => Component)),
    elevation: z.number().optional(),
    onPress: z.lazy((): z.ZodType => Action).optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

export const ContainerComponent = z.object({
  type: z.literal("container"),
  id: z.string(),
  props: z.object({
    children: z.array(z.lazy((): z.ZodType => Component)),
    direction: z.enum(["row", "column"]).optional(),
    gap: z.number().optional(),
    padding: z.number().optional(),
    align: z.enum(["flex-start", "center", "flex-end", "stretch"]).optional(),
    justify: z.enum(["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"]).optional(),
    wrap: z.boolean().optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

export const TabsComponent = z.object({
  type: z.literal("tabs"),
  id: z.string(),
  props: z.object({
    stateKey: z.string(),
    tabs: z.array(z.object({
      label: z.string(),
      value: z.string(),
      children: z.array(z.lazy((): z.ZodType => Component)),
    })),
  }),
  visibleWhen: VisibleWhen.optional(),
});

export const ModalComponent = z.object({
  type: z.literal("modal"),
  id: z.string(),
  props: z.object({
    visibleKey: z.string(),
    title: z.string().optional(),
    children: z.array(z.lazy((): z.ZodType => Component)),
  }),
  visibleWhen: VisibleWhen.optional(),
});

export const DividerComponent = z.object({
  type: z.literal("divider"),
  id: z.string(),
  props: z.object({
    color: z.string().optional(),
    thickness: z.number().optional(),
    marginVertical: z.number().optional(),
  }).optional(),
  visibleWhen: VisibleWhen.optional(),
});

export const SpacerComponent = z.object({
  type: z.literal("spacer"),
  id: z.string(),
  props: z.object({
    height: z.number().optional(),
    flex: z.number().optional(),
  }).optional(),
  visibleWhen: VisibleWhen.optional(),
});

// --- v2 input components ---

export const SliderComponent = z.object({
  type: z.literal("slider"),
  id: z.string(),
  props: z.object({
    stateKey: z.string(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    label: z.string().optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

export const ToggleComponent = z.object({
  type: z.literal("toggle"),
  id: z.string(),
  props: z.object({
    stateKey: z.string(),
    label: z.string().optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

export const SelectComponent = z.object({
  type: z.literal("select"),
  id: z.string(),
  props: z.object({
    stateKey: z.string(),
    options: z.array(z.object({
      label: z.string(),
      value: z.string(),
    })),
    placeholder: z.string().optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

export const DatePickerComponent = z.object({
  type: z.literal("datePicker"),
  id: z.string(),
  props: z.object({
    stateKey: z.string(),
    mode: z.enum(["date", "time", "datetime"]).optional(),
    label: z.string().optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

// --- v2 media components ---

export const CameraViewComponent = z.object({
  type: z.literal("cameraView"),
  id: z.string(),
  props: z.object({
    stateKey: z.string(),
    facing: z.enum(["front", "back"]).optional(),
    height: z.number().optional(),
    onCapture: z.lazy((): z.ZodType => Action).optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

export const AudioRecorderComponent = z.object({
  type: z.literal("audioRecorder"),
  id: z.string(),
  props: z.object({
    stateKey: z.string(),
    maxDuration: z.number().optional(),
    onRecordComplete: z.lazy((): z.ZodType => Action).optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

// --- v3 webview component (Apple 4.7 compliant HTML5 mini-apps) ---

export const WebViewComponent = z.object({
  type: z.literal("webView"),
  id: z.string(),
  props: z.object({
    /** Inline HTML content to render in the WebView */
    html: z.string().optional(),
    /** State key containing HTML content */
    htmlKey: z.string().optional(),
    /** Height of the WebView in pixels */
    height: z.number().optional(),
    /** State keys to inject into the WebView as window.__SWISSKNIFE_STATE__ */
    stateKeys: z.array(z.string()).optional(),
    /** Whether to allow the WebView to communicate back via postMessage */
    allowBridge: z.boolean().optional(),
    /** Action to dispatch when WebView sends a message */
    onMessage: z.lazy((): z.ZodType => Action).optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

// --- v2 data visualization components ---

export const ChartComponent = z.object({
  type: z.literal("chart"),
  id: z.string(),
  props: z.object({
    chartType: z.enum(["bar", "line", "pie"]),
    dataKey: z.string(),
    xKey: z.string().optional(),
    yKey: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    color: z.string().optional(),
    colors: z.array(z.string()).optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

export const ProgressComponent = z.object({
  type: z.literal("progress"),
  id: z.string(),
  props: z.object({
    stateKey: z.string(),
    variant: z.enum(["bar", "circle"]).optional(),
    max: z.number().optional(),
    color: z.string().optional(),
    label: z.string().optional(),
    height: z.number().optional(),
    size: z.number().optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

export const MapViewComponent = z.object({
  type: z.literal("mapView"),
  id: z.string(),
  props: z.object({
    markersKey: z.string().optional(),
    initialRegion: z.object({
      latitude: z.number(),
      longitude: z.number(),
      latitudeDelta: z.number(),
      longitudeDelta: z.number(),
    }).optional(),
    height: z.number().optional(),
    onMarkerPress: z.lazy((): z.ZodType => Action).optional(),
  }),
  visibleWhen: VisibleWhen.optional(),
});

// =============================================================================
// SCREEN
// =============================================================================

export const Screen = z.object({
  id: z.string(),
  title: z.string().optional(),
  components: z.array(Component),
});

// =============================================================================
// DATA MODEL (optional schema hint for storage)
// =============================================================================

export const DataField = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "array"]),
  default: z.unknown().optional(),
});

export const DataEntity = z.object({
  name: z.string(),
  fields: z.array(DataField),
});

export const DataModel = z.object({
  entities: z.array(DataEntity),
});

// =============================================================================
// CAPABILITIES
// =============================================================================

export const Capability = z.enum([
  "localStorage",
  "camera",
  "network",
  "microphone",
  "location",
  "haptics",
  "clipboard",
  "notifications",
  "supabaseStorage",
  "skills",
]);

// =============================================================================
// SERVER ENDPOINTS (v2)
// =============================================================================

export const ServerEndpoint = z.object({
  id: z.string(),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
  processing: z.object({
    type: z.enum(["huggingface", "transform", "proxy"]),
    model: z.string().optional(),
    task: z.string().optional(),
    targetUrl: z.string().optional(),
    template: z.record(z.unknown()).optional(),
  }),
});

// =============================================================================
// EFFECTS (v2)
// =============================================================================

export const Effect = z.object({
  trigger: z.enum(["onMount", "onInterval", "onStateChange"]),
  action: z.lazy((): z.ZodType => Action),
  stateKey: z.string().optional(),
  intervalMs: z.number().optional(),
});

// =============================================================================
// TOP-LEVEL MINI-APP SCHEMAS
// =============================================================================

const coerceVersion = (v: number) => Math.round(v) as 1 | 2;

/** v1 schema — backward compat */
export const MiniAppSchemaV1 = z.object({
  appId: z.string(),
  title: z.string(),
  icon: z.string().optional(),
  version: z.number().transform(coerceVersion).pipe(z.literal(1)),
  capabilities: z.array(Capability).default(["localStorage"]),
  screens: z.array(Screen).min(1),
  dataModel: DataModel.optional(),
  initialState: z.record(z.string(), z.unknown()).optional(),
});

/** v2 schema — full power */
export const MiniAppSchemaV2 = z.object({
  appId: z.string(),
  title: z.string(),
  icon: z.string().optional(),
  version: z.number().transform(coerceVersion).pipe(z.literal(2)),
  capabilities: z.array(Capability).default(["localStorage"]),
  screens: z.array(Screen).min(1),
  dataModel: DataModel.optional(),
  initialState: z.record(z.string(), z.unknown()).optional(),
  theme: Theme.optional(),
  serverEndpoints: z.array(ServerEndpoint).optional(),
  effects: z.array(Effect).optional(),
  skills: z.array(z.string()).optional(),
});

/** Unified schema — accepts both v1 and v2 */
export const MiniAppSchema = z.union([MiniAppSchemaV2, MiniAppSchemaV1]);
