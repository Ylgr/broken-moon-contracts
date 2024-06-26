import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@openzeppelin/hardhat-upgrades';
import "hardhat-preprocessor";
import fs from "fs";
require("dotenv").config();

function getRemappings() {
  return fs
      .readFileSync("remappings.txt", "utf8")
      .split("\n")
      .filter(Boolean) // remove empty lines
      .map((line) => line.trim().split("="));
}


const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  preprocess: {
    eachLine: (hre) => ({
      transform: (line: string) => {
        if (line.match(/^\s*import /i)) {
          for (const [from, to] of getRemappings()) {
            if (line.includes(from)) {
              line = line.replace(from, to);
              break;
            }
          }
        }
        return line;
      },
    }),
  },
  paths: {
    sources: "./src",
    cache: "./cache_hardhat",
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-sepolia.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY,
      },
      allowUnlimitedContractSize: true,
      // gasPrice: 5000000000, // 5 gwei
      // initialBaseFeePerGas: 5000000000, // 5 gwei
      maxFeePerGas: 500000000000, // 5 gwei
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: [process.env.PRIVATE_KEY as string],
    },
    mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: [process.env.PRIVATE_KEY as string],
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY,
      chainId: 11155111,
      accounts: [process.env.PRIVATE_KEY as string],
    },

    arbitrumSepolia: {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: [process.env.PRIVATE_KEY as string],
    }
  },
  etherscan: {
    apiKey: {
      arbitrumSepolia: process.env.API_KEY,
    },
    sepolia: process.env.API_KEY,
    bscTestnet: process.env.API_KEY,
    customChains: [
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
    ],
  },
};

export default config;
