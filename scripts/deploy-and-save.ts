import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    const carveFactory = await ethers.getContractFactory("carve");
    const carve = await carveFactory.deploy();

    await carve.deployed();

    console.log("carve deployed to:", carve.address);

    const configPath = path.join(__dirname, '../frontend/src/config.ts');
    const config = `
export const CONTRACT_ADDRESS = "${carve.address}";
export const ABI = ${JSON.stringify(carve.interface.format('json'))};
`;

    fs.writeFileSync(configPath, config);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });