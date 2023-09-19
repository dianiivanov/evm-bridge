import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_SEPOLIA_URL = `${process.env.INFURA_SEPOLIA_URL}${process.env.INFURA_API_KEY}`
const INFURA_GOERLI_URL = `${process.env.INFURA_GOERLI_URL}${process.env.INFURA_API_KEY}`;
const LOCALHOST_URL_1 = process.env.LOCALHOST_URL_1;
const LOCALHOST_URL_2 = process.env.LOCALHOST_URL_2;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: false,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: INFURA_SEPOLIA_URL,
      chainId: 11155111,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
    },
    goerli: {
      url: INFURA_GOERLI_URL,
      chainId: 5,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
    },
    localhost1: {
      url: LOCALHOST_URL_1,
      chainId: 31337,
    },
    localhost2: {
      url: LOCALHOST_URL_2,
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },
};

const lazyImport = async (module: any) => {
  return await import(module);
}

task("deploy-source-token", "Deploy a source token contract")
.setAction(async (args, hre) => {
  await hre.run('compile');
  const{ deploySourceToken } = await lazyImport("./scripts/deploy");
  await deploySourceToken();
});

task("deploy-bridge", "Deploy a bridge")
.setAction(async (args, hre) => {
  await hre.run('compile');
  const{ deployBridge } = await lazyImport("./scripts/deploy");
  await deployBridge();
});

task("deploy-verify-source-token", "Deploy and verify source token contract").setAction(async (args, hre) => {
  await hre.run('compile');
  const{ deploySourceToken } = await lazyImport("./scripts/deploy");
  const tx = await deploySourceToken();
  const receipt = await tx?.wait(5);
  verifyContract(hre, receipt.contractAddress);
});

task("deploy-verify-bridge", "Deploy and verify a bridge")
.setAction(async (args, hre) => {
  await hre.run('compile');
  const{ deployBridge } = await lazyImport("./scripts/deploy");
  const tx = await deployBridge();
  const receipt = await tx?.wait(5);
  verifyContract(hre, receipt.contractAddress);
});

const verifyContract = async(hre: any, contractAddress: any) => {
  console.log("verifying contract: ", contractAddress);
  try {
      await hre.run("verify:verify", {
          address: contractAddress,
          constructorArguments: [],
      });
      console.log("Verified");
  } catch (e: any) {
      if(e.message.toLowerCase().includes("already verified")) {
          console.log("Already verified!");
      } else {
          console.log(e);
      }
  }
}
export default config;
