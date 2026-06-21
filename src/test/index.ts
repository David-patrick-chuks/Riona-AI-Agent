import Tweet from "../models/Tweet";
import { twitterClient } from "../client/X-bot/client";
import { canSendTweet } from "../utils";
import { download } from "../utils/download";
import { excitingTweets } from "./tweets";

const SendtweetWithImage = async () => {
    const canSend = await canSendTweet();
  
    if (!canSend) return; // If we cannot send tweet, exit the function
  
    const urls = [
      "https://th.bing.com/th/id/R.ae6f69f96681689598d25c19fb2f6b8c?rik=pep5uJzjHTlqxQ&pid=ImgRaw&r=0",
    ];
    const randomIndex = Math.floor(Math.random() * urls.length);
    const randomUrl = urls[randomIndex];
    const uri = randomUrl;
  
    const filename = "image.png";
  
    // Retry logic for downloading and sending tweet with image
    download(uri, filename, async function () {
      try {
        // Retry logic for image upload
        const mediaId = await twitterClient.v1.uploadMedia("./image.png");
  
        const tweetText =
          excitingTweets[Math.floor(Math.random() * excitingTweets.length)];
  
        // Retry logic for tweeting
        const send = await twitterClient.v2.tweet({
          text: tweetText,
          media: {
            media_ids: [mediaId],
          },
        });
  
        // Store tweet data in the database
        const newTweet = new Tweet({
          tweetContent: tweetText,
          imageUrl :uri,
          timeTweeted: new Date(),
        });
  
        await newTweet.save();
        console.log("Tweeted: ", tweetText);
        console.log("Tweeted Data: ", send);
      } catch (e) {
        console.error("Error tweeting:", e);
      }
    });
  };
  