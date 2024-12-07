import React, { useEffect, useMemo, useState } from 'react';
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
    CssBaseline
} from '@mui/material';
import { ChatBubbleOutline, Repeat, FavoriteBorder, Favorite, Person } from '@mui/icons-material';
import carve from './contracts/carve.json';
import { CONTRACT_ADDRESS } from "./config";

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
    const sortedCarvings = useMemo(() => carvings.sort((a, b) => b.timestamp - a.timestamp), [carvings]);
    const [showSetUsernameModal, setShowSetUsernameModal] = useState<boolean>(false);
    const [usernameInput, setUsernameInput] = useState<string>('');
    const [usernames, setUsernames] = useState<Map<string, string>>(new Map());
    const [likes, setLikes] = useState<Map<number, number>>(new Map());
    const [likedCarvings, setLikedCarvings] = useState<Set<number>>(new Set());

    // Comments (Etchings) Modal
    const [showCommentsModal, setShowCommentsModal] = useState<boolean>(false);
    const [selectedCarving, setSelectedCarving] = useState<Carving | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState<string>('');

    const MAX_LENGTH = 32;

    useEffect(() => {
        async function init() {
            if (contract) return;
            // Connect to RPC
            const tempProvider = new ethers.JsonRpcProvider("https://dream-rpc.somnia.network/");
            const tempContract = new ethers.Contract(CONTRACT_ADDRESS, carve.abi, tempProvider);
            setContract(tempContract);
            console.log("Temp contract connected:", await tempContract.getAddress());
        }

        void init();
    }, []);

    const connectWallet = async () => {
        if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            const contractWithSigner = new ethers.Contract(CONTRACT_ADDRESS, carve.abi, signer);
            setContract(contractWithSigner);
            setAccount(address);
            console.log("Wallet connected:", address);
            console.log("Contract connected:", await contractWithSigner.getAddress());
        } else {
            alert("Please install MetaMask!");
        }
    };

    useEffect(() => {
        void connectWallet();
    }, []);

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

    const fetchUserProfile = async (address: string) => {
        if (!contract) return undefined;
        console.log("Fetching profile for", address);
        const result = await contract.getUserProfile(address);
        const profile = {
            username: result[0],
            bio: result[1],
            profileImageURL: result[2],
        }
        console.log("Profile fetched:", profile);
        if (profile.username === 0n) {
            return undefined;
        }
        const decodedProfile = {
            username: decodeMessage(profile.username),
            bio: decodeMessage(profile.bio),
            profileImageURL: profile.profileImageURL
        };
        setUsernames((prev) => new Map(prev).set(address, decodedProfile.username));
        setProfileImageURL(profile.profileImageURL);
        return decodedProfile;
    };

    const encodeMessage = (msg: string): bigint => {
        let encoded = BigInt(0);
        for (let i = 0; i < msg.length; i++) {
            encoded = (encoded << 8n) + BigInt(msg.charCodeAt(i));
        }
        return encoded;
    };

    const decodeMessage = (msg: bigint): string => {
        let str = "";
        let temp = msg;
        while (temp > 0) {
            const charCode = Number(temp & 0xFFn);
            str = String.fromCharCode(charCode) + str;
            temp = temp >> 8n;
        }
        return str;
    };

    const postNewMessage = async () => {
        if (!message || !contract) return;

        const encoded = encodeMessage(message);
        await contract.createCarving(encoded);
        setMessage('');
        fetchMessages();
    };

    const fetchLikes = async (carvingId: number) => {
        if (!contract) return;
        const count = await contract.getLikesCount(carvingId);
        setLikes((prev) => new Map(prev).set(carvingId, Number(count)));
    };

    const fetchLikedStatus = async (carvingId: number) => {
        if (!contract || !account) return;
        const liked = await contract.hasLikedCarving(account, carvingId);
        if (liked) {
            setLikedCarvings((prev) => new Set(prev).add(carvingId));
        }
    };

    const likeCarving = async (carvingId: number) => {
        if (!contract) return;
        await contract.likeCarving(carvingId);
        setLikedCarvings((prev) => new Set(prev).add(carvingId));
        fetchLikes(carvingId);
    };

    const unlikeCarving = async (carvingId: number) => {
        if (!contract) return;
        await contract.unlikeCarving(carvingId);
        setLikedCarvings((prev) => {
            const newSet = new Set(prev);
            newSet.delete(carvingId);
            return newSet;
        });
        fetchLikes(carvingId);
    };

    const fetchMessages = async () => {
        if (!contract) return;
        const count = await contract.getCarvingsCount();
        const msgs = await contract.getCarvings(0, count);
        const decodedCarvings = await Promise.all(
            msgs.map(async (m: any) => {
                const address = m[1];
                if (!usernames.has(address)) {
                    await fetchUserProfile(address);
                }
                const timestamp = Number(m[2])*1000;
                const carvingId = msgs.indexOf(m);
                await fetchLikes(carvingId);
                await fetchLikedStatus(carvingId);

                return { message: decodeMessage(m[0]), address, timestamp, carvingId };
            })
        );
        setCarvings(decodedCarvings);
    };

    async function createAccount(usernameInput: string) {
        if (!contract) return;
        try {
            const encodedUsername = encodeMessage(usernameInput);
            await contract.setUsername(encodedUsername);
            setUsername(usernameInput);
        } catch (error) {
            alert("An error occurred while creating the account.");
            console.error(error);
        }
    }

    // Placeholder function for fetching comments for a carving
    const fetchCommentsForCarving = async (carvingId: number) => {
        // TODO: integrate with contract if needed
        // Placeholder: returns empty array or mock data
        return [];
    };

    const openCommentsModal = async (carving: Carving) => {
        setSelectedCarving(carving);
        const fetchedComments = await fetchCommentsForCarving(carving.carvingId);
        setComments(fetchedComments);
        setShowCommentsModal(true);
    };

    const closeCommentsModal = () => {
        setShowCommentsModal(false);
        setSelectedCarving(null);
        setComments([]);
        setNewComment('');
    };

    const postComment = async () => {
        if (!newComment || !selectedCarving || !contract) return;
        if (newComment.length > MAX_LENGTH) {
            alert("Your etch exceeds the 32-character limit.");
            return;
        }
        // TODO: Integrate posting comment to contract
        // After success:
        setComments((prev) => [...prev, {
            message: newComment,
            address: account,
            timestamp: new Date().getTime()
        }]);
        setNewComment('');
    };

    // Dark theme similar to Twitter
    const theme = createTheme({
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
    });

    const remainingCharsForMessage = MAX_LENGTH - message.length;
    const remainingCharsForComment = MAX_LENGTH - newComment.length;

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
                        {/* Profile Section */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: '1rem' }}>
                            <Avatar src={profileImageURL || ''}>
                                {!profileImageURL && <Person />}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="h6">{username || account.slice(0, 6) + '...' + account.slice(-4)}</Typography>
                                <Typography variant="body2" color="text.secondary">{bio}</Typography>
                            </Box>
                        </Box>

                        {/* New Carving (Tweet) Box */}
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

                        {/* Carvings (Tweets) List */}
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
                                                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#fff' }}>
                                                        {usernames.get(carving.address) || carving.address.slice(0, 6) + '...' + carving.address.slice(-4)}
                                                    </Typography>
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

                                    {/* Action Buttons like Twitter: Comments, Retweets(Recarvings), Likes */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                                        <IconButton color="secondary" onClick={() => openCommentsModal(carving)}>
                                            <ChatBubbleOutline fontSize="small" />
                                        </IconButton>

                                        {/* Placeholder Recarving (Retweet) action */}
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

                {/* Comments Modal */}
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
