export const ENV = process.env.NEXT_PUBLIC_ENV;

export const Dev = {
  RPC_URL: "http://localhost:8545",
  CHAIN_ID: 31337,
  CONTRACT_ADDRESS: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
};

export const Somnia = {
  RPC_URL: "https://dream-rpc.somnia.network/",
  CHAIN_ID: 50311,
  CONTRACT_ADDRESS: "0x95c4e23D6635a8B1E858d25516646AEf176BFe7a",
};

export const RPC_URL = ENV === "dev" ? Dev.RPC_URL : Somnia.RPC_URL;
export const CHAIN_ID = ENV === "dev" ? Dev.CHAIN_ID : Somnia.CHAIN_ID;
export const CONTRACT_ADDRESS =
  ENV === "dev" ? Dev.CONTRACT_ADDRESS : Somnia.CONTRACT_ADDRESS;
