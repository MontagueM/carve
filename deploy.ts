import hre from "hardhat";
import keytar from 'keytar';
import {ethers} from "ethers";


async function getPrivateKey() {
    const password = await keytar.getPassword(process.env.KEYCHAIN_SERVICE || 'cpk', process.env.KEYCHAIN_ACCOUNT || 'mont');
    return password;
}

async function main() {
    const privateKey = await getPrivateKey();
    if (!privateKey) {
        throw new Error("Private key not found in Keychain");
    }

    const provider = new ethers.JsonRpcProvider("https://dream-rpc.somnia.network/"); // Replace with Somnia RPC URI
    const wallet = new ethers.Wallet(privateKey, provider);

    // We get the contract to deploy
    const MyContract = await hre.ethers.getContractFactory("carve", wallet);
    const myContract = await MyContract.deploy();

    await myContract.waitForDeployment();

    console.log("MyContract deployed to:", await myContract.getAddress());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });