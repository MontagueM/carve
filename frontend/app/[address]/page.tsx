'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ethers } from 'ethers';
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
} from '@mui/material';
import { FavoriteBorder, Favorite, Repeat, ChatBubbleOutline, Person } from '@mui/icons-material';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import carve from '../contracts/carve.json';
import { CONTRACT_ADDRESS } from "../config";
import { useEncodeDecode } from '../hooks/useEncodeDecode';
import Link from 'next/link';
import Skeleton from '@mui/material/Skeleton';
import { usePathname } from 'next/navigation';

type Carving = {
    carvingId: number;
    message: string;
    address: string;
    timestamp: number;
};

export default function ProfilePage() {
    const [contract, setContract] = useState<ethers.Contract | undefined>(undefined);
    const [account, setAccount] = useState<string>('');
    const [profileAddress, setProfileAddress] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [bio, setBio] = useState<string>('');
    const [profileImageURL, setProfileImageURL] = useState<string>('');
    const [carvings, setCarvings] = useState<Carving[]>([]);
    const [tab, setTab] = useState<number>(0);
    const [usernames, setUsernames] = useState<Map<string, string>>(new Map());
    const [likes, setLikes] = useState<Map<number, number>>(new Map());
    const [likedCarvings, setLikedCarvings] = useState<Set<number>>(new Set());
    const [isLoadingCarvings, setIsLoadingCarvings] = useState<boolean>(false);

    const [editUsername, setEditUsername] = useState<string>('');
    const [editBio, setEditBio] = useState<string>('');
    const [editPfpURL, setEditPfpURL] = useState<string>('');

    const { decodeString, encodeString } = useEncodeDecode();

    const pathname = usePathname();

    useEffect(() => {
        // pathname is like "/0xabc123..."
        const parts = pathname.split('/');
        if (parts.length > 1 && parts[1]) {
            setProfileAddress(parts[1]);
        }
    }, [pathname]);

    const connectWallet = useCallback(async () => {
        if ((window as any).ethereum) {
            let provider = new ethers.BrowserProvider((window as any).ethereum);
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
            provider = new ethers.BrowserProvider((window as any).ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            const contractWithSigner = new ethers.Contract(CONTRACT_ADDRESS, carve.abi, signer);
            setContract(contractWithSigner);
            setAccount(address);
        } else {
            alert("Please install MetaMask!");
        }
    }, []);

    const fetchUserProfile = useCallback(async (address: string) => {
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
        return decodedProfile;
    }, [contract, decodeString]);

    const fetchUserCarvings = useCallback(async () => {
        if (!contract || !profileAddress) return;
        setIsLoadingCarvings(true);
        const userCarvingsCount = await contract.getUserCarvings(profileAddress, 0, 0).catch(() => []);
        // we need the count of userCarvings first (not directly given). We'll just fetch all carvings and filter.
        // To optimize: The contract code doesn't directly allow partial loading easily. We'll just load all and filter.
        const globalCount = await contract.getCarvingsCount();
        const userCarvings = await contract.getUserCarvings(profileAddress, 0, globalCount);
        const decodedUserCarvings = userCarvings.map((c) => ({
            carvingId: c.carvingId,
            message: decodeString(c.message),
            address: c.address,
            timestamp: c.timestamp
        }));

        // Fetch likes
        await Promise.all(decodedUserCarvings.map(async (c) => {
            const count = await contract.getLikesCount(c.carvingId);
            setLikes((prev) => new Map(prev).set(c.carvingId, Number(count)));
            if (account) {
                const liked = await contract.hasLikedCarving(account, c.carvingId);
                if (liked) {
                    setLikedCarvings((prev) => new Set(prev).add(c.carvingId));
                }
            }
        }));

        setCarvings(filteredCarvings);
        setIsLoadingCarvings(false);
    }, [contract, profileAddress, decodeString, fetchUserProfile, usernames, account]);

    const isMyProfile = useMemo(() => {
        return account && profileAddress && account.toLowerCase() === profileAddress.toLowerCase();
    }, [account, profileAddress]);

    const updateUsername = useCallback(async () => {
        if (!contract || !editUsername) return;
        const encoded = encodeString(editUsername);
        await contract.setUsername(encoded);
        setUsername(editUsername);
    }, [contract, editUsername, encodeString]);

    const updateBio = useCallback(async () => {
        if (!contract) return;
        const encoded = encodeString(editBio);
        await contract.setBio(encoded);
        setBio(editBio);
    }, [contract, editBio, encodeString]);

    const updatePfp = useCallback(async () => {
        if (!contract) return;
        await contract.setPfpURL(editPfpURL);
        setProfileImageURL(editPfpURL);
    }, [contract, editPfpURL]);

    const likeCarving = useCallback(async (carvingId: number) => {
        if (!contract) return;
        await contract.likeCarving(carvingId);
        setLikedCarvings((prev) => new Set(prev).add(carvingId));
        const count = await contract.getLikesCount(carvingId);
        setLikes((prev) => new Map(prev).set(carvingId, Number(count)));
    }, [contract]);

    const unlikeCarving = useCallback(async (carvingId: number) => {
        if (!contract) return;
        await contract.unlikeCarving(carvingId);
        setLikedCarvings((prev) => {
            const newSet = new Set(prev);
            newSet.delete(carvingId);
            return newSet;
        });
        const count = await contract.getLikesCount(carvingId);
        setLikes((prev) => new Map(prev).set(carvingId, Number(count)));
    }, [contract]);

    useEffect(() => {
        async function init() {
            if (!contract) {
                const tempProvider = new ethers.JsonRpcProvider("https://dream-rpc.somnia.network/");
                const tempContract = new ethers.Contract(CONTRACT_ADDRESS, carve.abi, tempProvider);
                setContract(tempContract);
            }
        }
        void init();
    }, [contract]);

    useEffect(() => {
        void connectWallet();
    }, [connectWallet]);

    useEffect(() => {
        async function loadProfile() {
            if (!contract || !profileAddress) return;
            const up = await fetchUserProfile(profileAddress);
            if (up) {
                setUsername(up.username);
                setBio(up.bio);
                setProfileImageURL(up.profileImageURL);
            }
        }
        void loadProfile();
    }, [contract, profileAddress, fetchUserProfile]);

    useEffect(() => {
        if (contract && profileAddress) {
            void fetchUserCarvings();
        }
    }, [contract, profileAddress, fetchUserCarvings]);

    const sortedCarvings = useMemo(() => {
        return carvings.slice().sort((a, b) => b.timestamp - a.timestamp);
    }, [carvings]);

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

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Container maxWidth="sm" style={{ paddingTop: '1rem' }}>
                {(!contract || !profileAddress) && (
                    <Typography variant="h6">Loading...</Typography>
                )}
                {profileAddress && (
                    <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: '1rem' }}>
                            <Avatar src={profileImageURL || ''}>
                                {!profileImageURL && <Person />}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="h6">{username || profileAddress.slice(0, 6) + '...' + profileAddress.slice(-4)}</Typography>
                                <Typography variant="body2" color="text.secondary">{bio}</Typography>
                            </Box>
                        </Box>

                        {isMyProfile && (
                            <Paper sx={{ p:2, mb:2 }} elevation={0}>
                                <Typography variant="h6">Edit Profile</Typography>
                                <Box sx={{ display:'flex', flexDirection:'column', gap:1, mt:1 }}>
                                    <TextField
                                        label="New Username"
                                        value={editUsername}
                                        onChange={(e) => setEditUsername(e.target.value)}
                                        InputProps={{ style: {color:'#fff'} }}
                                        InputLabelProps={{style:{color:'#8899A6'}}}
                                    />
                                    <Button variant="contained" onClick={updateUsername} disabled={!editUsername}>Update Username</Button>

                                    <TextField
                                        label="New Bio"
                                        value={editBio}
                                        onChange={(e) => setEditBio(e.target.value)}
                                        InputProps={{ style: {color:'#fff'} }}
                                        InputLabelProps={{style:{color:'#8899A6'}}}
                                    />
                                    <Button variant="contained" onClick={updateBio} disabled={!editBio}>Update Bio</Button>

                                    <TextField
                                        label="New PFP URL"
                                        value={editPfpURL}
                                        onChange={(e) => setEditPfpURL(e.target.value)}
                                        InputProps={{ style: {color:'#fff'} }}
                                        InputLabelProps={{style:{color:'#8899A6'}}}
                                    />
                                    <Button variant="contained" onClick={updatePfp} disabled={!editPfpURL}>Update PFP</Button>
                                </Box>
                            </Paper>
                        )}

                        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb:2 }}>
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
                                        {sortedCarvings.map((carving) => (
                                            <Paper key={carving.carvingId} elevation={0} sx={{ marginBottom: '1rem', padding: '1rem' }}>
                                                <ListItem alignItems="flex-start" disableGutters>
                                                    <ListItemAvatar>
                                                        <Avatar />
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
                                                    <IconButton color="secondary" onClick={() => alert('Comments not implemented here')}>
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

                        {tab === 1 && (
                            <Typography variant="body1">Recarves not implemented yet.</Typography>
                        )}
                    </>
                )}
            </Container>
        </ThemeProvider>
    );
}
