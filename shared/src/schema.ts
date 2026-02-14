import { z } from "zod";

// ---------------------------------------------------------------------------
// Action types (declarative only — no callbacks, no executable code)
// ---------------------------------------------------------------------------

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

export const Action = z.discriminatedUnion("type", [
  NavigateAction,
  SetStateAction,
  AppendAction,
  RemoveAction,
  SubmitAction,
]);

// ---------------------------------------------------------------------------
// Component types
// ---------------------------------------------------------------------------

export const TextComponent = z.object({
  type: z.literal("text"),
  id: z.string(),
  props: z.object({
    content: z.string(),
    variant: z.enum(["title", "subtitle", "body", "caption"]).optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    stateKey: z.string().optional(),
  }),
});

export const ButtonComponent = z.object({
  type: z.literal("button"),
  id: z.string(),
  props: z.object({
    label: z.string(),
    action: Action,
    variant: z.enum(["primary", "secondary", "danger"]).optional(),
  }),
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
});

export const ListComponent = z.object({
  type: z.literal("list"),
  id: z.string(),
  props: z.object({
    dataKey: z.string(),
    emptyText: z.string().optional(),
    renderItem: z.object({
      // Use z.lazy for recursive reference — inner list items can contain any component
      components: z.array(z.lazy((): z.ZodType => Component)),
    }),
  }),
});

export const Component: z.ZodType = z.union([
  TextComponent,
  ButtonComponent,
  InputComponent,
  ImageComponent,
  ListComponent,
]);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export const Screen = z.object({
  id: z.string(),
  title: z.string().optional(),
  components: z.array(Component),
});

// ---------------------------------------------------------------------------
// Data model (optional schema hint for storage)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export const Capability = z.enum(["localStorage", "camera", "network"]);

// ---------------------------------------------------------------------------
// Top-level MiniApp schema
// ---------------------------------------------------------------------------

export const MiniAppSchema = z.object({
  appId: z.string(),
  title: z.string(),
  icon: z.string().optional(),
  version: z.literal(1),
  capabilities: z.array(Capability).default(["localStorage"]),
  screens: z.array(Screen).min(1),
  dataModel: DataModel.optional(),
  initialState: z.record(z.string(), z.unknown()).optional(),
});
