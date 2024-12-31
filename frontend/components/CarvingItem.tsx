import {
  Avatar,
  Box,
  IconButton,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import Link from "next/link";
import {
  ChatBubbleOutline,
  Favorite,
  FavoriteBorder,
  Repeat,
} from "@mui/icons-material";
import React, { useCallback, useState } from "react";
import { Carving } from "@/types";
import { useWallet } from "@/context/WalletProvider";
import { useContractState } from "@/context/ContractStateProvider";

type CarvingProps = Readonly<{
  carving: Carving;
}>;

function CarvingItem({ carving }: CarvingProps) {
  const { contract, address } = useWallet();
  const { getProfile } = useContractState();

  const [liked, setLiked] = useState<boolean>(carving.likedByUser);
  const [likeCount, setLikeCount] = useState<number>(carving.likeCount);

  const fetchLikeState = useCallback(
    async (carvingId: number) => {
      if (!contract) return;
      const count = await contract.getLikesCount(carvingId);
      setLikeCount(count);
      const liked = await contract.hasLikedCarving(address, carvingId);
      setLiked(liked);
    },
    [contract],
  );

  const likeCarving = useCallback(
    async (carvingId: number) => {
      if (!contract) {
        return;
      }
      setLiked(true);
      setLikeCount((prev) => prev + 1);
      await contract.likeCarving(carvingId);
      void fetchLikeState(carvingId);
    },
    [contract, fetchLikeState],
  );

  const unlikeCarving = useCallback(
    async (carvingId: number) => {
      if (!contract) {
        return;
      }
      setLiked(false);
      setLikeCount((prev) => prev - 1);
      await contract.unlikeCarving(carvingId);
      void fetchLikeState(carvingId);
    },
    [contract, fetchLikeState],
  );

  return (
    <Paper elevation={0} sx={{ marginBottom: "1rem", padding: "1rem" }}>
      <ListItem alignItems="flex-start" disableGutters>
        <ListItemAvatar>
          <Avatar src={getProfile(carving.carver)?.pfpURL || ""} />
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
          onClick={() => alert("Recarving feature not implemented yet")}
        >
          <Repeat fontSize="small" />
        </IconButton>

        <IconButton
          color="secondary"
          onClick={() =>
            liked ? unlikeCarving(carving.id) : likeCarving(carving.id)
          }
        >
          {liked ? (
            <Favorite fontSize="small" style={{ color: "#E0245E" }} />
          ) : (
            <FavoriteBorder fontSize="small" />
          )}
          <Typography variant="caption" sx={{ ml: 0.5, color: "#fff" }}>
            {likeCount}
          </Typography>
        </IconButton>
      </Box>
    </Paper>
  );
}

export default CarvingItem;
