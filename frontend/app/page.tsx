"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Container,
  Button,
  TextField,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Box,
  IconButton,
  Paper,
  Skeleton,
  CircularProgress,
} from "@mui/material";
import {
  ChatBubbleOutline,
  Repeat,
  FavoriteBorder,
  Favorite,
} from "@mui/icons-material";
import Link from "next/link";
import useUserProfile from "@/hooks/useUserProfile";
import { Carving, CarvingType } from "@/types";
import { useWallet } from "@/context/WalletProvider";

function App() {
  const [message, setMessage] = useState<string>("");
  const [carvings, setCarvings] = useState<Carving[]>([]);
  const [showSetUsernameEntry, setShowSetUsernameEntry] =
    useState<boolean>(false);
  const [setUsernameLoading, setSetUsernameLoading] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>("");
  const [likes, setLikes] = useState<Map<number, number>>(new Map());
  const [likedCarvings, setLikedCarvings] = useState<Set<number>>(new Set());
  const [isLoadingCarvings, setIsLoadingCarvings] = useState<boolean>(false);

  const MAX_LENGTH = 140;

  const { contract, address, loadingAddress, connectWallet } = useWallet();
  const { fetchProfile, getProfile, profile } = useUserProfile();

  const sortedCarvings = useMemo(() => {
    return carvings.slice().sort((a, b) => b.sentAt - a.sentAt);
  }, [carvings]);

  const remainingCharsForMessage = useMemo(
    () => MAX_LENGTH - message.length,
    [message],
  );

  const fetchLikes = useCallback(
    async (carvingId: number) => {
      if (!contract) return;
      const count = await contract.getLikesCount(carvingId);
      setLikes((prev) => new Map(prev).set(carvingId, Number(count)));
    },
    [contract],
  );

  const fetchLikedStatus = useCallback(
    async (carvingId: number) => {
      if (!contract || !address) return;
      const liked = await contract.hasLikedCarving(address, carvingId);
      if (liked) {
        setLikedCarvings((prev) => new Set(prev).add(carvingId));
      }
    },
    [contract, address],
  );

  const fetchMessages = useCallback(async () => {
    console.log("fetchMessages");
    if (!contract) return;
    setIsLoadingCarvings(true);
    const count = Number(await contract.getCarvingsCount());
    if (count === 0) {
      setCarvings([]);
      setIsLoadingCarvings(false);
      return;
    }

    const carvingsResult = await contract.getCarvings(0, Number(count));
    const allCarvings: Carving[] = carvingsResult.map((c: never) => {
      return {
        id: Number(c[0]),
        originalCarvingId: Number(c[1]),
        sentAt: Number(c[2]) * 1000,
        carver: c[3],
        carvingType: Number(c[4]) as CarvingType,
        hidden: c[5],
        message: c[6],
      };
    });

    // fetch all user profiles as required
    const uniqueAddresses = new Set(allCarvings.map((c) => c.carver));

    // together await all user profiles and carving likes/like status
    const userProfilePromises = Array.from(uniqueAddresses).map((address) =>
      fetchProfile(address),
    );
    const likesPromises = allCarvings.map((c) => fetchLikes(c.id));
    const likedStatusPromises = allCarvings.map((c) => fetchLikedStatus(c.id));
    await Promise.all([
      ...userProfilePromises,
      ...likesPromises,
      ...likedStatusPromises,
    ]);

    setCarvings(allCarvings);
    setIsLoadingCarvings(false);
  }, [contract, fetchProfile, fetchLikes, fetchLikedStatus]);

  const createAddress = useCallback(
    async (usernameInput: string) => {
      if (!contract) return false;
      try {
        await contract.setUsername(usernameInput);
        await fetchProfile(address, true);
        return true;
      } catch (error) {
        alert("An error occurred while creating the address.");
        console.error(error);
        return false;
      }
    },
    [contract],
  );

  const postNewMessage = useCallback(async () => {
    if (!message || !contract) return;
    await contract.createCarving(message);
    setMessage("");
    void fetchMessages();
  }, [contract, message, fetchMessages]);

  const likeCarving = useCallback(
    async (carvingId: number) => {
      if (!contract) return;
      await contract.likeCarving(carvingId);
      setLikedCarvings((prev) => new Set(prev).add(carvingId));
      void fetchLikes(carvingId);
    },
    [contract, fetchLikes],
  );

  const unlikeCarving = useCallback(
    async (carvingId: number) => {
      if (!contract) return;
      await contract.unlikeCarving(carvingId);
      setLikedCarvings((prev) => {
        const newSet = new Set(prev);
        newSet.delete(carvingId);
        return newSet;
      });
      void fetchLikes(carvingId);
    },
    [contract, fetchLikes],
  );

  useEffect(() => {
    async function internal() {
      if (!address) return;
      const userProfile = await fetchProfile(address);
      if (!userProfile) {
        setShowSetUsernameEntry(true);
      } else {
        void fetchMessages();
      }
    }
    void internal();
  }, [address, fetchProfile, fetchMessages]);

  if (loadingAddress) {
    return (
      <Container
        maxWidth="sm"
        style={{ paddingTop: "1rem", textAlign: "center" }}
      >
        <Typography
          variant="h4"
          gutterBottom
          style={{ fontWeight: "bold", color: "#fff" }}
        >
          carve
        </Typography>
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
        <Typography
          variant="h4"
          gutterBottom
          style={{ fontWeight: "bold", color: "#fff", textAlign: "center" }}
        >
          carve
        </Typography>
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
                onClick={postNewMessage}
                disabled={remainingCharsForMessage < 0}
              >
                carve
              </Button>
            </Box>
          </Paper>

          {isLoadingCarvings ? (
            <List>
              {[...Array(5)].map((_, i) => (
                <Paper
                  key={i}
                  elevation={0}
                  sx={{ marginBottom: "1rem", padding: "1rem" }}
                >
                  <Box
                    sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}
                  >
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
                <Paper
                  key={index}
                  elevation={0}
                  sx={{ marginBottom: "1rem", padding: "1rem" }}
                >
                  <ListItem alignItems="flex-start" disableGutters>
                    <ListItemAvatar>
                      <Avatar src={profile?.pfpURL || ""} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Link
                            href={`/user?address=${carving.carver}`}
                            style={{
                              textDecoration: "none",
                              color: "#1DA1F2",
                            }}
                          >
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: "bold", color: "#1DA1F2" }}
                            >
                              {getProfile(carving.carver)?.username ||
                                carving.carver.slice(0, 6) +
                                  "..." +
                                  carving.carver.slice(-4)}
                            </Typography>
                          </Link>
                          <Typography variant="body2" color="text.secondary">
                            • {new Date(carving.sentAt).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="body1"
                          color="text.primary"
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {carving.message}
                        </Typography>
                      }
                    />
                  </ListItem>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "0.5rem",
                    }}
                  >
                    <IconButton
                      color="secondary"
                      onClick={() => alert("Etch feature not implemented yet")}
                    >
                      <ChatBubbleOutline fontSize="small" />
                    </IconButton>

                    <IconButton
                      color="secondary"
                      onClick={() =>
                        alert("Recarving feature not implemented yet")
                      }
                    >
                      <Repeat fontSize="small" />
                    </IconButton>

                    <IconButton
                      color="secondary"
                      onClick={() =>
                        likedCarvings.has(carving.id)
                          ? unlikeCarving(carving.id)
                          : likeCarving(carving.id)
                      }
                    >
                      {likedCarvings.has(carving.id) ? (
                        <Favorite
                          fontSize="small"
                          style={{ color: "#E0245E" }}
                        />
                      ) : (
                        <FavoriteBorder fontSize="small" />
                      )}
                      <Typography
                        variant="caption"
                        sx={{ ml: 0.5, color: "#fff" }}
                      >
                        {likes.get(carving.id) || 0}
                      </Typography>
                    </IconButton>
                  </Box>
                </Paper>
              ))}
            </List>
          )}
        </>
      )}
    </>
  );
}

export default App;
