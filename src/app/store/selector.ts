import { createSelector, weakMapMemoize } from '@reduxjs/toolkit';
import { type Hostname, baseURL } from '~/lib/settings';
import { type TrashboxSort, deletedTimes } from '~/lib/trashbox';
import { tweetSortFunction } from '~/lib/tweet/sort-tweets';
import type {
  TextTemplateKey,
  TweetTemplate,
} from '~/lib/tweet/tweet-template';
import type { TweetToStringOption } from '~/lib/tweet/tweet-to-string';
import type {
  DeletedTweet,
  SortOrder,
  Tweet,
  TweetID,
  TweetSort,
} from '~/lib/tweet/types';
import type { State } from '.';
import type {
  EditingTweetTemplate,
  TemplateErrors,
  UpdateTrigger,
} from './settings';

// types
export type EditStatus = 'none' | 'updated' | 'invalid';

// tweets
export const selectTweetSort = (state: State): TweetSort => {
  return state.tweet.tweetSort;
};

export const selectTweets = createSelector(
  [(state: State): Tweet[] => state.tweet.tweets, selectTweetSort],
  (tweets: Tweet[], sort: TweetSort): Tweet[] => {
    return fallbackToEmptyArray([...tweets].sort(tweetSortFunction(sort)));
  },
);

export const selectTweetsSize = createSelector(
  [(state: State): Tweet[] => state.tweet.tweets],
  (tweets: Tweet[]): number => tweets.length,
);

