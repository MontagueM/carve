import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    somnia: {
      url: "https://dream-rpc.somnia.network/",
      chainId: 50311,
    },
  }
};

export default config;
