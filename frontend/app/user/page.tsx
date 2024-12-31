"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Container,
  Typography,
  Avatar,
  Box,
  Paper,
  Tab,
  Tabs,
  Button,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from "@mui/material";
import {
  FavoriteBorder,
  Favorite,
  Repeat,
  ChatBubbleOutline,
  Person,
} from "@mui/icons-material";
import Link from "next/link";
import Skeleton from "@mui/material/Skeleton";
import useUserProfile from "@/hooks/useUserProfile";
import { useSearchParams } from "next/navigation";
import { Carving, CarvingType } from "@/types";
import { useWallet } from "@/context/WalletProvider";

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const address = searchParams.get("address") ?? "";

  const [carvings, setCarvings] = useState<Carving[]>([]);
  const [tab, setTab] = useState<number>(0);
  const [likes, setLikes] = useState<Map<number, number>>(new Map());
  const [likedCarvings, setLikedCarvings] = useState<Set<number>>(new Set());
  const [isLoadingCarvings, setIsLoadingCarvings] = useState<boolean>(false);

  const [editUsername, setEditUsername] = useState<string>("");
  const [editBio, setEditBio] = useState<string>("");
  const [editPfpURL, setEditPfpURL] = useState<string>("");

  const { contract, address: userAddress } = useWallet();
  const { fetchProfile, getProfile } = useUserProfile();

  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);

  const profile = getProfile(address);

  useEffect(() => {
    async function internal() {
      if (contract && address) {
        setLoadingProfile(true);
        await fetchProfile(address);
        setLoadingProfile(false);
      }
    }

    void internal();
  }, [contract, address, fetchProfile]);

  const fetchUserCarvings = useCallback(async () => {
    if (!contract || !address) {
      return;
    }
    setIsLoadingCarvings(true);

    const carvingCount = await contract.getUserCarvingsCount(address);
    if (carvingCount == 0) {
      setIsLoadingCarvings(false);
      return;
    }

    const userCarvingsResult = await contract.getUserCarvings(
      address,
      0,
      carvingCount,
    );
    const userCarvings: Carving[] = userCarvingsResult.map((c: never) => {
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

    // Fetch likes
    await Promise.all(
      userCarvings.map(async (c) => {
        console.log(c);
        const count = await contract.getLikesCount(c.id);
        setLikes((prev) => new Map(prev).set(c.id, Number(count)));
        if (userAddress) {
          const liked = await contract.hasLikedCarving(userAddress, c.id);
          if (liked) {
            setLikedCarvings((prev) => new Set(prev).add(c.id));
          }
        }
      }),
    );

    setCarvings(userCarvings);
    setIsLoadingCarvings(false);
  }, [contract, address, userAddress]);

  const isMyProfile = useMemo(() => {
    return (
      userAddress &&
      address &&
      userAddress.toLowerCase() === address.toLowerCase()
    );
  }, [userAddress, address]);

  const updateUsername = useCallback(async () => {
    if (!contract || !editUsername) return;
    await contract.setUsername(editUsername);
    void fetchProfile(address, true);
    setEditUsername("");
  }, [contract, editUsername, fetchProfile]);

  const updateBio = useCallback(async () => {
    if (!contract) return;
    await contract.setBio(editBio);
    void fetchProfile(address, true);
    setEditBio("");
  }, [contract, editBio, fetchProfile]);

  const updatePfp = useCallback(async () => {
    if (!contract) return;
    await contract.setPfpURL(editPfpURL);
    void fetchProfile(address, true);
    setEditPfpURL("");
  }, [contract, editPfpURL, fetchProfile]);

  const likeCarving = useCallback(
    async (carvingId: number) => {
      if (!contract) return;
      await contract.likeCarving(carvingId);
      setLikedCarvings((prev) => new Set(prev).add(carvingId));
      const count = await contract.getLikesCount(carvingId);
      setLikes((prev) => new Map(prev).set(carvingId, Number(count)));
    },
    [contract],
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
      const count = await contract.getLikesCount(carvingId);
      setLikes((prev) => new Map(prev).set(carvingId, Number(count)));
    },
    [contract],
  );

  useEffect(() => {
    if (contract && address) {
      void fetchUserCarvings();
    }
  }, [contract, address, fetchUserCarvings]);

  const sortedCarvings = useMemo(() => {
    return carvings.slice().sort((a, b) => b.sentAt - a.sentAt);
  }, [carvings]);

  if (!profile?.username && !loadingProfile) {
    return (
      <Container maxWidth="sm" style={{ paddingTop: "1rem" }}>
        User does not exist.
      </Container>
    );
  }

  return (
    <>
      {address && (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              marginBottom: "1rem",
            }}
          >
            <Avatar src={profile?.pfpURL || ""}>
              {!profile?.pfpURL && <Person />}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6">
                {profile?.username ||
                  address.slice(0, 6) + "..." + address.slice(-4)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {profile?.bio}
              </Typography>
            </Box>
          </Box>

          {isMyProfile && (
            <Paper sx={{ p: 2, mb: 2 }} elevation={0}>
              <Typography variant="h6">Edit Profile</Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  mt: 1,
                }}
              >
                <TextField
                  label="New Username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  slotProps={{
                    input: { style: { color: "#fff" } },
                    inputLabel: { style: { color: "#8899A6" } },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={updateUsername}
                  disabled={!editUsername}
                >
                  Update Username
                </Button>

                <TextField
                  label="New Bio"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  slotProps={{
                    input: { style: { color: "#fff", borderColor: "#253341" } },
                    inputLabel: { style: { color: "#8899A6" } },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={updateBio}
                  disabled={!editBio}
                >
                  Update Bio
                </Button>

                <TextField
                  label="New PFP URL"
                  value={editPfpURL}
                  onChange={(e) => setEditPfpURL(e.target.value)}
                  slotProps={{
                    input: { style: { color: "#fff", borderColor: "#253341" } },
                    inputLabel: { style: { color: "#8899A6" } },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={updatePfp}
                  disabled={!editPfpURL}
                >
                  Update PFP
                </Button>
              </Box>
            </Paper>
          )}

          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tabs value={tab} onChange={(_e, val) => setTab(val)}>
              <Tab label="Carvings" />
              {/* Future: <Tab label="Recarves" /> */}
            </Tabs>
          </Box>

          {tab === 0 && (
            <>
              {isLoadingCarvings ? (
                <List>
                  {[...Array(5)].map((_, i) => (
                    <Paper
                      key={i}
                      elevation={0}
                      sx={{ marginBottom: "1rem", padding: "1rem" }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                        }}
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
                  {sortedCarvings.map((carving) => (
                    <Paper
                      key={carving.id}
                      elevation={0}
                      sx={{ marginBottom: "1rem", padding: "1rem" }}
                    >
                      <ListItem alignItems="flex-start" disableGutters>
                        <ListItemAvatar>
                          <Avatar />
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
                                href={`/${carving.carver}`}
                                style={{
                                  textDecoration: "none",
                                  color: "#1DA1F2",
                                }}
                              >
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontWeight: "bold",
                                    color: "#1DA1F2",
                                  }}
                                >
                                  {getProfile(carving.carver)?.username ||
                                    carving.carver.slice(0, 6) +
                                      "..." +
                                      carving.carver.slice(-4)}
                                </Typography>
                              </Link>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                • {new Date(carving.sentAt).toLocaleString()}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Typography
                              variant="body1"
                              color="text.primary"
                              style={{ whiteSpace: "pre-wrap" }}
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
                          onClick={() => alert("Comments not implemented here")}
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

          {tab === 1 && (
            <Typography variant="body1">
              Recarves not implemented yet.
            </Typography>
          )}
        </>
      )}
    </>
  );
}
