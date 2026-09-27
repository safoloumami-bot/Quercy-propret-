"use client";

import { Toaster } from "@quercy/ui/components/toaster";
import { TooltipProvider } from "@quercy/ui/components/tooltip";
import { ThemeProvider, useTheme } from "next-themes";
import type * as React from "react";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme === "dark" ? "dark" : "light"} />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        {children}
        <ThemedToaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
