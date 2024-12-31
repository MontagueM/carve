"use client";

import React, { useState, createContext, useCallback } from "react";
import { Carving, CarvingType } from "@/types";
import { useWallet } from "@/context/WalletProvider";

export type UserProfile = {
  createdAt: number;
  username: string;
  bio: string;
  pfpURL: string;
  backgroundURL: string;
  followerCount: number;
  followingCount: number;
  carvingCount: number;
};

const ContractStateContext = createContext<{
  carvings: Carving[];
  loadingCarvings: boolean;
  fetchCarvings: () => Promise<void>;
  fetchProfile: (
    address: string,
    force?: boolean,
  ) => Promise<UserProfile | undefined>;
  getProfile: (address: string) => UserProfile | undefined;
}>({
  carvings: [],
  loadingCarvings: true,
  fetchCarvings: async () => {},
  fetchProfile: async () => undefined,
  getProfile: () => undefined,
});

function ContractStateProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [carvings, setCarvings] = useState<Carving[]>([]);
  const [loadingCarvings, setLoadingCarvings] = useState<boolean>(true);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());

  const { contract } = useWallet();

  const fetchProfile = useCallback(
    async (address: string, force: boolean = false) => {
      if (!contract || address == "") {
        return undefined;
      }

      if (!force && profiles.has(address)) {
        return profiles.get(address);
      }

      const result = await contract.getUserProfile(address);
      const profile = {
        createdAt: Number(result[0]) * 1000,
        username: result[1],
        bio: result[2],
        pfpURL: result[3],
        backgroundURL: result[4],
        followerCount: Number(result[5]),
        followingCount: Number(result[6]),
        carvingCount: Number(result[7]),
      };
      if (profile.username === "") {
        return undefined;
      }

      setProfiles(profiles.set(address, profile));

      return profile;
    },
    [contract, profiles],
  );

  const getProfile = useCallback(
    (address: string) => {
      return profiles.get(address);
    },
    [profiles],
  );

  const fetchCarvings = useCallback(async () => {
    if (!contract) {
      return;
    }

    setLoadingCarvings(true);
    const count = Number(await contract.getCarvingsCount());
    if (count === 0) {
      setCarvings([]);
      setLoadingCarvings(false);
      return;
    }

    const carvingsResult = await contract.getCarvings(0, Number(count));
    const allCarvings: Carving[] = carvingsResult.map((c: never) => {
      return {
        id: Number(c[0]),
        originalCarvingId: Number(c[1]),
        sentAt: Number(c[2]) * 1000,
        likeCount: Number(c[3]),
        recarveCount: Number(c[4]),
        etchCount: Number(c[5]),
        carver: c[6],
        carvingType: Number(c[7]) as CarvingType,
        hidden: c[8],
        likedByUser: c[9],
        message: c[10],
      };
    });

    // fetch all user profiles as required
    const uniqueAddresses = new Set(allCarvings.map((c) => c.carver));

    // together await all user profiles and carving likes/like status
    const userProfilePromises = Array.from(uniqueAddresses).map((address) =>
      fetchProfile(address),
    );
    await Promise.all(userProfilePromises);

    setCarvings(allCarvings);
    setLoadingCarvings(false);
  }, [contract, fetchProfile]);

  return (
    <ContractStateContext.Provider
      value={{
        carvings,
        loadingCarvings,
        fetchCarvings,
        fetchProfile,
        getProfile,
      }}
    >
      {children}
    </ContractStateContext.Provider>
  );
}

export function useContractState() {
  return React.useContext(ContractStateContext);
}

export default ContractStateProvider;
