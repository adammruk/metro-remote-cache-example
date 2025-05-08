const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const fs = require('fs')
const { Readable } = require('stream');

const BUCKET_NAME = 'cache'

const s3Client = new S3Client({
  region: 'eu-west-1',
  endpoint: 'http://localhost:4566',
  forcePathStyle: true, // required for localstack
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

const stats = {
  get: 0,
  set: 0,
  hit: 0,
  miss: 0,
};

function printStats() {
  console.log(`[S3-Cache Stats] get: ${stats.get}, set: ${stats.set}, hit: ${stats.hit}, miss: ${stats.miss}`);
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const getS3ClientStore = ({ readOnly = false, logRequestedKeys = false } = {}) => {
  return {
    get: async (key) => {
      stats.get++;
      const s3Key = Buffer.isBuffer(key) ? key.toString('hex') : String(key);
      // Log every requested s3Key to a local file
      if (logRequestedKeys) {
        try {
          fs.appendFileSync('requested-keys.log', s3Key + '\n');
        } catch (logErr) {
          console.error('[S3-Cache] Failed to log requested s3Key:', logErr);
        }
      }
      console.log('<<<<<<<<<<<<<<<<<<<<<< get', s3Key)
      // await delay(2000);
      try {
        const { Body } = await s3Client.send(new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
        }));
        const result = await streamToBuffer(Body);
        console.log(`[S3 - get] Read back: type=${typeof result}, Buffer.isBuffer=${Buffer.isBuffer(result)}, length=${result.length}`);
        // Try to parse as JSON, fallback to Buffer
        try {
          const asString = result.toString('utf8');
          const parsed = JSON.parse(asString);
          stats.hit++;
          console.log(`[S3 - get] Cache HIT`);
          return parsed;
        } catch (e) {
          stats.hit++;
          console.log(`[S3 - get] Cache HIT`);
          return result;
        }
      } catch (err) {
        if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
          stats.miss++;
          console.warn(`[S3 - get] Cache MISS: File not found: ${s3Key}`);
          printStats();
          return null;
        }
        console.error(`[S3 - get] Error getting file ${s3Key}:`, err);
        throw err;
      } finally {
        printStats();
      }
    },
    set: async (key, value) => {
      stats.set++;
      if (readOnly) {
        // console.log('>>>>>>>>>>>>>>>>>>>>>> set (readOnly)', key, value);
        printStats();
        return;
      }
      const s3Key = Buffer.isBuffer(key) ? key.toString('hex') : String(key);
      console.log('>>>>>>>>>>>>>>>>>>>>>> set', s3Key);
      let body;
      if (Buffer.isBuffer(value) || typeof value === 'string') {
        body = value;
      } else if (value && typeof value.pipe === 'function') {
        // It's a stream
        body = await streamToBuffer(value);
      } else {
        // Fallback: try to JSON.stringify
        body = Buffer.from(JSON.stringify(value));
      }
      console.log(`[S3 - set] About to upload: type=${typeof body}, Buffer.isBuffer=${Buffer.isBuffer(body)}, length=${body.length}`);
      // await delay(2000);
      try {
        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: body,
        }));
        console.log(`[S3 - set] Successfully uploaded: ${s3Key}`);
      } catch (err) {
        console.error(`[S3 - set] Error uploading file ${s3Key}:`, err);
        throw err;
      } finally {
        printStats();
      }
    },
    clear: async () => {
      console.log('---------------clear')
    },
  }
}

module.exports = {
  getS3ClientStore,
}