export const selectIsSelectedTweet = createSelector(
  [
    (state: State): Tweet[] => state.tweet.selectedTweets,
    (state: State, tweetID: TweetID): TweetID => tweetID,
  ],
  (selectedTweets: Tweet[], tweetID: TweetID): boolean => {
    return selectedTweets.some((tweet) => tweet.id === tweetID);
  },
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

export const selectSelectedTweets = createSelector(
  [(state: State): Tweet[] => state.tweet.selectedTweets, selectTweetSort],
  (selectedTweets: Tweet[], sort: TweetSort): Tweet[] => {
    return fallbackToEmptyArray(
      [...selectedTweets].sort(tweetSortFunction(sort)),
    );
  },
);

export const selectAllTweetsSelectButtonState = createSelector(
  [
    (state: State): Tweet[] => state.tweet.tweets,
    (state: State): Tweet[] => state.tweet.selectedTweets,
  ],
  (
    tweets: Tweet[],
    selected: Tweet[],
  ): 'disabled' | 'checked' | 'unchecked' => {
    return (
      tweets.length === 0 ? 'disabled'
      : tweets.every((tweet) => selected.includes(tweet)) ? 'checked'
      : 'unchecked'
    );
  },
);

// trashbox
export const selectTrashboxSort = (state: State): TrashboxSort => {
  return state.tweet.trashboxSort;
};

export const selectDeletedTimes = createSelector(
  [
    (state: State): DeletedTweet[] => state.tweet.trashbox,
    (state: State): SortOrder => state.tweet.trashboxSort.order,
  ],
  (trashbox: DeletedTweet[], order: SortOrder) => {
    return fallbackToEmptyArray(deletedTimes(trashbox, order));
  },
);

export const selectTrashboxSize = createSelector(
  [(state: State): DeletedTweet[] => state.tweet.trashbox],
  (trashbox: DeletedTweet[]): number => trashbox.length,
);

export const selectDeletedTweets = createSelector(
  [
    (state: State): DeletedTweet[] => state.tweet.trashbox,
    (state: State, deletedTime: number): number => deletedTime,
  ],
  (trashbox: DeletedTweet[], deletedTime: number): Tweet[] => {
    return fallbackToEmptyArray(
      trashbox
        .filter((deletedTweet) => deletedTweet.deleted_at === deletedTime)
        .map((deletedTweet) => deletedTweet.tweet)
        .sort(tweetSortFunction({ key: 'created_time', order: 'asc' })),
    );
  },
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

export const selectIsDeletedTweetSelected = createSelector(
  [
    (state: State): Tweet[] => state.tweet.selectedDeletedTweets,
    (state: State, tweetID: TweetID): TweetID => tweetID,
  ],
  (selected: Tweet[], tweetID: TweetID): boolean => {
    return selected.some((tweet) => tweet.id === tweetID);
  },
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

export const selectIsAllDeletedTweetsSelected = createSelector(
  [
    selectDeletedTweets,
    (state: State): Tweet[] => state.tweet.selectedDeletedTweets,
  ],
  (tweets: Tweet[], selected: Tweet[]): boolean => {
    return (
      tweets.length > 0 && tweets.every((tweet) => selected.includes(tweet))
    );
  },
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

export const selectSelectedDeletedTweets = (state: State): Tweet[] => {
  return state.tweet.selectedDeletedTweets;
};

export const selectAllTrashboxSelectButtonState = createSelector(
  [
    (state: State): DeletedTweet[] => state.tweet.trashbox,
    (state: State): Tweet[] => state.tweet.selectedDeletedTweets,
  ],
  (
    trashbox: DeletedTweet[],
    selected: Tweet[],
  ): 'disabled' | 'checked' | 'unchecked' => {
    const deletedTweets = trashbox.map((deletedTweet) => deletedTweet.tweet);
    return (
      deletedTweets.length === 0 ? 'disabled'
      : deletedTweets.every((tweet) => selected.includes(tweet)) ? 'checked'
      : 'unchecked'
    );
  },
);

// settings: current
export const selectHostname = (state: State): Hostname => {
  return state.settings.currentSettings.hostname;
};

export const selectTimezone = (state: State): string => {
  return state.settings.currentSettings.timezone;
};

export const selectDatetimeFormat = (state: State): string => {
  return state.settings.currentSettings.datetimeFormat;
};

// settings: editings
export const selectEditingHostname = (state: State): Hostname | undefined => {
  return state.settings.editingSettings.hostname;
};

export const selectEditingTimezone = (state: State): string | undefined => {
  return state.settings.editingSettings.timezone;
};

export const selectEditingDatetimeFormat = (
  state: State,
): string | undefined => {
  return state.settings.editingSettings.datetimeFormat;
};

// settings: error
export const selectHostnameErrors = (state: State): string[] => {
  return fallbackToEmptyArray(state.settings.settingsErrors.hostname ?? []);
};

export const selectTimezoneErrors = (state: State): string[] => {
  return fallbackToEmptyArray(state.settings.settingsErrors.timezone ?? []);
};

export const selectDatetimeFormatErrors = (state: State): string[] => {
  return fallbackToEmptyArray(
    state.settings.settingsErrors.datetimeFormat ?? [],
  );
};

// tweet-template: currnt
export const selectTemplate = <Key extends keyof TweetTemplate>(
  state: State,
  key: Key,
): TweetTemplate[Key] => {
  return state.settings.currentTemplate[key];
};

// tweet-template: editing
export const selectEditingTemplate = <Key extends keyof TweetTemplate>(
  state: State,
  key: Key,
): TweetTemplate[Key] | undefined => {
  return state.settings.editingTemplate[key];
};

// tweet-template: error
export const selectTemplateError = <Key extends keyof TweetTemplate>(
  state: State,
  key: Key,
): string[] => {
  return fallbackToEmptyArray(state.settings.templateErrors[key] ?? []);
};

// settings update trigger
export const selectSettingsUpdateTrigger = (state: State): UpdateTrigger => {
  return state.settings.updateTrigger;
};

// settings editor
export const selectSettingsEditStatus = createSelector(
  [
    (state: State): boolean =>
      Object.keys(state.settings.editingSettings).length > 0,
    (state: State): boolean =>
      Object.keys(state.settings.settingsErrors).length > 0,
  ],
  (isUpdated: boolean, hasError: boolean): EditStatus => {
    return (
      hasError ? 'invalid'
      : isUpdated ? 'updated'
      : 'none'
    );
  },
);

// template edtor
export const selectTemplateEditStatus = createSelector(
  [
    (state: State): boolean =>
      Object.keys(state.settings.editingTemplate).length > 0,
    (state: State): boolean =>
      Object.keys(state.settings.templateErrors).length > 0,
  ],
  (isUpdated: boolean, hasError: boolean): EditStatus => {
    return (
      hasError ? 'invalid'
      : isUpdated ? 'updated'
      : 'none'
    );
  },
);

const templateEntityKeys: ReadonlyArray<TextTemplateKey> = [
  'entityText',
  'entityUrl',
  'entityHashtag',
  'entityCashtag',
  'entityMention',
] as const;
export const selectTemplateEntitiesEditStatus = createSelector(
  [
    (state: State): EditingTweetTemplate => state.settings.editingTemplate,
    (state: State): TemplateErrors => state.settings.templateErrors,
  ],
  (editing: EditingTweetTemplate, errors: TemplateErrors): EditStatus => {
    const isUpdated = !templateEntityKeys.every((key) => !(key in editing));
    const hasError = !templateEntityKeys.every((key) => !(key in errors));
    return (
      hasError ? 'invalid'
      : isUpdated ? 'updated'
      : 'none'
    );
  },
);

const templateMediaKeys: ReadonlyArray<TextTemplateKey> = [
  'mediaPhoto',
  'mediaVideo',
] as const;
export const selectTemplateMediaEditStatus = createSelector(
  [
    (state: State): EditingTweetTemplate => state.settings.editingTemplate,
    (state: State): TemplateErrors => state.settings.templateErrors,
  ],
  (editing: EditingTweetTemplate, errors: TemplateErrors): EditStatus => {
    const isUpdated = !templateMediaKeys.every((key) => !(key in editing));
    const hasError = !templateMediaKeys.every((key) => !(key in errors));
    return (
      hasError ? 'invalid'
      : isUpdated ? 'updated'
      : 'none'
    );
  },
);

// depend on settings
export const selectIsSettingsEdited = (state: State): boolean => {
  return (
    Object.keys(state.settings.editingSettings).length > 0 ||
    Object.keys(state.settings.editingTemplate).length > 0
  );
};

export const selectBaseURL = createSelector(
  [selectHostname],
  (hostname: Hostname): string => {
    return baseURL(hostname);
  },
);

export const selectTweetToStringOption = createSelector(
  [selectHostname, selectTimezone, selectDatetimeFormat],
  (
    hostname: Hostname,
    timezone: string,
    datetimeFormat: string,
  ): TweetToStringOption => {
    return { hostname, timezone, datetimeFormat };
  },
);

// utilities
const EMPTY_ARRAY: [] = [];

const fallbackToEmptyArray = <T>(array: T[]): T[] => {
  return array.length === 0 ? EMPTY_ARRAY : array;
};
