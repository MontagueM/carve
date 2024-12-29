# carve

carve is a solidity contract and frontend for an on-chain twitter.

you can see the frontend at https://montaguem.github.io/carve which runs on the [somnia testnet](https://somnia.network/).

the solidity contract runs the entire site from a single contract, storing all data in itself.

would be interesting to try treating each new user as its own contract.

## how to use

start the local chain:
```
npm run bc:start:node
```

deploy the carve contract:
```
npm run bc:deploy:contract:local
```

start the frontend:
```
npm run frontend:dev
```


to deploy the chain to somnia testnet:
```
npm run bc:deploy:chain:somnia
```

