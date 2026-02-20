/**
 * Static JSON Schema for the v2 MiniApp schema.
 * Used by the Claude Agent SDK's outputFormat for structured output.
 */

const VisibleWhenSchema = {
  type: "object" as const,
  properties: {
    stateKey: { type: "string" as const },
    operator: { type: "string" as const, enum: ["eq", "neq", "gt", "lt", "gte", "lte", "truthy", "falsy", "contains"] },
    value: {},
  },
  required: ["stateKey", "operator"] as const,
};

const ActionSchema: Record<string, unknown> = {
  oneOf: [
    // navigate
    { type: "object", properties: { type: { type: "string", const: "navigate" }, screenId: { type: "string" } }, required: ["type", "screenId"] },
    // setState
    { type: "object", properties: { type: { type: "string", const: "setState" }, key: { type: "string" }, value: {} }, required: ["type", "key", "value"] },
    // append
    { type: "object", properties: { type: { type: "string", const: "append" }, key: { type: "string" }, fromKey: { type: "string" }, value: {} }, required: ["type", "key"] },
    // remove
    { type: "object", properties: { type: { type: "string", const: "remove" }, key: { type: "string" }, index: { type: "number" } }, required: ["type", "key"] },
    // submit
    { type: "object", properties: { type: { type: "string", const: "submit" }, targetKey: { type: "string" } }, required: ["type", "targetKey"] },
    // http
    { type: "object", properties: { type: { type: "string", const: "http" }, url: { type: "string" }, method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE"] }, headers: { type: "object" }, bodyKey: { type: "string" }, resultKey: { type: "string" }, loadingKey: { type: "string" }, errorKey: { type: "string" } }, required: ["type", "url", "resultKey"] },
    // compute
    { type: "object", properties: { type: { type: "string", const: "compute" }, operation: { type: "string", enum: ["add", "subtract", "multiply", "divide", "concat", "length", "increment", "decrement", "toggle", "round", "random", "now", "min", "max", "toUpperCase", "toLowerCase"] }, key: { type: "string" }, operands: { type: "array" }, resultKey: { type: "string" } }, required: ["type", "operation", "key"] },
    // timer
    { type: "object", properties: { type: { type: "string", const: "timer" }, timerId: { type: "string" }, command: { type: "string", enum: ["start", "stop", "reset"] }, intervalMs: { type: "number" }, tickAction: { $ref: "#/$defs/Action" } }, required: ["type", "timerId", "command"] },
    // conditional
    { type: "object", properties: { type: { type: "string", const: "conditional" }, stateKey: { type: "string" }, operator: { type: "string", enum: ["eq", "neq", "gt", "lt", "gte", "lte", "truthy", "falsy"] }, value: {}, thenAction: { $ref: "#/$defs/Action" }, elseAction: { $ref: "#/$defs/Action" } }, required: ["type", "stateKey", "operator", "thenAction"] },
    // batch
    { type: "object", properties: { type: { type: "string", const: "batch" }, actions: { type: "array", items: { $ref: "#/$defs/Action" } } }, required: ["type", "actions"] },
    // serverCall
    { type: "object", properties: { type: { type: "string", const: "serverCall" }, endpointId: { type: "string" }, dataKey: { type: "string" }, resultKey: { type: "string" }, loadingKey: { type: "string" }, errorKey: { type: "string" } }, required: ["type", "endpointId", "resultKey"] },
    // haptic
    { type: "object", properties: { type: { type: "string", const: "haptic" }, style: { type: "string", enum: ["light", "medium", "heavy", "success", "warning", "error"] } }, required: ["type"] },
    // copyToClipboard
    { type: "object", properties: { type: { type: "string", const: "copyToClipboard" }, fromKey: { type: "string" }, value: { type: "string" } }, required: ["type"] },
    // transform
    { type: "object", properties: { type: { type: "string", const: "transform" }, expression: { type: "string" }, resultKey: { type: "string" } }, required: ["type", "expression", "resultKey"] },
    // setMultiple
    { type: "object", properties: { type: { type: "string", const: "setMultiple" }, values: { type: "object" } }, required: ["type", "values"] },
  ],
};

const ComponentSchema: Record<string, unknown> = {
  oneOf: [
    // text
    { type: "object", properties: { type: { type: "string", const: "text" }, id: { type: "string" }, props: { type: "object", properties: { content: { type: "string" }, variant: { type: "string", enum: ["title", "subtitle", "body", "caption"] }, align: { type: "string", enum: ["left", "center", "right"] }, stateKey: { type: "string" } }, required: ["content"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // button
    { type: "object", properties: { type: { type: "string", const: "button" }, id: { type: "string" }, props: { type: "object", properties: { label: { type: "string" }, action: { $ref: "#/$defs/Action" }, variant: { type: "string", enum: ["primary", "secondary", "danger"] }, disabled: {} }, required: ["label", "action"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // input
    { type: "object", properties: { type: { type: "string", const: "input" }, id: { type: "string" }, props: { type: "object", properties: { placeholder: { type: "string" }, stateKey: { type: "string" }, multiline: { type: "boolean" }, inputType: { type: "string", enum: ["text", "number", "email"] } }, required: ["stateKey"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // image
    { type: "object", properties: { type: { type: "string", const: "image" }, id: { type: "string" }, props: { type: "object", properties: { uri: { type: "string" }, stateKey: { type: "string" }, width: { type: "number" }, height: { type: "number" }, resizeMode: { type: "string", enum: ["cover", "contain", "stretch"] } } }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // list
    { type: "object", properties: { type: { type: "string", const: "list" }, id: { type: "string" }, props: { type: "object", properties: { dataKey: { type: "string" }, emptyText: { type: "string" }, renderItem: { type: "object", properties: { components: { type: "array", items: { $ref: "#/$defs/Component" } } }, required: ["components"] } }, required: ["dataKey", "renderItem"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // card
    { type: "object", properties: { type: { type: "string", const: "card" }, id: { type: "string" }, props: { type: "object", properties: { title: { type: "string" }, subtitle: { type: "string" }, children: { type: "array", items: { $ref: "#/$defs/Component" } }, elevation: { type: "number" }, onPress: { $ref: "#/$defs/Action" } }, required: ["children"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // container
    { type: "object", properties: { type: { type: "string", const: "container" }, id: { type: "string" }, props: { type: "object", properties: { children: { type: "array", items: { $ref: "#/$defs/Component" } }, direction: { type: "string", enum: ["row", "column"] }, gap: { type: "number" }, padding: { type: "number" }, align: { type: "string" }, justify: { type: "string" }, wrap: { type: "boolean" } }, required: ["children"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // tabs
    { type: "object", properties: { type: { type: "string", const: "tabs" }, id: { type: "string" }, props: { type: "object", properties: { stateKey: { type: "string" }, tabs: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" }, children: { type: "array", items: { $ref: "#/$defs/Component" } } }, required: ["label", "value", "children"] } } }, required: ["stateKey", "tabs"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // modal
    { type: "object", properties: { type: { type: "string", const: "modal" }, id: { type: "string" }, props: { type: "object", properties: { visibleKey: { type: "string" }, title: { type: "string" }, children: { type: "array", items: { $ref: "#/$defs/Component" } } }, required: ["visibleKey", "children"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // divider
    { type: "object", properties: { type: { type: "string", const: "divider" }, id: { type: "string" }, props: { type: "object", properties: { color: { type: "string" }, thickness: { type: "number" }, marginVertical: { type: "number" } } }, visibleWhen: VisibleWhenSchema }, required: ["type", "id"] },
    // spacer
    { type: "object", properties: { type: { type: "string", const: "spacer" }, id: { type: "string" }, props: { type: "object", properties: { height: { type: "number" }, flex: { type: "number" } } }, visibleWhen: VisibleWhenSchema }, required: ["type", "id"] },
    // slider
    { type: "object", properties: { type: { type: "string", const: "slider" }, id: { type: "string" }, props: { type: "object", properties: { stateKey: { type: "string" }, min: { type: "number" }, max: { type: "number" }, step: { type: "number" }, label: { type: "string" } }, required: ["stateKey"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // toggle
    { type: "object", properties: { type: { type: "string", const: "toggle" }, id: { type: "string" }, props: { type: "object", properties: { stateKey: { type: "string" }, label: { type: "string" } }, required: ["stateKey"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // select
    { type: "object", properties: { type: { type: "string", const: "select" }, id: { type: "string" }, props: { type: "object", properties: { stateKey: { type: "string" }, options: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } }, required: ["label", "value"] } }, placeholder: { type: "string" } }, required: ["stateKey", "options"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // datePicker
    { type: "object", properties: { type: { type: "string", const: "datePicker" }, id: { type: "string" }, props: { type: "object", properties: { stateKey: { type: "string" }, mode: { type: "string", enum: ["date", "time", "datetime"] }, label: { type: "string" } }, required: ["stateKey"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // cameraView
    { type: "object", properties: { type: { type: "string", const: "cameraView" }, id: { type: "string" }, props: { type: "object", properties: { stateKey: { type: "string" }, facing: { type: "string", enum: ["front", "back"] }, height: { type: "number" }, onCapture: { $ref: "#/$defs/Action" } }, required: ["stateKey"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // audioRecorder
    { type: "object", properties: { type: { type: "string", const: "audioRecorder" }, id: { type: "string" }, props: { type: "object", properties: { stateKey: { type: "string" }, maxDuration: { type: "number" }, onRecordComplete: { $ref: "#/$defs/Action" } }, required: ["stateKey"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // chart
    { type: "object", properties: { type: { type: "string", const: "chart" }, id: { type: "string" }, props: { type: "object", properties: { chartType: { type: "string", enum: ["bar", "line", "pie"] }, dataKey: { type: "string" }, xKey: { type: "string" }, yKey: { type: "string" }, width: { type: "number" }, height: { type: "number" }, color: { type: "string" }, colors: { type: "array", items: { type: "string" } } }, required: ["chartType", "dataKey"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // progress
    { type: "object", properties: { type: { type: "string", const: "progress" }, id: { type: "string" }, props: { type: "object", properties: { stateKey: { type: "string" }, variant: { type: "string", enum: ["bar", "circle"] }, max: { type: "number" }, color: { type: "string" }, label: { type: "string" }, height: { type: "number" }, size: { type: "number" } }, required: ["stateKey"] }, visibleWhen: VisibleWhenSchema }, required: ["type", "id", "props"] },
    // mapView
    { type: "object", properties: { type: { type: "string", const: "mapView" }, id: { type: "string" }, props: { type: "object", properties: { markersKey: { type: "string" }, initialRegion: { type: "object", properties: { latitude: { type: "number" }, longitude: { type: "number" }, latitudeDelta: { type: "number" }, longitudeDelta: { type: "number" } } }, height: { type: "number" }, onMarkerPress: { $ref: "#/$defs/Action" } } }, visibleWhen: VisibleWhenSchema }, required: ["type", "id"] },
  ],
};

const ThemeSchema = {
  type: "object" as const,
  properties: {
    backgroundColor: { type: "string" as const },
    surfaceColor: { type: "string" as const },
    primaryColor: { type: "string" as const },
    textColor: { type: "string" as const },
    secondaryTextColor: { type: "string" as const },
    borderColor: { type: "string" as const },
    dangerColor: { type: "string" as const },
    successColor: { type: "string" as const },
  },
};

const ServerEndpointSchema = {
  type: "object" as const,
  properties: {
    id: { type: "string" as const },
    method: { type: "string" as const, enum: ["GET", "POST", "PUT", "DELETE"] },
    processing: {
      type: "object" as const,
      properties: {
        type: { type: "string" as const, enum: ["huggingface", "transform", "proxy"] },
        model: { type: "string" as const },
        task: { type: "string" as const },
        targetUrl: { type: "string" as const },
        template: { type: "object" as const },
      },
      required: ["type"] as const,
    },
  },
  required: ["id", "processing"] as const,
};

const EffectSchema = {
  type: "object" as const,
  properties: {
    trigger: { type: "string" as const, enum: ["onMount", "onInterval", "onStateChange"] },
    action: { $ref: "#/$defs/Action" },
    stateKey: { type: "string" as const },
    intervalMs: { type: "number" as const },
  },
  required: ["trigger", "action"] as const,
};

export const MiniAppJSONSchema = {
  type: "object" as const,
  properties: {
    appId: { type: "string" as const },
    title: { type: "string" as const },
    icon: { type: "string" as const },
    version: { type: "number" as const, enum: [1, 2], description: "Must be 2 for v2 apps" },
    capabilities: {
      type: "array" as const,
      items: {
        type: "string" as const,
        enum: ["localStorage", "camera", "network", "microphone", "location", "haptics", "clipboard", "notifications", "supabaseStorage"],
      },
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
      },
    },
    initialState: { type: "object" as const, additionalProperties: true },
    theme: ThemeSchema,
    serverEndpoints: { type: "array" as const, items: ServerEndpointSchema },
    effects: { type: "array" as const, items: EffectSchema },
    dataModel: { type: "object" as const },
  },
  required: ["appId", "title", "version", "screens"] as const,
  $defs: {
    Component: ComponentSchema,
    Action: ActionSchema,
  },
};
