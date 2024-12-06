# Moonshot Trading Terminal

## Description

The application is a very simple express api with two endpoints:
```
POST /prepare
POST /confirm
```

It allows for preparing a transaction to be submitted to Moonshot on Base, 
the transaction has to be signed by a self custody wallet and submitted using /confirm endpoint.

There is also a simple `cron` to listen to Moonshot events.

## Start Application

In order to run app create a `.env` file and fill in environmental variables as shown in `.env.example`.

To start the app run:
```
npm i
npm i @heliofi/launchpad-common@1.1.0

npm run dev
```

In order for the app to work you have to install specific version of `@heliofi/launchpad-common`. 

## Integration Testing

In order to run integration tests a forked Base network has to be started using `Anvil`. 

Check https://book.getfoundry.sh/getting-started/installation for installation guide.


The rpc url can be changed,
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


## Future improvements

There is plenty to improve however I focused on delivering the functionality as this is a showcase application.

Example improvements that should be done, among others:
* Improve test coverage to test all transaction types and also negative paths and edge cases.
* Validate endpoint body
* Improve error handling for endpoints
* Listen to more events in cron and handle those events properly
* Make the app production ready.
