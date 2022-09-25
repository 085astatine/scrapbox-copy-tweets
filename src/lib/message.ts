export interface URLChangedMessage {
  type: 'url_changed';
}

export interface TweetCopyRequestMessage {
  type: 'tweet_copy_request';
  tweetID: string;
}

export type Message = URLChangedMessage | TweetCopyRequestMessage;