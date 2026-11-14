"use client";

import { Toaster } from "@quercy/ui/components/toaster";
import { TooltipProvider } from "@quercy/ui/components/tooltip";
import { ThemeProvider, useTheme } from "next-themes";
import type * as React from "react";

import { TRPCReactProvider } from "@/lib/trpc";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme === "dark" ? "dark" : "light"} />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TRPCReactProvider>
        <TooltipProvider>
          {children}
          <ThemedToaster />
        </TooltipProvider>
      </TRPCReactProvider>
    </ThemeProvider>
  );
}
