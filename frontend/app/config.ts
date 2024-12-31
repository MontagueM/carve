export const ENV = process.env.NEXT_PUBLIC_ENV;

export const Dev = {
  RPC_URL: "http://localhost:8545",
  CHAIN_ID: 31337,
  CONTRACT_ADDRESS: "0x0B306BF915C4d645ff596e518fAf3F9669b97016",
};

export const Somnia = {
  RPC_URL: "https://dream-rpc.somnia.network/",
  CHAIN_ID: 50311,
  CONTRACT_ADDRESS: "0xE96fed6b84fb7E5557067e45C59BC09bF902EE81",
};

export const RPC_URL = ENV === "dev" ? Dev.RPC_URL : Somnia.RPC_URL;
export const CHAIN_ID = ENV === "dev" ? Dev.CHAIN_ID : Somnia.CHAIN_ID;
export const CONTRACT_ADDRESS =
  ENV === "dev" ? Dev.CONTRACT_ADDRESS : Somnia.CONTRACT_ADDRESS;
