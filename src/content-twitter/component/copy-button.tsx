import { arrow, offset, shift, useFloating } from '@floating-ui/react-dom';
import classNames from 'classnames';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import browser from 'webextension-polyfill';
import ScrapboxIcon from '../../icon/scrapbox.svg';
import CloseIcon from '../../icon/x.svg';
import { loggerProvider } from '../../lib/logger';
import { TweetCopyResponseMessage } from '../../lib/message';
import { TweetID } from '../../lib/tweet';
import { toTweetIDKey } from '../../lib/tweet-id-key';
import { State } from '../state';
import { updateAction } from '../state';

const logger = loggerProvider.getCategory('copy-button');

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
  // redux
  const selector = React.useCallback(
    (state: State) => state[toTweetIDKey(tweetID)],
    [tweetID]
  );
  const buttonState = useSelector(selector);
  const dispatch = useDispatch();
  // state
  const [isCopied, setIsCopied] = React.useState(false);
  const [tooltipVisibility, setTooltipVisibility] =
    React.useState<TooltipVisibility>('none');
  const [tooltipMessage, setTooltipMessage] =
    React.useState<TooltipMessage | null>(null);
  // floting
  const arrowRef = React.useRef(null);
  const {
    x,
    y,
    reference,
    floating,
    strategy,
    middlewareData: { arrow: { x: arrowX, y: arrowY } = {} },
  } = useFloating({
    placement: 'top',
    middleware: [offset(10), shift(), arrow({ element: arrowRef })],
  });
  // effect: tooltip visibility
  React.useEffect(() => {
    switch (tooltipVisibility) {
      case 'none':
        break;
      case 'fade-in': {
        const timeoutID = setTimeout(
          () => setTooltipVisibility('visible'),
          200
        );
        return () => clearTimeout(timeoutID);
      }
      case 'visible': {
        if (tooltipMessage?.type === 'notification') {
          const timeoutID = setTimeout(
            () => setTooltipVisibility('fade-out'),
            2000
          );
          return () => clearTimeout(timeoutID);
        }
        break;
      }
      case 'fade-out': {
        const timeoutID = setTimeout(() => setTooltipVisibility('none'), 200);
        return () => clearTimeout(timeoutID);
      }
      default: {
        const _: never = tooltipVisibility;
        return _;
      }
    }
  }, [tooltipVisibility, tooltipMessage?.type]);
  // click: copy button
  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    // send message to background
    logger.info(`[Tweet ID: ${tweetID}] copy request`);
    browser.runtime
      .sendMessage({
        type: 'tweet_copy_request',
        tweetID,
      })
      .then((message: TweetCopyResponseMessage) => {
        if (message.type === 'tweet_copy_response') {
          setIsCopied(message.ok);
          if (message.ok) {
            logger.info(`[tweet ID: ${tweetID}] copy request is succeeded`);
            dispatch(
              updateAction({ tweetIDs: [tweetID], state: { state: 'success' } })
            );
            setTooltipMessage({
              type: 'notification',
              message: 'Copied',
            });
          } else {
            logger.error(
              `[tweet ID: ${tweetID}] copy request is failed with "${message.message}"`
            );
            setTooltipMessage({
              type: 'error',
              message: message.message,
            });
            dispatch(
              updateAction({
                tweetIDs: [tweetID],
                state: { state: 'failure', message: message.message },
              })
            );
          }
          setTooltipVisibility('fade-in');
        }
      });
  };
  // click: tooltip close
  const onTooltipClose = React.useCallback(() => {
    if (tooltipMessage?.type === 'error') {
      setTooltipVisibility('fade-out');
    }
  }, [tooltipMessage?.type]);
  return (
    <div className="copy-button">
      <div
        className="button"
        role="button"
        tabIndex={0}
        onClick={onClick}
        ref={reference}>
        <div className={isCopied ? 'circle-active' : 'circle-inactive'} />
        <ScrapboxIcon
          className="logo"
          viewBox="-29 0 172 172"
          width={undefined}
          height={undefined}
        />
      </div>
      {tooltipVisibility !== 'none' && tooltipMessage !== null ? (
        <div
          className={classNames('tooltip', {
            'fade-in': tooltipVisibility === 'fade-in',
            'fade-out': tooltipVisibility === 'fade-out',
          })}
          ref={floating}
          style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}>
          <TooltipBody
            message={tooltipMessage.message}
            onClose={
              tooltipMessage.type === 'error' ? onTooltipClose : undefined
            }
          />
          <div
            className="arrow"
            ref={arrowRef}
            style={{
              position: strategy,
              top: arrowY !== null ? `${arrowY}px` : '',
              left: arrowX !== null ? `${arrowX}px` : '',
            }}
          />
        </div>
      ) : (
        <></>
      )}
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
        viewBox="0 0 16 16"
        width={undefined}
        height={undefined}
      />
      <span>{message}</span>
    </div>
  );
};