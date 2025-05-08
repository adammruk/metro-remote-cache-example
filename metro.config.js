const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const { getS3ClientStore } = require('./s3-cache');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
    cacheStores: ({ FileStore }) => [
        getS3ClientStore({ readOnly: process.env.CACHE_READ_ONLY === 'true' }),
        // new FileStore({
        //     root: path.resolve(__dirname, 'metro-cache'),
        // }),
    ],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
