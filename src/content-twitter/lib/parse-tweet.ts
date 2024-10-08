import browser from 'webextension-polyfill';
import { getElement, getElements, getNode, getNodes } from '~/lib/dom';
import { type Logger, logger as defaultLogger } from '~/lib/logger';
import {
  type ExpandTCoURLRequestMessage,
  type GetURLTitleRequestMessage,
  isExpandTCoURLResultMessage,
  isGetURLTitleResultMessage,
} from '~/lib/message';
import type {
  Media,
  MediaPhoto,
  MediaVideo,
  Tweet,
  TweetEntity,
  TweetEntityURL,
  TweetID,
  User,
} from '~/lib/tweet/types';
import { decodeURL, formatTwimgURL, isTCoURL } from '~/lib/url';
import { ParseTweetError } from './error';
import { parseTweetText } from './parse-tweet-text';
import { isInQuotedTweet } from './tweet';

export const parseTweet = async (
  id: TweetID,
  element: Element,
  savedAt: number,
  logger: Logger = defaultLogger,
): Promise<Tweet | null> => {
  const tweet = getElement('ancestor::article[@data-testid="tweet"]', element);
  logger.debug('tweet element', tweet);
  if (tweet === null) {
    const error = '<article data-testid="tweet"> is not found';
    logger.warn(error);
    throw new ParseTweetError(id, error);
  }
  // Tweet.created_at
  const createdAt = parseTimestamp(tweet, logger);
  logger.debug('Tweet.created_at', createdAt);
  if (createdAt === null) {
    const error = 'Failed to parse Tweet.created_at';
    logger.warn(error);
    throw new ParseTweetError(id, error);
  }
  // Tweet.author
  const author = parseUser(tweet, logger);
  logger.debug('Tweet.author', author);
  if (author === null) {
    const error = 'Falied to parse Tweet.author';
    logger.warn(error);
    throw new ParseTweetError(id, error);
  }
  // Tweet.text
  const text = await parseTweetText(tweet, logger);
  await parseCard(tweet, text, logger);
  logger.debug('Tweet.text', text);
  const result: Tweet = {
    id,
    created_at: createdAt,
    saved_at: savedAt,
    author,
    text,
  };
  // media
  const media = parseMedia(tweet, logger);
  logger.debug('Tweet.media', media);
  if (media.length) {
    result.media = media;
  }
  return result;
};

const parseTimestamp = (tweet: Element, logger: Logger): number | null => {
  const datetime = getNode('.//a/time/@datetime', tweet);
  logger.debug('datetime attribute', datetime);
  if (datetime === null) {
    logger.warn('<time datetime="..."> is not found');
    return null;
  }
  const milliseconds = Date.parse(datetime.textContent ?? '');
  if (isNaN(milliseconds)) {
    logger.warn(`Faild to parses "${datetime}" as Date`);
  }
  return Math.trunc(milliseconds / 1000);
};

const parseUser = (tweet: Element, logger: Logger): User | null => {
  const element = getElement('.//div[@data-testid="User-Name"]', tweet);
  logger.debug('User element', element);
  if (element === null) {
    logger.warn('<div data-testid="User-Name"> is not found');
    return null;
  }
  const name = parseUserName(element, logger);
  const username = parseUserUsername(element, logger);
  if (name === null || username === null) {
    logger.warn('Failed to parse as User', element);
    return null;
  }
  return { name, username };
};

const parseUserName = (user: Element, logger: Logger): string | null => {
  const element = getElement('./div[1]//a', user);
  logger.debug('User.name', element);
  if (element === null) {
    logger.warn('User.name is not found');
    return null;
  }
  // traverse DOM tree
  return traverseUserName(element);
};

const traverseUserName = (element: Element): string => {
  if (element.childElementCount === 0) {
    if (element.tagName === 'SPAN') {
      return element.textContent ?? '';
    } else if (element.tagName === 'IMG') {
      return element.getAttribute('alt') ?? '';
    }
    return '';
  } else {
    return [...element.children]
      .map((child) => traverseUserName(child))
      .join('');
  }
};

const parseUserUsername = (user: Element, logger: Logger): string | null => {
  const element = getElement('./div[2]/div/div[1]//a', user);
  logger.debug('User.username', element);
  if (element === null) {
    logger.warn('User.username is not found');
    return null;
  }
  const username = element.textContent;
  if (username === null) {
    return null;
  }
  return username.replace(/^@/, '');
};

