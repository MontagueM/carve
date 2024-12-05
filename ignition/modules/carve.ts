import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const carveModule = buildModule("carveModule", (m) => {
    const lock = m.contract("carve");

    return { lock };
});

export default carveModule;
