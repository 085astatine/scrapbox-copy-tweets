import browser from 'webextension-polyfill';
import { tweetJSONSchema, tweetsJSONSchema } from '../jsonschema/tweet';
import { JSONSchemaValidationError } from '../validate-json/jsonschema-validation-error';
import validateTweet from '../validate-json/validate-tweet';
import validateTweets from '../validate-json/validate-tweets';
import { logger } from './logger';
import { Tweet, TweetID } from './tweet';
import { isTweetIDKey, toTweetID, toTweetIDKey } from './tweet-id-key';

export const saveTweets = async (tweets: Tweet[]): Promise<void> => {
  // JSON Schema validation
  if (!validateTweets(tweets)) {
    throw new JSONSchemaValidationError(
      tweetsJSONSchema,
      tweets,
      validateTweets.errors
    );
  }
  // set to storage
  await browser.storage.local.set(
    Object.fromEntries(tweets.map((tweet) => [toTweetIDKey(tweet.id), tweet]))
  );
};

export const savedTweetIDs = async (): Promise<TweetID[]> => {
  return await browser.storage.local
    .get()
    .then((records) =>
      Object.keys(records).filter(isTweetIDKey).map(toTweetID)
    );
};

export const loadTweets = async (): Promise<Tweet[]> => {
  // load from storage
  const tweets = await browser.storage.local.get().then((record) =>
    Object.entries(record).reduce<Tweet[]>((tweets, [key, value]) => {
      if (isTweetIDKey(key)) {
        tweets.push(value);
      }
      return tweets;
    }, [])
  );
  // JSON Schema valication
  if (!validateTweets(tweets)) {
    throw new JSONSchemaValidationError(
      tweetsJSONSchema,
      tweets,
      validateTweets.errors
    );
  }
  return Promise.resolve(tweets);
};

export const loadTweet = async (tweetID: TweetID): Promise<Tweet | null> => {
  // load from storage
  const key = toTweetIDKey(tweetID);
  const tweet = await browser.storage.local
    .get(key)
    .then((record) => record[key]);
  if (tweet === undefined) {
    return Promise.resolve(null);
  }
  // JSON Schema validation
  if (!validateTweet(tweet)) {
    throw new JSONSchemaValidationError(
      tweetJSONSchema,
      tweet,
      validateTweet.errors
    );
  }
  return Promise.resolve(tweet);
};

export const dumpStorage = async (): Promise<void> => {
  const data = await browser.storage.local.get();
  logger.debug('dump storage', data);
};
