"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import React from "react";
import useTheme from "@/hooks/useTheme";
import WalletProvider from "@/context/WalletProvider";

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
          <WalletProvider>{children}</WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
