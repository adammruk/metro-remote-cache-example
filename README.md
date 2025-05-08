# Metro remote cache playground

This playground was created to experiment with [Metro Remote Cache](https://metrobundler.dev/docs/caching/). It is using Localstack S3.

## Prerequisites:
- Node 22
- npm
- docker / docker-compose
- [AWS-CLI](https://aws.amazon.com/cli/)

## How to use it

### Start the app initially
1. Install dependencies: `npm install`
2. Start Localstack S3: `docker-compose up`
3. Create bucket for cache: `npm run create-bucket`
> **_NOTE:_**  S3 in localstack is not persistent. After shuting down the container, it will clear it's content and remove the bucket. You need to run `npm run create-bucket` everytime after docker container is up.

4. Install the app on a simulator: `npm run ios` or `npm run android`


### Creating JS bundle

Make sure Localstack container is up and run `npm run build`


Technically instead of S3 `FileStore` could be use, but with this setup we can investigate what keys are requested, get stats about cache hit/miss and so on.
