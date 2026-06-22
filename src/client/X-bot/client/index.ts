import TwitterApi from 'twitter-api-v2';
import { TWITTER_API_CREDENTIALS } from '../../../secret';

// Instantiate a new Twitter API client

const client = new TwitterApi({
  appKey: TWITTER_API_CREDENTIALS.appKey,
  appSecret: TWITTER_API_CREDENTIALS.appSecret,
  accessToken: TWITTER_API_CREDENTIALS.accessToken,
  accessSecret: TWITTER_API_CREDENTIALS.accessTokenSecret,
});

const bearer = new TwitterApi(TWITTER_API_CREDENTIALS.bearerToken);

export const twitterClient = client.readWrite;
export const twitterBearer = bearer.readOnly;

export * from './tweet';
export * from './engagement';
