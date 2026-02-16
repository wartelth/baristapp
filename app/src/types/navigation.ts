import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from "@react-navigation/native";

// ---------------------------------------------------------------------------
// Param lists
// ---------------------------------------------------------------------------

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  MainTabs: NavigatorScreenParams<TabParamList>;
  MiniApp: { appId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type TabParamList = {
  Library: undefined;
  Create: undefined;
  Profile: undefined;
};

// ---------------------------------------------------------------------------
// Screen props (composite so tab screens can navigate to stack screens)
// ---------------------------------------------------------------------------

export type LibraryScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Library">,
  NativeStackScreenProps<RootStackParamList>
>;

export type CreateScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Create">,
  NativeStackScreenProps<RootStackParamList>
>;

export type ProfileScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Profile">,
  NativeStackScreenProps<RootStackParamList>
>;

export type MiniAppScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "MiniApp"
>;
