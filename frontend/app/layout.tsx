"use client";

import { Container, CssBaseline, ThemeProvider } from "@mui/material";
import React, { Suspense } from "react";
import useTheme from "@/hooks/useTheme";
import WalletProvider from "@/context/WalletProvider";
import Header from "@/components/Header";
import ContractStateProvider from "@/context/ContractStateProvider";

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
            <ContractStateProvider>
              <Suspense>
                <Container maxWidth="sm" style={{ paddingTop: "1rem" }}>
                  <Header />
                  {children}
                </Container>
              </Suspense>
            </ContractStateProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
