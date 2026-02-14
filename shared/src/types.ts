import { z } from "zod";
import {
  MiniAppSchema,
  Screen,
  Component,
  Action,
  Capability,
  DataModel,
  DataEntity,
  DataField,
  TextComponent,
  ButtonComponent,
  InputComponent,
  ListComponent,
  ImageComponent,
} from "./schema";

// Inferred TypeScript types from Zod schemas
export type MiniApp = z.infer<typeof MiniAppSchema>;
export type MiniAppScreen = z.infer<typeof Screen>;
export type MiniAppComponent = z.infer<typeof Component>;
export type MiniAppAction = z.infer<typeof Action>;
export type MiniAppCapability = z.infer<typeof Capability>;
export type MiniAppDataModel = z.infer<typeof DataModel>;
export type MiniAppDataEntity = z.infer<typeof DataEntity>;
export type MiniAppDataField = z.infer<typeof DataField>;

// Individual component types
export type TextComponentType = z.infer<typeof TextComponent>;
export type ButtonComponentType = z.infer<typeof ButtonComponent>;
export type InputComponentType = z.infer<typeof InputComponent>;
export type ListComponentType = z.infer<typeof ListComponent>;
export type ImageComponentType = z.infer<typeof ImageComponent>;

// API types
export interface GenerateRequest {
  prompt: string;
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
