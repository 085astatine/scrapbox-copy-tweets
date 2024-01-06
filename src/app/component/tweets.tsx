import classNames from 'classnames';
import React from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import ClipboardIcon from '~/icon/bootstrap/clipboard.svg';
import TrashboxIcon from '~/icon/google-fonts/delete.svg';
import { Collapse } from '~/lib/component/transition';
import { addTweetsToTrashbox } from '~/lib/storage/trashbox';
import {
  SortOrder,
  TweetSort,
  TweetSortKey,
  tweetSortFunction,
} from '~/lib/tweet/sort-tweets';
import { Tweet as TweetData } from '~/lib/tweet/tweet';
import { trimGoogleFontsIcon } from '~/lib/utility';
import { State, actions } from '../store';
import { Checkbox } from './checkbox';
import { Tweet as TweetInfo } from './tweet';

export const Tweets: React.FC = () => {
  const tweets = useSelector(tweetsSelector, shallowEqual);
  return (
    <>
      <div className="tweets fade-in">
        <Toolbar />
        {tweets.map((tweet) => (
          <Tweet key={tweet.id} tweet={tweet} />
        ))}
      </div>
      <Commands />
    </>
  );
};

interface TweetProps {
  tweet: TweetData;
}

const Tweet: React.FC<TweetProps> = ({ tweet }: TweetProps) => {
  const selector = React.useCallback(
    (state: State) => state.selectedTweets.includes(tweet),
    [tweet],
  );
  const isSelected = useSelector(selector);
  const dispatch = useDispatch();
  // select
  const select = () => {
    if (isSelected) {
      dispatch(actions.unselectTweet(tweet));
    } else {
      dispatch(actions.selectTweet(tweet));
    }
  };
  return (
    <div className="item">
      <Checkbox checked={isSelected} onClick={select} />
      <TweetInfo tweet={tweet} />
    </div>
  );
};

const Toolbar: React.FC = () => {
  return (
    <div className="toolbar">
      <SelectAll />
      <SelectSort />
    </div>
  );
};

const SelectAll: React.FC = () => {
  const id = 'select-all-tweets';
  const state = useSelector(selectAllStateSelector);
  const dispatch = useDispatch();
  // select
  const select = () => {
    if (state === 'checked') {
      dispatch(actions.unselectAllTweets());
    } else if (state === 'unchecked') {
      dispatch(actions.selectAllTweets());
    }
  };
  return (
    <div className="tool">
      <Checkbox
        id={id}
        disabled={state === 'disabled'}
        checked={state === 'checked'}
        onClick={select}
      />
      <label
        className={classNames('tool-label', { disabled: state === 'disabled' })}
        htmlFor={id}>
        All Tweets
      </label>
    </div>
  );
};

const SelectSort: React.FC = () => {
  const id = 'select-tweets-sort';
  const { key: sortKey, order: sortOrder } = useSelector(tweetSortSelector);
  const dispatch = useDispatch();
  // options
  const options: ReadonlyArray<readonly [TweetSortKey, SortOrder, string]> = [
    ['created_time', 'desc', 'Posted Time (Newest → Oldest)'],
    ['created_time', 'asc', 'Posted Time (Oldest → Newest)'],
    ['saved_time', 'desc', 'Saved Time (Newest → Oldest)'],
    ['saved_time', 'asc', 'Saved Time (Oldest → Newest)'],
    ['username', 'asc', 'Username (@A → @Z)'],
    ['username', 'desc', 'Username (@Z → @A)'],
  ];
  // event
  const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const [key, order] = options[event.target.selectedIndex];
    dispatch(actions.updateTweetSort({ key, order }));
  };
  return (
    <div className="tool">
      <label className="tool-label" htmlFor={id}>
        Order by
      </label>
      <select
        className="form-select"
        id={id}
        value={options.findIndex(
          ([key, order]) => key === sortKey && order === sortOrder,
        )}
        onChange={onChange}>
        {options.map((option, index) => (
          <option key={index} value={index}>
            {option[2]}
          </option>
        ))}
      </select>
    </div>
  );
};

const Commands: React.FC = () => {
  const ref = React.useRef(null);
  const tweets = useSelector(selectedTweetsSelector, shallowEqual);
  const dispatch = useDispatch();
  // clipboard
  const copyToClipboard = () => {
    // TODO: copy to clipboard
    moveToTrashbox();
  };
  // move to trashbox
  const moveToTrashbox = () => {
    const timestamp = Math.trunc(Date.now() / 1000);
    // store
    dispatch(actions.moveToTrashbox(timestamp));
    // storage
    addTweetsToTrashbox(tweets, timestamp);
  };
  return (
    <Collapse
      nodeRef={ref}
      in={tweets.length > 0}
      duration={300}
      mountOnEnter
      unmountOnExit
      target={
        <div ref={ref}>
          <div className="commands fade-in">
            <button className="command" onClick={copyToClipboard}>
              <ClipboardIcon
                className="icon"
                width={undefined}
                height={undefined}
              />
            </button>
            <button className="command" onClick={moveToTrashbox}>
              <TrashboxIcon
                className="icon"
                viewBox={trimGoogleFontsIcon(200)}
                width={undefined}
                height={undefined}
                fill="currentColor"
              />
            </button>
          </div>
        </div>
      }
    />
  );
};

// Selectors
const tweetsSelector = (state: State): TweetData[] => {
  const tweets = [...state.tweets];
  tweets.sort(tweetSortFunction(state.settings.tweetSort));
  return tweets;
};

const selectedTweetsSelector = (state: State): TweetData[] => {
  const selectedTweets = [...state.selectedTweets];
  selectedTweets.sort(tweetSortFunction(state.settings.tweetSort));
  return selectedTweets;
};

const selectAllStateSelector = (
  state: State,
): 'disabled' | 'checked' | 'unchecked' =>
  state.tweets.length === 0 ? 'disabled'
  : state.tweets.every((tweet) => state.selectedTweets.includes(tweet)) ?
    'checked'
  : 'unchecked';

const tweetSortSelector = (state: State): TweetSort => state.settings.tweetSort;
