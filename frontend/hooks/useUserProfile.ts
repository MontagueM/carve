import { useCallback, useEffect, useRef } from "react";
import { useWallet } from "@/context/WalletProvider";

export type UserProfile = {
  createdAt: number;
  username: string;
  bio: string;
  pfpURL: string;
  backgroundURL: string;
};

function useUserProfile() {
  const profiles = useRef(new Map<string, UserProfile>());
  const { contract, address: userAddress } = useWallet();

  const fetchProfile = useCallback(
    async (address: string) => {
      if (!contract || address == "") {
        return undefined;
      }

      if (profiles.current.has(address)) {
        return profiles.current.get(address);
      }

      const result = await contract.getUserProfile(address);
      const profile = {
        createdAt: Number(result[0]) * 1000,
        username: result[1],
        bio: result[2],
        pfpURL: result[3],
        backgroundURL: result[4],
      };
      if (profile.username === "") {
        return undefined;
      }

      profiles.current.set(address, profile);

      return profile;
    },
    [contract],
  );

  const getProfile = useCallback((address: string) => {
    return profiles.current.get(address);
  }, []);

  useEffect(() => {
    void fetchProfile(userAddress);
  }, [userAddress]);

  return { fetchProfile, getProfile, profile: getProfile(userAddress) };
}

export default useUserProfile;
