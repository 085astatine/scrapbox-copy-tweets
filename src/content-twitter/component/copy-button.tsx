import {
  FloatingArrow,
  arrow,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react';
import classNames from 'classnames';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import browser from 'webextension-polyfill';
import CloseIcon from '~/icon/bootstrap/x.svg';
import ScrapboxIcon from '~/icon/scrapbox.svg';
import { createLogger } from '~/lib/logger';
import {
  SaveTweetRequestMessage,
  SaveTweetResponseMessage,
} from '~/lib/message';
import { toTweetIDKey } from '~/lib/storage/tweet-id-key';
import { TweetID } from '~/lib/tweet/tweet';
import { parseTweet } from '../lib/parse-tweet';
import { State, actions } from '../store';

type TooltipType = 'notification' | 'error';
type TooltipVisibility = 'none' | 'fade-in' | 'visible' | 'fade-out';

interface TooltipMessage {
  type: TooltipType;
  message: string;
}

export interface CopyButtonProps {
  tweetID: TweetID;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ tweetID }) => {
  // logger
  const logger = createLogger({ prefix: `[Tweet ID: ${tweetID}] ` });
  // ref
  const ref = React.useRef<HTMLDivElement>(null);
  // redux
  const selector = React.useCallback(
    (state: State) => state[toTweetIDKey(tweetID)],
    [tweetID],
  );
  const buttonState = useSelector(selector);
  const dispatch = useDispatch();
  // floting
  const arrowRef = React.useRef(null);
  const { refs, floatingStyles, context } = useFloating({
    placement: 'top',
    middleware: [offset(10), shift(), arrow({ element: arrowRef })],
  });
  // state
  const [isClicked, setIsClicked] = React.useState(false);
  const [tooltipVisibility, setTooltipVisibility] =
    React.useState<TooltipVisibility>('none');
  // tooltip
  const tooltipMessage: TooltipMessage | null =
    !isClicked ? null
    : buttonState.state === 'success' ?
      { type: 'notification', message: 'Copied' }
    : buttonState.state === 'failure' ?
      { type: 'error', message: buttonState.message }
    : null;
  if (tooltipMessage !== null && tooltipVisibility === 'none') {
    setTooltipVisibility('fade-in');
  }
  // effect: tooltip visibility
  React.useEffect(() => {
    switch (tooltipVisibility) {
      case 'none':
        break;
      case 'fade-in': {
        const timeoutID = setTimeout(
          () => setTooltipVisibility('visible'),
          200,
        );
        return () => clearTimeout(timeoutID);
      }
      case 'visible': {
        if (tooltipMessage?.type === 'notification') {
          const timeoutID = setTimeout(
            () => setTooltipVisibility('fade-out'),
            2000,
          );
          return () => clearTimeout(timeoutID);
        }
        break;
      }
      case 'fade-out': {
        const timeoutID = setTimeout(() => {
          setIsClicked(false);
          setTooltipVisibility('none');
        }, 200);
        return () => clearTimeout(timeoutID);
      }
      default: {
        const _: never = tooltipVisibility;
        return _;
      }
    }
  }, [tooltipVisibility, tooltipMessage?.type]);
  // click: copy button
  const onClick = async (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    // set state
    setIsClicked(true);
    dispatch(actions.update({ tweetID, state: { state: 'in-progress' } }));
    // parse tweet
    if (!ref?.current) {
      logger.warn('reference to DOM is null');
      return;
    }
    const tweet = await parseTweet(tweetID, ref.current, logger).catch(
      (error) => {
        logger.warn('failed to parse tweet', error);
        dispatch(
          actions.update({
            tweetID,
            state: { state: 'failure', message: error.message },
          }),
        );
        return null;
      },
    );
    logger.info('tweet', tweet);
    if (tweet === null) {
      return;
    }
    // send message to background
    logger.info('save request');
    const request: SaveTweetRequestMessage = {
      type: 'SaveTweet/Request',
      tweet,
    };
    const response: SaveTweetResponseMessage =
      await browser.runtime.sendMessage(request);
    logger.debug('response', response);
    if (response?.type === 'SaveTweet/Response') {
      if (response.ok) {
        dispatch(actions.update({ tweetID, state: { state: 'success' } }));
      } else {
        dispatch(
          actions.update({
            tweetID,
            state: { state: 'failure', message: response.error },
          }),
        );
      }
    }
  };
  // click: tooltip close
  const onTooltipClose = React.useCallback(() => {
    if (tooltipMessage?.type === 'error') {
      setTooltipVisibility('fade-out');
    }
  }, [tooltipMessage?.type]);
  return (
    <div className="copy-button" ref={ref}>
      <div
        className="button"
        role="button"
        tabIndex={0}
        onClick={onClick}
        ref={refs.setReference}>
        <div
          className={classNames({
            'circle-inactive': ['none', 'error'].includes(buttonState.state),
            'circle-in-progress': buttonState.state === 'in-progress',
            'circle-active': buttonState.state === 'success',
          })}
        />
        <ScrapboxIcon
          className="logo"
          viewBox="-29 0 172 172"
          width={undefined}
          height={undefined}
        />
      </div>
      {tooltipVisibility !== 'none' && tooltipMessage !== null ?
        <div
          className={classNames('tooltip', {
            'fade-in': tooltipVisibility === 'fade-in',
            'fade-out': tooltipVisibility === 'fade-out',
          })}
          ref={refs.setFloating}
          style={floatingStyles}>
          <TooltipBody
            message={tooltipMessage.message}
            {...(tooltipMessage.type === 'error' ?
              { onClose: onTooltipClose }
            : {})}
          />
          <FloatingArrow className="arrow" ref={arrowRef} context={context} />
        </div>
      : <></>}
    </div>
  );
};

interface TooltipBodyProps {
  message: string;
  onClose?: () => void;
}

const TooltipBody: React.FC<TooltipBodyProps> = ({
  message,
  onClose = null,
}) => {
  if (onClose === null) {
    return <>{message}</>;
  }
  return (
    <div className="body">
      <CloseIcon
        className="close-button"
        onClick={onClose}
        role="button"
        tabIndex={0}
        width={undefined}
        height={undefined}
      />
      <span>{message}</span>
    </div>
  );
};
