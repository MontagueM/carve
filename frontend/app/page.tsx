'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ethers } from 'ethers';
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
  Modal,
  Box,
  IconButton,
  Paper,
  createTheme,
  ThemeProvider,
  CssBaseline,
  Skeleton,
  CircularProgress,
  Link
} from '@mui/material';
import { ChatBubbleOutline, Repeat, FavoriteBorder, Favorite, Person } from '@mui/icons-material';
import carve from './contracts/carve.json';
import {CONTRACT_ADDRESS, RPC_URL} from "./config";
import {useEncodeDecode} from "@/app/hooks/useEncodeDecode";

type UserProfile = {
  username: string;
  bio: string;
  profileImageURL: string;
};

type Carving = {
  carvingId: number;
  message: string;
  address: string;
  timestamp: number;
};

type Comment = {
  message: string;
  address: string;
  timestamp: number;
};

function App() {
  const [contract, setContract] = useState<ethers.Contract | undefined>(undefined);
  const [account, setAccount] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [profileImageURL, setProfileImageURL] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [carvings, setCarvings] = useState<Carving[]>([]);
  const [showSetUsernameModal, setShowSetUsernameModal] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [usernames, setUsernames] = useState<Map<string, string>>(new Map());
  const [likes, setLikes] = useState<Map<number, number>>(new Map());
  const [likedCarvings, setLikedCarvings] = useState<Set<number>>(new Set());
  const [isLoadingCarvings, setIsLoadingCarvings] = useState<boolean>(false);
  const [loadingAccount, setLoadingAccount] = useState(true);

  // Comments (Etchings) Modal
  const [showCommentsModal, setShowCommentsModal] = useState<boolean>(false);
  const [selectedCarving, setSelectedCarving] = useState<Carving | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>('');

  const MAX_LENGTH = 32;
  
  const {encodeString, decodeString} = useEncodeDecode()

  const sortedCarvings = useMemo(() => {
    return carvings.slice().sort((a, b) => b.timestamp - a.timestamp);
  }, [carvings]);

  const remainingCharsForMessage = useMemo(() => MAX_LENGTH - message.length, [message]);
  const remainingCharsForComment = useMemo(() => MAX_LENGTH - newComment.length, [newComment]);

  const fetchUserProfile = useCallback(async (address: string) => {
    console.log('fetchUserProfile', address);
    if (!contract) return undefined;
    const result = await contract.getUserProfile(address);
    const profile = {
      username: result[0],
      bio: result[1],
      profileImageURL: result[2],
    }
    if (profile.username === 0n) {
      return undefined;
    }
    const decodedProfile = {
      username: decodeString(profile.username),
      bio: decodeString(profile.bio),
      profileImageURL: profile.profileImageURL
    };
    setUsernames((prev) => new Map(prev).set(address, decodedProfile.username));
    setProfileImageURL(profile.profileImageURL);
    return decodedProfile;
  }, [contract, decodeString]);

  const fetchLikes = useCallback(async (carvingId: number) => {
    if (!contract) return;
    const count = await contract.getLikesCount(carvingId);
    setLikes((prev) => new Map(prev).set(carvingId, Number(count)));
  }, [contract]);

  const fetchLikedStatus = useCallback(async (carvingId: number) => {
    if (!contract || !account) return;
    const liked = await contract.hasLikedCarving(account, carvingId);
    if (liked) {
      setLikedCarvings((prev) => new Set(prev).add(carvingId));
    }
  }, [contract, account]);

  const fetchMessages = useCallback(async () => {
    console.log('fetchMessages');
    if (!contract) return;
    setIsLoadingCarvings(true);
    const count = await contract.getCarvingsCount();
    const msgs = await contract.getCarvings(0, count);
    const decodedCarvings: Carving[] = msgs.map((m: any) => {
      const address = m[1];
      const timestamp = Number(m[2]) * 1000;
      const carvingId = msgs.indexOf(m);

      return { message: decodeString(m[0]), address, timestamp, carvingId };
    })
    
    // fetch all user profiles as required
    const uniqueAddresses = new Set(decodedCarvings.map((c) => c.address));
    
    // together await all user profiles and carving likes/like status
    const userProfilePromises = Array.from(uniqueAddresses).map(fetchUserProfile);
    const likesPromises = decodedCarvings.map((c) => fetchLikes(c.carvingId));
    const likedStatusPromises = decodedCarvings.map((c) => fetchLikedStatus(c.carvingId));
    await Promise.all([...userProfilePromises, ...likesPromises, ...likedStatusPromises]);
    
    setCarvings(decodedCarvings);
    setIsLoadingCarvings(false);
  }, [contract, decodeString, fetchUserProfile, fetchLikes, fetchLikedStatus, usernames]);

  const createAccount = useCallback(async (usernameInput: string) => {
    if (!contract) return;
    try {
      const encodedUsername = encodeString(usernameInput);
      await contract.setUsername(encodedUsername);
      setUsername(usernameInput);
    } catch (error) {
      alert("An error occurred while creating the account.");
      console.error(error);
    }
  }, [contract, encodeString]);

  const postNewMessage = useCallback(async () => {
    if (!message || !contract) return;
    const encoded = encodeString(message);
    await contract.createCarving(encoded);
    setMessage('');
    fetchMessages();
  }, [contract, message, encodeString, fetchMessages]);

  const likeCarving = useCallback(async (carvingId: number) => {
    if (!contract) return;
    await contract.likeCarving(carvingId);
    setLikedCarvings((prev) => new Set(prev).add(carvingId));
    fetchLikes(carvingId);
  }, [contract, fetchLikes]);

  const unlikeCarving = useCallback(async (carvingId: number) => {
    if (!contract) return;
    await contract.unlikeCarving(carvingId);
    setLikedCarvings((prev) => {
      const newSet = new Set(prev);
      newSet.delete(carvingId);
      return newSet;
    });
    fetchLikes(carvingId);
  }, [contract, fetchLikes]);

  const fetchCommentsForCarving = useCallback(async (carvingId: number) => {
    return [];
  }, []);

  const openCommentsModal = useCallback(async (carving: Carving) => {
    setSelectedCarving(carving);
    const fetchedComments = await fetchCommentsForCarving(carving.carvingId);
    setComments(fetchedComments);
    setShowCommentsModal(true);
  }, [fetchCommentsForCarving]);

  const closeCommentsModal = useCallback(() => {
    setShowCommentsModal(false);
    setSelectedCarving(null);
    setComments([]);
    setNewComment('');
  }, []);

  const postComment = useCallback(async () => {
    if (!newComment || !selectedCarving || !contract) return;
    if (newComment.length > MAX_LENGTH) {
      alert("Your etch exceeds the 32-character limit.");
      return;
    }
    setComments((prev) => [...prev, {
      message: newComment,
      address: account,
      timestamp: new Date().getTime()
    }]);
    setNewComment('');
  }, [newComment, selectedCarving, contract, account]);

  const connectWallet = useCallback(async () => {
    if (window.ethereum) {
      let provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      let network = await provider.getNetwork();
      const expectedChainId = 50311;
      if (Number(network.chainId) !== expectedChainId) {
        try {
          await provider.send("wallet_switchEthereumChain", [{ chainId: ethers.toQuantity(expectedChainId) }]);
        } catch (switchError) {
          alert("Please switch to the Somnia chain in your wallet to use carve.");
          console.error("Failed to switch network", switchError);
          return;
        }
      }
      provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const contractWithSigner = new ethers.Contract(CONTRACT_ADDRESS, carve.abi, signer);
      setContract(contractWithSigner);
      setAccount(address);
      setLoadingAccount(false);
    } else {
      alert("Please install MetaMask!");
    }
  }, []);

  useEffect(() => {
    async function init() {
      if (contract) return; 
      const tempProvider = new ethers.JsonRpcProvider(RPC_URL);
      const tempContract = new ethers.Contract(CONTRACT_ADDRESS, carve.abi, tempProvider);
      setContract(tempContract);
    }
    void init();
  }, [contract]);

  useEffect(() => {
    void connectWallet();
  }, [connectWallet]);

  useEffect(() => {
    async function internal() {
      if (!account) return;
      const userProfile = await fetchUserProfile(account);
      if (!userProfile) {
        setShowSetUsernameModal(true);
      } else {
        setUsername(userProfile.username);
        setBio(userProfile.bio);
        void fetchMessages();
      }
    }
    void internal();
  }, [account]);

  const theme = useMemo(() => createTheme({
    palette: {
      mode: 'dark',
      background: {
        default: '#15202b',
        paper: '#192734'
      },
      text: {
        primary: '#fff',
        secondary: '#8899A6'
      },
      primary: {
        main: '#1DA1F2'
      },
      secondary: {
        main: '#8899A6'
      }
    },
    typography: {
      fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      body1: {
        fontSize: '0.95rem'
      }
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: '#192734'
          }
        }
      }
    }
  }), []);

  if (loadingAccount) {
    return (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Container maxWidth="sm" style={{ paddingTop: '1rem', textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom style={{ fontWeight: 'bold', color: '#fff' }}>carve</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="text.secondary" sx={{ mb: 2 }}>Loading...</Typography>
                <CircularProgress />
              </Box>
            </Box>
          </Container>
        </ThemeProvider>
    );
  }

  return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="sm" style={{ paddingTop: '1rem' }}>
          <Typography variant="h4" gutterBottom style={{ fontWeight: 'bold', color: '#fff', textAlign: 'center' }}>carve</Typography>

          {!account ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                <Button variant="contained" onClick={connectWallet}>Connect Wallet</Button>
              </Box>
          ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: '1rem' }}>
                  <Avatar src={profileImageURL || ''}>
                    {!profileImageURL && <Person />}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{username || account.slice(0, 6) + '...' + account.slice(-4)}</Typography>
                    <Typography variant="body2" color="text.secondary">{bio}</Typography>
                  </Box>
                </Box>

                <Paper sx={{ padding: '1rem', marginBottom: '1rem' }} elevation={0}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Avatar src={profileImageURL || ''} />
                    <TextField
                        variant="outlined"
                        fullWidth
                        multiline
                        placeholder="What's happening?"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        InputProps={{ style: { color: '#fff', borderColor: '#253341' } }}
                        sx={{ input: { color: '#fff' }, textarea: { color: '#fff' } }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', alignItems: 'center' }}>
                    <Typography
                        variant="caption"
                        sx={{ color: remainingCharsForMessage < 0 ? 'red' : '#8899A6' }}
                    >
                      {remainingCharsForMessage}
                    </Typography>
                    <Button variant="contained" sx={{ textTransform: 'none' }} onClick={postNewMessage} disabled={remainingCharsForMessage < 0}>Carve</Button>
                  </Box>
                </Paper>

                {isLoadingCarvings ? (
                    <List>
                      {[...Array(5)].map((_, i) => (
                          <Paper key={i} elevation={0} sx={{ marginBottom: '1rem', padding: '1rem' }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
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
                          <Paper key={index} elevation={0} sx={{ marginBottom: '1rem', padding: '1rem' }}>
                            <ListItem alignItems="flex-start" disableGutters>
                              <ListItemAvatar>
                                <Avatar src={profileImageURL || ''} />
                              </ListItemAvatar>
                              <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Link href={`/${carving.address}`} style={{ textDecoration: 'none', color: '#1DA1F2' }}>
                                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#1DA1F2' }}>
                                          {usernames.get(carving.address) || carving.address.slice(0, 6) + '...' + carving.address.slice(-4)}
                                        </Typography>
                                      </Link>
                                      <Typography variant="body2" color="text.secondary">
                                        • {new Date(carving.timestamp).toLocaleString()}
                                      </Typography>
                                    </Box>
                                  }
                                  secondary={
                                    <Typography variant="body1" color="text.primary" style={{ whiteSpace: 'pre-wrap' }}>
                                      {carving.message}
                                    </Typography>
                                  }
                              />
                            </ListItem>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                              <IconButton color="secondary" onClick={() => openCommentsModal(carving)}>
                                <ChatBubbleOutline fontSize="small" />
                              </IconButton>

                              <IconButton color="secondary" onClick={() => alert('Recarving feature not implemented yet')}>
                                <Repeat fontSize="small" />
                              </IconButton>

                              <IconButton
                                  color="secondary"
                                  onClick={() => likedCarvings.has(carving.carvingId) ? unlikeCarving(carving.carvingId) : likeCarving(carving.carvingId)}
                              >
                                {likedCarvings.has(carving.carvingId) ? <Favorite fontSize="small" style={{ color: '#E0245E' }} /> : <FavoriteBorder fontSize="small" />}
                                <Typography variant="caption" sx={{ ml: 0.5, color: '#fff' }}>
                                  {likes.get(carving.carvingId) || 0}
                                </Typography>
                              </IconButton>
                            </Box>
                          </Paper>
                      ))}
                    </List>
                )}
              </>
          )}

          <Modal open={showSetUsernameModal} onClose={() => setShowSetUsernameModal(false)}>
            <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  bgcolor: 'background.paper',
                  boxShadow: 24,
                  p: 4,
                  borderRadius: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}
            >
              <TextField
                  label="Username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ style: { color: '#8899A6' } }}
                  InputProps={{ style: { color: '#fff' } }}
              />
              <Button variant="contained" onClick={() => {
                void createAccount(usernameInput);
                setShowSetUsernameModal(false);
              }}>Create user</Button>
            </Box>
          </Modal>

          <Modal open={showCommentsModal} onClose={closeCommentsModal}>
            <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  bgcolor: 'background.paper',
                  boxShadow: 24,
                  p: 4,
                  borderRadius: 1,
                  width: '100%',
                  maxWidth: '600px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}
            >
              {selectedCarving && (
                  <>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#fff' }}>
                      Etchings on "{selectedCarving.message}"
                    </Typography>
                    <Box sx={{ overflowY: 'auto', maxHeight: '300px', border: '1px solid #253341', borderRadius: 1, padding: '1rem' }}>
                      {comments.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">No etchings yet. Be the first to etch!</Typography>
                      ) : (
                          comments.map((c, i) => (
                              <Box key={i} sx={{ marginBottom: '1rem' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Avatar />
                                  <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#fff' }}>
                                    {usernames.get(c.address) || c.address.slice(0, 6) + '...' + c.address.slice(-4)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    • {new Date(c.timestamp).toLocaleString()}
                                  </Typography>
                                </Box>
                                <Typography variant="body2" color="text.primary" sx={{ marginLeft: '3rem', marginTop: '0.5rem' }}>
                                  {c.message}
                                </Typography>
                              </Box>
                          ))
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Avatar src={profileImageURL || ''} />
                      <TextField
                          variant="outlined"
                          fullWidth
                          multiline
                          placeholder="Etch your reply"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          InputProps={{ style: { color: '#fff', borderColor: '#253341' } }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography
                          variant="caption"
                          sx={{ color: remainingCharsForComment < 0 ? 'red' : '#8899A6' }}
                      >
                        {remainingCharsForComment}
                      </Typography>
                      <Button variant="contained" sx={{ textTransform: 'none' }} onClick={postComment}>Etch</Button>
                    </Box>
                  </>
              )}
            </Box>
          </Modal>

        </Container>
      </ThemeProvider>
  );
};

export default App;
