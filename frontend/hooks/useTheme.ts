"use client";

import { useMemo } from "react";
import { createTheme } from "@mui/material";

function useTheme() {
  return useMemo(
    () =>
      createTheme({
        palette: {
          mode: "dark",
          background: {
            default: "#15202b",
            paper: "#192734",
          },
          text: {
            primary: "#fff",
            secondary: "#8899A6",
          },
          primary: {
            main: "#1DA1F2",
          },
          secondary: {
            main: "#8899A6",
          },
        },
        typography: {
          fontFamily: "Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          body1: {
            fontSize: "0.95rem",
          },
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundColor: "#192734",
              },
            },
          },
        },
      }),
    [],
  );
}

export default useTheme;
