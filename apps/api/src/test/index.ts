import { twitterClient } from '../client/X-bot/client';
import { canSendTweet, saveTweetData } from '../utils';
import { download } from '../utils/download';
import { excitingTweets } from './tweets';

export const sendTweetWithImage = async (): Promise<void> => {
  const canSend = await canSendTweet();

  if (!canSend) return;

  const urls = [
    'https://th.bing.com/th/id/R.ae6f69f96681689598d25c19fb2f6b8c?rik=pep5uJzjHTlqxQ&pid=ImgRaw&r=0',
  ];
  const randomIndex = Math.floor(Math.random() * urls.length);
  const randomUrl = urls[randomIndex];
  const uri = randomUrl;

  const filename = 'image.png';

  download(uri, filename, async function () {
    try {
      const mediaId = await twitterClient.v1.uploadMedia('./image.png');

      const tweetText = excitingTweets[Math.floor(Math.random() * excitingTweets.length)];

      const send = await twitterClient.v2.tweet({
        text: tweetText,
        media: {
          media_ids: [mediaId],
        },
      });

      await saveTweetData(tweetText, uri, new Date().toISOString());
      console.log('Tweeted: ', tweetText);
      console.log('Tweeted Data: ', send);
    } catch (e) {
      console.error('Error tweeting:', e);
    }
  });
};

if (require.main === module) {
  void sendTweetWithImage();
}
