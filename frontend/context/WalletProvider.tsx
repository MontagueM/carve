"use client";

import React, { useState, useEffect, createContext, useCallback } from "react";
import { ethers } from "ethers";
import { CHAIN_ID, CONTRACT_ADDRESS, RPC_URL } from "@/app/config";
import carve from "@/app/contracts/carve.json";

const WalletContext = createContext<{
  contract: ethers.Contract | undefined;
  address: string;
  loadingAddress: boolean;
  connectWallet: () => Promise<void>;
}>({
  contract: undefined,
  address: "",
  loadingAddress: true,
  connectWallet: async () => {},
});

function WalletProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [contract, setContract] = useState<ethers.Contract | undefined>(
    undefined,
  );
  const [address, setAddress] = useState<string>("");
  const [loadingAddress, setLoadingAddress] = useState<boolean>(true);

  const connectWallet = useCallback(async () => {
    if (window.ethereum) {
      let provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      let network = await provider.getNetwork();
      const expectedChainId = CHAIN_ID;
      if (Number(network.chainId) !== expectedChainId) {
        try {
          await provider.send("wallet_switchEthereumChain", [
            { chainId: ethers.toQuantity(expectedChainId) },
          ]);
        } catch (switchError) {
          alert(
            "Please switch to the Somnia chain in your wallet to use carve.",
          );
          console.error("Failed to switch network", switchError);
          return;
        }
      }
      provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const contractWithSigner = new ethers.Contract(
        CONTRACT_ADDRESS,
        carve.abi,
        signer,
      );
      setContract(contractWithSigner);
      setAddress(address);
      setLoadingAddress(false);
    } else {
      alert("Please install MetaMask!");
    }
  }, []);

  useEffect(() => {
    if (contract) {
      return;
    }

    const tempProvider = new ethers.JsonRpcProvider(RPC_URL);
    const tempContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      carve.abi,
      tempProvider,
    );
    setContract(tempContract);

    void connectWallet();
  }, []);

  return (
    <WalletContext.Provider
      value={{ contract, address, loadingAddress, connectWallet }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return React.useContext(WalletContext);
}

export default WalletProvider;
