import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const carveModule = buildModule("carveModule", (m) => {
    const carve = m.contract("carve");

    return { carve };
});

export default carveModule;
