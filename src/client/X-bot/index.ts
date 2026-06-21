import moment from 'moment';
import Tweet from '../../models/Tweet';

async function canSendTweet() {
  const twentyFourHoursAgo = moment().subtract(24, 'hours').toDate(); // Get the timestamp of 24 hours ago

  // Check how many tweets were sent in the last 24 hours
  const tweetCount = await Tweet.countDocuments({
    timeTweeted: { $gte: twentyFourHoursAgo }, // Tweets sent within the last 24 hours
  });

  if (tweetCount >= 17) {
    console.log('Rate limit reached for the last 24 hours. Cannot send tweet.');
    return false; // Exceeded tweet limit for the last 24 hours
  }

  console.log(`Tweets sent in the last 24 hours: ${tweetCount}. You can send another tweet.`);
  return true; // Can send tweet
}
