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
    async (address: string, force: boolean = false) => {
      if (!contract || address == "") {
        return undefined;
      }

      if (!force && profiles.current.has(address)) {
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
      console.log(profiles.current);

      return profile;
    },
    [contract, profiles.current],
  );

  const getProfile = useCallback(
    (address: string) => {
      console.log("getProfile", address, profiles.current);
      return profiles.current.get(address);
    },
    [profiles.current],
  );

  useEffect(() => {
    console.log("fetchProfile");
    void fetchProfile(userAddress);
  }, [userAddress, fetchProfile]);

  return { fetchProfile, getProfile, profile: getProfile(userAddress) };
}

export default useUserProfile;
