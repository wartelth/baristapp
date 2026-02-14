import { z } from "zod";
import {
  MiniAppSchema,
  MiniAppSchemaV1,
  MiniAppSchemaV2,
  Screen,
  Component,
  Action,
  Capability,
  DataModel,
  DataEntity,
  DataField,
  VisibleWhen,
  Theme,
  ServerEndpoint,
  Effect,
  // v1 components
  TextComponent,
  ButtonComponent,
  InputComponent,
  ListComponent,
  ImageComponent,
  // v2 components
  CardComponent,
  ContainerComponent,
  TabsComponent,
  ModalComponent,
  DividerComponent,
  SpacerComponent,
  SliderComponent,
  ToggleComponent,
  SelectComponent,
  DatePickerComponent,
  CameraViewComponent,
  AudioRecorderComponent,
  ChartComponent,
  ProgressComponent,
  MapViewComponent,
  // v1 actions
  NavigateAction,
  SetStateAction,
  AppendAction,
  RemoveAction,
  SubmitAction,
  // v2 actions
  HttpAction,
  ComputeAction,
  TimerAction,
  ConditionalAction,
  BatchAction,
  ServerCallAction,
  HapticAction,
  CopyToClipboardAction,
} from "./schema";

// Top-level app types
export type MiniApp = z.infer<typeof MiniAppSchema>;
export type MiniAppV1 = z.infer<typeof MiniAppSchemaV1>;
export type MiniAppV2 = z.infer<typeof MiniAppSchemaV2>;
export type MiniAppScreen = z.infer<typeof Screen>;
export type MiniAppComponent = z.infer<typeof Component>;
export type MiniAppAction = z.infer<typeof Action>;
export type MiniAppCapability = z.infer<typeof Capability>;
export type MiniAppDataModel = z.infer<typeof DataModel>;
export type MiniAppDataEntity = z.infer<typeof DataEntity>;
export type MiniAppDataField = z.infer<typeof DataField>;

// v2 top-level types
export type MiniAppTheme = z.infer<typeof Theme>;
export type MiniAppServerEndpoint = z.infer<typeof ServerEndpoint>;
export type MiniAppEffect = z.infer<typeof Effect>;
export type MiniAppVisibleWhen = z.infer<typeof VisibleWhen>;

// Individual component types
export type TextComponentType = z.infer<typeof TextComponent>;
export type ButtonComponentType = z.infer<typeof ButtonComponent>;
export type InputComponentType = z.infer<typeof InputComponent>;
export type ListComponentType = z.infer<typeof ListComponent>;
export type ImageComponentType = z.infer<typeof ImageComponent>;
export type CardComponentType = z.infer<typeof CardComponent>;
export type ContainerComponentType = z.infer<typeof ContainerComponent>;
export type TabsComponentType = z.infer<typeof TabsComponent>;
export type ModalComponentType = z.infer<typeof ModalComponent>;
export type DividerComponentType = z.infer<typeof DividerComponent>;
export type SpacerComponentType = z.infer<typeof SpacerComponent>;
export type SliderComponentType = z.infer<typeof SliderComponent>;
export type ToggleComponentType = z.infer<typeof ToggleComponent>;
export type SelectComponentType = z.infer<typeof SelectComponent>;
export type DatePickerComponentType = z.infer<typeof DatePickerComponent>;
export type CameraViewComponentType = z.infer<typeof CameraViewComponent>;
export type AudioRecorderComponentType = z.infer<typeof AudioRecorderComponent>;
export type ChartComponentType = z.infer<typeof ChartComponent>;
export type ProgressComponentType = z.infer<typeof ProgressComponent>;
export type MapViewComponentType = z.infer<typeof MapViewComponent>;

// Individual action types
export type NavigateActionType = z.infer<typeof NavigateAction>;
export type SetStateActionType = z.infer<typeof SetStateAction>;
export type AppendActionType = z.infer<typeof AppendAction>;
export type RemoveActionType = z.infer<typeof RemoveAction>;
export type SubmitActionType = z.infer<typeof SubmitAction>;
export type HttpActionType = z.infer<typeof HttpAction>;
export type ComputeActionType = z.infer<typeof ComputeAction>;
export type TimerActionType = z.infer<typeof TimerAction>;
export type ConditionalActionType = z.infer<typeof ConditionalAction>;
export type BatchActionType = z.infer<typeof BatchAction>;
export type ServerCallActionType = z.infer<typeof ServerCallAction>;
export type HapticActionType = z.infer<typeof HapticAction>;
export type CopyToClipboardActionType = z.infer<typeof CopyToClipboardAction>;

// ---------------------------------------------------------------------------
// Clarification API types
// ---------------------------------------------------------------------------

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: "single" | "multiple" | "freeform";
  options?: string[];
}

export interface ClarifyRequest {
  prompt: string;
}

export interface ClarifyResponse {
  success: true;
  questions: ClarificationQuestion[];
  summary: string; // AI's understanding of the request
}

export interface ClarifyError {
  success: false;
  error: string;
}

export type ClarifyResult = ClarifyResponse | ClarifyError;

// ---------------------------------------------------------------------------
// Modification API types
// ---------------------------------------------------------------------------

export interface ModifyRequest {
  currentSpec: MiniApp;
  modifyPrompt: string;
}

export interface ModifyResponse {
  success: true;
  miniApp: MiniApp;
}

export interface ModifyError {
  success: false;
  error: string;
}

export type ModifyResult = ModifyResponse | ModifyError;

// ---------------------------------------------------------------------------
// Generation API types
// ---------------------------------------------------------------------------

export interface GenerateRequest {
  prompt: string;
  clarifications?: { questionId: string; answer: string }[];
}

export interface GenerateResponse {
  success: true;
  miniApp: MiniApp;
}

export interface GenerateError {
  success: false;
  error: string;
}

export type GenerateResult = GenerateResponse | GenerateError;
