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

task("deploy-token", "Deploy a token by contract name")
.addParam("contractName", "Please provide the contract name")
.setAction(async (args, hre) => {
  await hre.run('compile');
  const{ deployToken } = await lazyImport("./scripts/deploy");
  await deployToken(args.contractName);
});

task("deploy-bridge", "Deploy a bridge")
.setAction(async (args, hre) => {
  await hre.run('compile');
  const{ deployBridge } = await lazyImport("./scripts/deploy");
  await deployBridge();
});
// task("deploy-and-verify", "Deploy BookLibrary").setAction(async (args, hre) => {
//   await hre.run('compile');
//   const{ deployBookLibrary } = await lazyImport("./scripts/deploy-booklibrary");
//   const tx = await deployBookLibrary();
//   const receipt = await tx?.wait(5);
//   console.log("verifying contract: ", receipt.contractAddress);
//   try {
//       await hre.run("verify:verify", {
//           address: receipt.contractAddress,
//           constructorArguments: [],
//       });
//       console.log("Verified");
//   } catch (e: any) {
//       if(e.message.toLowerCase().includes("already verified")) {
//           console.log("Already verified!");
//       } else {
//           console.log(e);
//       }
//   }
// });

export default config;
