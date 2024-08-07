import type { TweetID } from '~/lib/tweet/types';

export class ParseTweetError extends Error {
  readonly tweetID: TweetID;

  constructor(tweetID: TweetID, message: string) {
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ParseTweetError);
    }
    this.name = 'ParseTweetError';
    this.tweetID = tweetID;
  }
}
