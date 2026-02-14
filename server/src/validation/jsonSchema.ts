/**
 * Static JSON Schema equivalent of the MiniApp Zod schema.
 * Used by the Claude Agent SDK's outputFormat for structured output.
 * Kept as a static definition for stability (no zod-to-json-schema dependency).
 */

const ActionSchema = {
  oneOf: [
    {
      type: "object" as const,
      properties: {
        type: { type: "string" as const, const: "navigate" },
        screenId: { type: "string" as const },
      },
      required: ["type", "screenId"],
      additionalProperties: false,
    },
    {
      type: "object" as const,
      properties: {
        type: { type: "string" as const, const: "setState" },
        key: { type: "string" as const },
        value: {},
      },
      required: ["type", "key", "value"],
      additionalProperties: false,
    },
    {
      type: "object" as const,
      properties: {
        type: { type: "string" as const, const: "append" },
        key: { type: "string" as const },
        fromKey: { type: "string" as const },
        value: {},
      },
      required: ["type", "key"],
      additionalProperties: false,
    },
    {
      type: "object" as const,
      properties: {
        type: { type: "string" as const, const: "remove" },
        key: { type: "string" as const },
        index: { type: "number" as const },
      },
      required: ["type", "key"],
      additionalProperties: false,
    },
    {
      type: "object" as const,
      properties: {
        type: { type: "string" as const, const: "submit" },
        targetKey: { type: "string" as const },
      },
      required: ["type", "targetKey"],
      additionalProperties: false,
    },
  ],
};

const ComponentSchema: Record<string, unknown> = {
  oneOf: [
    {
      type: "object",
      properties: {
        type: { type: "string", const: "text" },
        id: { type: "string" },
        props: {
          type: "object",
          properties: {
            content: { type: "string" },
            variant: { type: "string", enum: ["title", "subtitle", "body", "caption"] },
            align: { type: "string", enum: ["left", "center", "right"] },
            stateKey: { type: "string" },
          },
          required: ["content"],
          additionalProperties: false,
        },
      },
      required: ["type", "id", "props"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        type: { type: "string", const: "button" },
        id: { type: "string" },
        props: {
          type: "object",
          properties: {
            label: { type: "string" },
            variant: { type: "string", enum: ["primary", "secondary", "danger"] },
            action: ActionSchema,
          },
          required: ["label", "action"],
          additionalProperties: false,
        },
      },
      required: ["type", "id", "props"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        type: { type: "string", const: "input" },
        id: { type: "string" },
        props: {
          type: "object",
          properties: {
            placeholder: { type: "string" },
            stateKey: { type: "string" },
            multiline: { type: "boolean" },
            inputType: { type: "string", enum: ["text", "number", "email"] },
          },
          required: ["stateKey"],
          additionalProperties: false,
        },
      },
      required: ["type", "id", "props"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        type: { type: "string", const: "image" },
        id: { type: "string" },
        props: {
          type: "object",
          properties: {
            uri: { type: "string" },
            stateKey: { type: "string" },
            width: { type: "number" },
            height: { type: "number" },
            resizeMode: { type: "string", enum: ["cover", "contain", "stretch"] },
          },
          additionalProperties: false,
        },
      },
      required: ["type", "id", "props"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        type: { type: "string", const: "list" },
        id: { type: "string" },
        props: {
          type: "object",
          properties: {
            dataKey: { type: "string" },
            emptyText: { type: "string" },
            renderItem: {
              type: "object",
              properties: {
                components: {
                  type: "array",
                  items: { $ref: "#/$defs/Component" },
                },
              },
              required: ["components"],
              additionalProperties: false,
            },
          },
          required: ["dataKey", "renderItem"],
          additionalProperties: false,
        },
      },
      required: ["type", "id", "props"],
      additionalProperties: false,
    },
  ],
};

export const MiniAppJSONSchema = {
  type: "object" as const,
  properties: {
    appId: { type: "string" as const },
    title: { type: "string" as const },
    icon: { type: "string" as const },
    version: { type: "number" as const, const: 1 },
    capabilities: {
      type: "array" as const,
      items: { type: "string" as const, enum: ["localStorage", "camera", "network"] },
    },
    screens: {
      type: "array" as const,
      minItems: 1,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          title: { type: "string" as const },
          components: {
            type: "array" as const,
            items: { $ref: "#/$defs/Component" },
          },
        },
        required: ["id", "components"] as const,
        additionalProperties: false,
      },
    },
    initialState: {
      type: "object" as const,
      additionalProperties: true,
    },
  },
  required: ["appId", "title", "version", "screens"] as const,
  additionalProperties: false,
  $defs: {
    Component: ComponentSchema,
  },
};
