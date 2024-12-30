"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import React from "react";
import useTheme from "@/hooks/useTheme";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body>
        <ThemeProvider theme={useTheme()}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
