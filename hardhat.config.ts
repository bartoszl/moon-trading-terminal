import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    hardhat: {},
    base: {
      url: "https://base.gateway.tenderly.co",
    },
  },
};

export default config;
