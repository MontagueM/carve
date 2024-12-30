# carve

carve is a solidity contract and frontend for an on-chain twitter.

you can see the frontend at https://montaguem.github.io/carve which runs on the [somnia devnet](https://somnia.network/).

the solidity contract runs the entire site from a single contract, storing all data in itself.

would be interesting to try
- treating each new user as its own contract
- making the contract upgradeable using openzeppelin proxy contracts

## how to use

start the local chain:
```
npm run bc:start:node
```

deploy the carve contract:
```
npm run bc:deploy:contract:local
```

modify `frontend/src/config.ts` to point to your newly deployed contract.

start the frontend:
```
npm run frontend:dev
```


to deploy the chain to somnia devnet:
```
npm run bc:deploy:chain:somnia
```

and modify `frontend/src/config.ts` to point to the new contract address.

## dev issues

```
Nonce too high...
Received invalid block tag...
```

if you see these errors in the hardhat node, you can reset the chain with:
```
npx hardhat clean
```
and then restart the chain.