"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Container,
  Button,
  TextField,
  Typography,
  Avatar,
  Box,
  Paper,
  CircularProgress,
} from "@mui/material";

import { useWallet } from "@/context/WalletProvider";
import { useContractState } from "@/context/ContractStateProvider";
import CarvingList from "@/components/CarvingList";

function App() {
  const [message, setMessage] = useState<string>("");
  const [showSetUsernameEntry, setShowSetUsernameEntry] =
    useState<boolean>(false);
  const [setUsernameLoading, setSetUsernameLoading] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>("");

  const MAX_LENGTH = 140;

  const { contract, address, loadingAddress, connectWallet } = useWallet();
  const { fetchProfile, getProfile, fetchCarvings } = useContractState();

  const remainingCharsForMessage = useMemo(
    () => MAX_LENGTH - message.length,
    [message],
  );

  const profile = useMemo(() => {
    return getProfile(address);
  }, [address, fetchProfile]);

  const createAddress = useCallback(
    async (usernameInput: string) => {
      if (!contract) return false;
      try {
        await contract.setUsername(usernameInput);
        await fetchProfile(address, true);
        await fetchCarvings();
        return true;
      } catch (error) {
        alert("An error occurred while creating the address.");
        console.error(error);
        return false;
      }
    },
    [contract],
  );

  const postNewCarving = useCallback(async () => {
    if (!message || !contract) return;
    await contract.createCarving(message);
    setMessage("");
    void fetchCarvings();
  }, [contract, message, fetchCarvings]);

  useEffect(() => {
    async function internal() {
      if (!address) return;
      const userProfile = await fetchProfile(address);
      if (!userProfile) {
        setShowSetUsernameEntry(true);
      } else {
        void fetchCarvings();
      }
    }
    void internal();
  }, [address, fetchProfile, fetchCarvings]);

  if (loadingAddress) {
    return (
      <Container
        maxWidth="sm"
        style={{ paddingTop: "1rem", textAlign: "center" }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "50vh",
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h5" color="text.secondary" sx={{ mb: 2 }}>
              Loading...
            </Typography>
            <CircularProgress />
          </Box>
        </Box>
      </Container>
    );
  }

  if (showSetUsernameEntry) {
    return (
      <Container
        maxWidth="sm"
        style={{
          paddingTop: "1rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <TextField
          label="Username"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          fullWidth
          margin="normal"
          slotProps={{
            input: { style: { color: "#fff", borderColor: "#253341" } },
            inputLabel: { style: { color: "#8899A6" } },
          }}
        />
        <Button
          variant="contained"
          onClick={async () => {
            setSetUsernameLoading(true);
            const success = await createAddress(usernameInput);
            setSetUsernameLoading(false);
            if (success) {
              setShowSetUsernameEntry(false);
            }
          }}
          startIcon={setUsernameLoading ? <CircularProgress size={20} /> : null}
          disabled={setUsernameLoading || !usernameInput.trim()}
        >
          Create user
        </Button>
      </Container>
    );
  }

  return (
    <>
      {!address ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            marginTop: "2rem",
          }}
        >
          <Button variant="contained" onClick={connectWallet}>
            Connect Wallet
          </Button>
        </Box>
      ) : (
        <>
          <Paper sx={{ padding: "1rem", marginBottom: "1rem" }} elevation={0}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Avatar src={profile?.pfpURL || ""} />
              <TextField
                variant="outlined"
                fullWidth
                multiline
                placeholder="What's happening?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                slotProps={{
                  input: { style: { color: "#fff", borderColor: "#253341" } },
                }}
                sx={{ input: { color: "#fff" }, textarea: { color: "#fff" } }}
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "0.5rem",
                alignItems: "center",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: remainingCharsForMessage < 0 ? "red" : "#8899A6",
                }}
              >
                {remainingCharsForMessage}
              </Typography>
              <Button
                variant="contained"
                sx={{ textTransform: "none" }}
                onClick={postNewCarving}
                disabled={remainingCharsForMessage < 0}
              >
                carve
              </Button>
            </Box>
          </Paper>

          <CarvingList />
        </>
      )}
    </>
  );
}

export default App;
