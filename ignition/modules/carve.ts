import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import proxyModule from "./proxy";

const carveModule = buildModule("carveModule", (m) => {
    const { proxy, proxyAdmin } = m.useModule(proxyModule);

    const carve = m.contractAt("carve", proxy);

    return { carve, proxy,  proxyAdmin};
});

export default carveModule;
