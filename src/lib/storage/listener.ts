import browser from 'webextension-polyfill';
import { Logger } from '../logger';
import { DeletedTweetID, Tweet, TweetID } from '../tweet/types';
import { isTweetIDKey, toTweetID } from './tweet-id-key';

type OnChangedListener = (
  changes: browser.Storage.StorageAreaOnChangedChangesType,
) => void;

export interface UpdatedTweet {
  id: TweetID;
  before: Tweet;
  after: Tweet;
}

export interface TweetChanges {
  added?: Tweet[];
  deleted?: Tweet[];
  updated?: UpdatedTweet[];
}

export interface UpdatedDeletedTweetID {
  id: TweetID;
  before: DeletedTweetID;
  after: DeletedTweetID;
}

export interface TrashboxChanges {
  added?: DeletedTweetID[];
  deleted?: DeletedTweetID[];
  updated?: UpdatedDeletedTweetID[];
}

export interface StorageListenerArguments {
  tweet?: TweetChanges;
  trashbox?: TrashboxChanges;
}

export const createStorageListener = (
  listener: (args: StorageListenerArguments) => void,
  logger?: Logger,
): OnChangedListener => {
  return (changes: browser.Storage.StorageAreaOnChangedChangesType) => {
    logger?.debug('Storage changes', changes);
    // tweet changes
    const addedTweets: Tweet[] = [];
    const deletedTweets: Tweet[] = [];
    const updatedTweets: UpdatedTweet[] = [];
    for (const [key, value] of Object.entries(changes)) {
      // tweet
      if (isTweetIDKey(key)) {
        const tweetID = toTweetID(key);
        if (value.oldValue === undefined) {
          addedTweets.push(value.newValue);
        } else if (value.newValue === undefined) {
          deletedTweets.push(value.oldValue);
        } else {
          updatedTweets.push({
            id: tweetID,
            before: value.oldValue,
            after: value.newValue,
          });
        }
      }
    }
    const tweet: TweetChanges = {
      ...(addedTweets.length > 0 && { added: addedTweets }),
      ...(deletedTweets.length > 0 && { deleted: deletedTweets }),
      ...(updatedTweets.length > 0 && { updated: updatedTweets }),
    };
    // trashbox changes
    const trashbox = trashboxChanges(
      changes['trashbox']?.oldValue,
      changes['trashbox']?.newValue,
    );
    // listener arguments
    const listenerArgs: StorageListenerArguments = {
      ...(Object.keys(tweet).length > 0 && { tweet }),
      ...(Object.keys(trashbox).length > 0 && { trashbox }),
    };
    logger?.debug('listener arguments', listenerArgs);
    // execute listener
    listener(listenerArgs);
  };
};

export const addStorageListener = (listener: OnChangedListener): void => {
  browser.storage.local.onChanged.addListener(listener);
};

const trashboxChanges = (
  oldValue: DeletedTweetID[] | undefined,
  newValue: DeletedTweetID[] | undefined,
): TrashboxChanges => {
  if (oldValue === undefined || oldValue.length === 0) {
    if (newValue === undefined || newValue.length === 0) {
      return {};
    } else {
      return { added: newValue };
    }
  } else if (newValue === undefined || newValue.length === 0) {
    return { deleted: oldValue };
  }
  const changes: Map<
    TweetID,
    { before?: DeletedTweetID; after?: DeletedTweetID }
  > = new Map(
    oldValue.map((deletedTweet) => [
      deletedTweet.tweet_id,
      { before: deletedTweet },
    ]),
  );
  newValue.forEach((deletedTweet) => {
    const change = changes.get(deletedTweet.tweet_id);
    if (change !== undefined) {
      change.after = deletedTweet;
    } else {
      changes.set(deletedTweet.tweet_id, { after: deletedTweet });
    }
  });
  const added: DeletedTweetID[] = [];
  const deleted: DeletedTweetID[] = [];
  const updated: UpdatedDeletedTweetID[] = [];
  for (const [tweetID, { before, after }] of changes.entries()) {
    if (before === undefined) {
      if (after !== undefined) {
        added.push(after);
      }
    } else {
      if (after === undefined) {
        deleted.push(before);
      } else if (before.deleted_at !== after.deleted_at) {
        updated.push({ id: tweetID, before, after });
      }
    }
  }
  return {
    ...(added.length > 0 && { added }),
    ...(deleted.length > 0 && { deleted }),
    ...(updated.length > 0 && { updated }),
  };
};
