import { createSelector, weakMapMemoize } from '@reduxjs/toolkit';
import type { TweetID } from '~/lib/tweet/types';
import type { State } from '.';
import type { ScrapboxButtonState, TweetState } from './tweet';

export const selectScrapboxButtonState = createSelector(
  [
    (state: State): TweetState[] => state.tweet,
    (state: State, tweetID: TweetID): TweetID => tweetID,
  ],
  (state: TweetState[], tweetID: TweetID): ScrapboxButtonState => {
    const tweet = state.find((tweetState) => tweetState.tweetID === tweetID);
    if (tweet !== undefined) {
      return tweet.button;
    }
    return { state: 'none' };
  },
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);
