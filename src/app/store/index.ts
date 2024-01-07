import { configureStore } from '@reduxjs/toolkit';
import { Middleware } from 'redux';
import { createLogger } from 'redux-logger';
import { defaultSettings } from '~/lib/settings';
import { loadSettings } from '~/lib/storage/settings';
import { loadTrashbox, loadTweetsNotInTrashbox } from '~/lib/storage/trashbox';
import { settings, settingsActions } from './settings';
import { tweet, tweetActions } from './tweet';

// store
const middlewares: Middleware[] = [];

if (process.env.NODE_ENV === 'development') {
  middlewares.push(
    // @ts-expect-error @types/redux-logger depends on redux 4.x
    createLogger({
      collapsed: true,
      diff: true,
    }),
  );
}

export const store = configureStore({
  reducer: {
    tweet: tweet.reducer,
    settings: settings.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(...middlewares),
});

export type Store = typeof store;

export type State = ReturnType<typeof store.getState>;

export const actions = {
  tweet: tweetActions,
  settings: settingsActions,
} as const;

// Initialize store with data loaded from storage
export const initializeStoreWithStorage = async (): Promise<void> => {
  const tweets = await loadTweetsNotInTrashbox();
  const trashbox = await loadTrashbox();
  const settings = (await loadSettings()) ?? defaultSettings();
  store.dispatch(actions.tweet.initialize({ tweets, trashbox }));
  store.dispatch(actions.settings.initialize(settings));
};
