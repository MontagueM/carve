import React, { useMemo } from "react";
import { Box, List, Paper, Skeleton } from "@mui/material";
import CarvingItem from "@/components/CarvingItem";
import { useContractState } from "@/context/ContractStateProvider";

function CarvingList() {
  const { carvings, loadingCarvings } = useContractState();

  const sortedCarvings = useMemo(() => {
    return carvings.slice().sort((a, b) => b.sentAt - a.sentAt);
  }, [carvings]);

  return loadingCarvings ? (
    <List>
      {[...Array(5)].map((_, i) => (
        <Paper
          key={i}
          elevation={0}
          sx={{ marginBottom: "1rem", padding: "1rem" }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton variant="text" width="30%" />
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="60%" />
            </Box>
          </Box>
        </Paper>
      ))}
    </List>
  ) : (
    <List>
      {sortedCarvings.map((carving, index) => (
        <CarvingItem carving={carving} key={index} />
      ))}
    </List>
  );
}

export default CarvingList;
