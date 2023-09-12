const { ethers } = require("ethers");
const Bridge = require("./artifacts/contracts/Bridge.sol/Bridge.json");
require("dotenv").config();

const PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const SOURCE_LOCALHOST_URL = process.env.LOCALHOST_URL_1;
const TARGET_LOCALHOST_URL = process.env.LOCALHOST_URL_2;

const run = async function (contractAddress) {
  const sourceProvider = new ethers.JsonRpcProvider(SOURCE_LOCALHOST_URL);
  const sourceWalletWhoLocks = new ethers.Wallet(PRIVATE_KEY, sourceProvider);

  const sourceWalletWhoOwnsTheBridge = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    sourceProvider
  );

  const targetProvider = new ethers.JsonRpcProvider(TARGET_LOCALHOST_URL);
  const targetWallet = new ethers.Wallet(PRIVATE_KEY, targetProvider);

  const sourceBridge = new ethers.Contract(
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    Bridge.abi,
    sourceWalletWhoLocks
  );

  const sourceToken = new ethers.Contract(
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    Bridge.abi,
    sourceWalletWhoOwnsTheBridge
  );

  console.log("sourceToken Owner: ", await sourceToken.owner());

  sourceToken.connect();
  //   const transferOwnershipTx = await sourceToken.transferOwnership(
  //     "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  //   );
  //   const receiptTransferOwnership = await transferOwnershipTx.wait();
  //   console.log("transfer receipt:", receiptTransferOwnership);

  //   console.log("Source Bridge Owner: ", await sourceToken.owner());
  const targetBridge = new ethers.Contract(
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    Bridge.abi,
    targetWallet
  );

  const targetToken = new ethers.Contract(
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    Bridge.abi,
    targetWallet
  );

  const lockTx = await sourceBridge.lock(
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    100
  );
  const lockReceipt = await lockTx.wait();
  console.log("lockReceipt:", lockReceipt);

  const claimTx = await targetBridge.claimableFor(wallet.address);
  const claimReceipt = await claimTx.wait();
  console.log("claimReceipt from target:", claimReceipt);
};

const args = process.argv.slice(2);

if (args.length < 1) {
  console.log("Usage: node interact-with-local.js <smart contract address>");
  process.exit(1);
}

run(args[0]);
