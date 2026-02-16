import React, { createContext, useContext } from "react";

interface OnboardingContextValue {
  onComplete: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  children,
  onComplete,
}: {
  children: React.ReactNode;
  onComplete: () => void;
}) {
  return (
    <OnboardingContext.Provider value={{ onComplete }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingComplete(): (() => void) | undefined {
  const ctx = useContext(OnboardingContext);
  return ctx?.onComplete;
}
