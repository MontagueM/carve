"use client";

import { Container, CssBaseline, ThemeProvider } from "@mui/material";
import React, { Suspense } from "react";
import useTheme from "@/hooks/useTheme";
import WalletProvider from "@/context/WalletProvider";
import Header from "@/components/Header";

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
          <WalletProvider>
            <Suspense>
              <Container maxWidth="sm" style={{ paddingTop: "1rem" }}>
                <Header />
                {children}
              </Container>
            </Suspense>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