const parseMedia = (tweet: Element, logger: Logger): Media[] => {
  const elements = getElements(
    './/div[@data-testid="tweetPhoto"]',
    tweet,
  ).filter((element) => !isInQuotedTweet(element));
  logger.debug('Media elements', elements);
  const result: Media[] = [];
  for (const element of elements) {
    switch (mediaType(element)) {
      case 'photo': {
        const photo = parseMediaPhoto(element, logger);
        logger.debug('MediaPhoto', photo);
        if (photo !== null) {
          result.push(photo);
        }
        break;
      }
      case 'video': {
        const video = parseMediaVideo(element, logger);
        logger.debug('MediaVideo', video);
        if (video !== null) {
          result.push(video);
        }
        break;
      }
      default:
        logger.warn('unknown media type', element);
    }
  }
  return result;
};

const mediaType = (element: Element): Media['type'] | null => {
  if (element.getAttribute('data-testid') === 'tweetPhoto') {
    if (getElement('.//div[@data-testid="videoPlayer"]', element) !== null) {
      return 'video';
    }
    return 'photo';
  }
  return null;
};

const parseMediaPhoto = (
  element: Element,
  logger: Logger,
): MediaPhoto | null => {
  const src = getNode('.//img/@src', element);
  logger.debug('MediaPhoto <img src="...">', src);
  if (src === null) {
    logger.warn('<img src="..."> is not found in MediaPhoto');
    return null;
  }
  return { type: 'photo', url: formatTwimgURL(src.textContent ?? '') };
};

const parseMediaVideo = (
  element: Element,
  logger: Logger,
): MediaVideo | null => {
  const poster = getNode('.//video/@poster', element);
  logger.debug('MediaVideo <video poster="...">', poster);
  if (poster === null) {
    logger.warn('<video poster="..."> is not found in MediaVideo');
    return null;
  }
  return { type: 'video', thumbnail: poster.textContent ?? '' };
};

const parseCard = async (
  tweet: Element,
  text: TweetEntity[],
  logger: Logger,
): Promise<void> => {
  const root = getElement('.//div[div[@data-testid="card.wrapper"]]', tweet);
  logger.debug('card root', root);
  if (root === null) {
    return;
  }
  // URLs in tweet text
  const textURLs = text.reduce<string[]>((urls, entity) => {
    if (entity.type === 'url') {
      urls.push(entity.short_url, entity.expanded_url);
    }
    return urls;
  }, []);
  // hrefs in card
  const hrefs = getNodes('.//a/@href', root).reduce<string[]>((hrefs, node) => {
    const href = node.textContent;
    if (href && !hrefs.includes(href) && !textURLs.includes(href)) {
      hrefs.push(href);
    }
    return hrefs;
  }, []);
  if (!hrefs.length) {
    return;
  }
  // href to tweetEntityURL
  const urls = await Promise.all(
    hrefs.map(async (href) => await toEntityURL(href, logger)),
  );
  // insert newline
  const lastText = text[text.length - 1];
  if (lastText?.type === 'text' && !lastText.text.endsWith('\n')) {
    lastText.text += '\n';
  } else {
    text.push({ type: 'text', text: '\n' });
  }
  // append to text
  text.push(...urls);
};

const toEntityURL = async (
  href: string,
  logger: Logger,
): Promise<TweetEntityURL> => {
  // check if the href is https://t.co/...
  if (!isTCoURL(href)) {
    // request url title
    const request: GetURLTitleRequestMessage = {
      type: 'GetURLTitle/Request',
      url: href,
    };
    const title = await browser.runtime
      .sendMessage(request)
      .then((response: unknown) => {
        logger.debug('Response to request', response);
        if (isGetURLTitleResultMessage(response)) {
          if (response?.ok) {
            return response.title;
          }
        }
        return null;
      });
    return {
      type: 'url',
      text: '',
      short_url: href,
      expanded_url: href,
      decoded_url: decodeURL(href),
      ...(title !== null && { title }),
    };
  }
  // request expand https://t.co/...
  const request: ExpandTCoURLRequestMessage = {
    type: 'ExpandTCoURL/Request',
    shortURL: href,
  };
  logger.debug('Request to expand t.co URL', request);
  const { expandedURL, title } = await browser.runtime
    .sendMessage(request)
    .then((response: unknown) => {
      logger.debug('Response to request', response);
      if (isExpandTCoURLResultMessage(response)) {
        if (response?.ok) {
          const { expandedURL, title } = response;
          return { expandedURL, title };
        }
      } else {
        logger.warn('Unexpected response message', response);
      }
      return { expandedURL: href };
    });
  return {
    type: 'url',
    text: '',
    short_url: href,
    expanded_url: expandedURL,
    decoded_url: decodeURL(expandedURL),
    ...(title !== undefined && { title }),
  };
};
