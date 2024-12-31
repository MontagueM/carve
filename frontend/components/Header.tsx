import { Typography } from "@mui/material";
import React from "react";
import Link from "next/link";

function Header() {
  return (
    <Link
      href="/"
      style={{
        textDecoration: "none",
      }}
    >
      <Typography
        variant="h4"
        gutterBottom
        style={{ fontWeight: "bold", color: "#fff", textAlign: "center" }}
      >
        carve
      </Typography>
    </Link>
  );
}

export default Header;
