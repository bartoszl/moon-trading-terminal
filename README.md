# Moonshot Trading Terminal

## Testing

In order to run integration tests a forked Base network has to be started using `Anvil`. The rpc url can be changed,
but block number should remain unchanged to ensure consistency between test runs.

```
anvil --fork-url https://base.gateway.tenderly.co --fork-block-number 23303131
```

Afterwards run:
```
npm run test
```

Note: the private key in `setupTestEnv.ts` is the first key returned from running anvil. 
Make sure it is the correct one before running tests.
