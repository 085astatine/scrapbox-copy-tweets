import split from 'graphemesplit';
import punycode from 'punycode';
import {
  ApiV2Includes,
  MediaObjectV2,
  TweetEntityHashtagV2,
  TweetEntityMentionV2,
  TweetEntityUrlV2,
  TweetV2,
  TweetV2LookupResult,
} from 'twitter-api-v2';
import { CoreLogger } from 'typescript-logging';
import { loggerProvider } from './logger';
import {
  ReferencedTweet,
  Tweet,
  TweetEntity,
  TweetEntityAnnotation,
  TweetEntityCashtag,
  TweetEntityHashtag,
  TweetEntityMedia,
  TweetEntityMention,
  TweetEntityURL,
  TweetID,
  User,
} from './tweet';

const defaultLogger = loggerProvider.getCategory('tweet');

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

export const parseTweets = (
  response: TweetV2LookupResult,
  logger: CoreLogger = defaultLogger
): Tweet[] => {
  logger.debug('parse tweets', response);
  const tweets: Tweet[] = [];
  // .tweet
  response.data.forEach((tweet) =>
    tweets.push(parseTweet(tweet, response.includes, logger))
  );
  // .includes.tweets
  response.includes?.tweets?.forEach((tweet) =>
    tweets.push(parseTweet(tweet, response.includes, logger))
  );
  return tweets;
};

const parseTweet = (
  tweet: TweetV2,
  includes: ApiV2Includes | undefined,
  logger: CoreLogger
): Tweet => {
  logger.debug(`parse tweet ${tweet.id}`);
  const timestamp = parseTimestamp(tweet);
  const author = parseAuthor(tweet, includes);
  const text = parseText(tweet, includes, logger);
  const annotations = parseAnnotations(tweet);
  const referencedTweets = parseReferencedTweets(tweet);
  return {
    id: tweet.id,
    timestamp,
    author,
    text,
    annotations,
    referenced_tweets: referencedTweets,
  };
};

const parseTimestamp = (tweet: TweetV2): number => {
  if (tweet.created_at === undefined) {
    throw new ParseTweetError(tweet.id, 'tweet.created_at is undefined');
  }
  return new Date(tweet.created_at).getTime();
};

const parseAuthor = (
  tweet: TweetV2,
  includes: ApiV2Includes | undefined
): User => {
  // author id
  if (tweet.author_id === undefined) {
    throw new ParseTweetError(tweet.id, 'tweet.author_id is undefined');
  }
  // find user
  const user = includes?.users?.find((user) => user.id === tweet.author_id);
  if (user === undefined) {
    throw new ParseTweetError(
      tweet.id,
      `author_id(${tweet.author_id}) is not found`
    );
  }
  return {
    id: user.id,
    name: user.name,
    username: user.username,
  };
};

interface TweetPosition {
  start: number;
  end: number;
}

interface TweetEntityWithPosition<Entity> extends TweetPosition {
  entity: Entity;
}

type TweetEntityGenerator<ApiEntity extends TweetPosition, Entity> = (
  text: string,
  data: ApiEntity,
  logger: CoreLogger
) => TweetEntityWithPosition<Entity>;

const parseText = (
  tweet: TweetV2,
  includes: ApiV2Includes | undefined,
  logger: CoreLogger
): TweetEntity[] => {
  // text
  const text: TweetEntityWithPosition<TweetEntity>[] = [
    {
      start: 0,
      end: tweet.text.length,
      entity: {
        type: 'text',
        text: tweet.text,
      },
    },
  ];
  // entities.urls
  tweet.entities?.urls?.forEach((url) =>
    splitText(
      text,
      url,
      toTweetEntityURL(tweet.id, includes?.media ?? []),
      logger
    )
  );
  // entities.hashtags
  tweet.entities?.hashtags?.forEach((hashtag) =>
    splitText(text, hashtag, toTweetEntityHashtag, logger)
  );
  // entities.cashtags
  tweet.entities?.cashtags?.forEach((cashtag) =>
    splitText(text, cashtag, toTweetEntityCashtag, logger)
  );
  // entities.mentions
  tweet.entities?.mentions?.forEach((mention) =>
    splitText(text, mention, toTweetEntityMention, logger)
  );
  logger.debug('text entities', text);
  return text.map((entity) => entity.entity);
};

const splitText = <ApiEntity extends TweetPosition>(
  entities: TweetEntityWithPosition<TweetEntity>[],
  entity: ApiEntity,
  generator: TweetEntityGenerator<ApiEntity, TweetEntity>,
  logger: CoreLogger
) => {
  // find the source entity that includes target
  const source = entities.find(
    (source) => source.start <= entity.start && entity.end <= source.end
  );
  if (source === undefined) {
    return;
  }
  const sourceIndex = entities.indexOf(source);
  // check if entity.type is 'text'
  if (source.entity.type !== 'text') {
    logger.warn('the source type is not text', source);
  }
  // split text
  const text = split(source.entity.text);
  const headText = text.slice(0, entity.start - source.start).join('');
  const bodyText = text
    .slice(entity.start - source.start, entity.end - source.start)
    .join('');
  const tailText = text
    .slice(entity.end - source.start, source.end - source.start)
    .join('');
  logger.debug('split text', {
    head: headText,
    body: bodyText,
    tail: tailText,
  });
  // insert entities
  const splittedEntities: TweetEntityWithPosition<TweetEntity>[] = [];
  // head entity
  if (headText.length !== 0) {
    splittedEntities.push({
      entity: {
        type: 'text',
        text: headText,
      },
      start: source.start,
      end: entity.start,
    });
  }
  // body entity
  if (bodyText.length !== 0) {
    splittedEntities.push(generator(bodyText, entity, logger));
  }
  // tail entity
  if (tailText.length !== 0) {
    splittedEntities.push({
      entity: { type: 'text', text: tailText },
      start: entity.end,
      end: source.end,
    });
  }
  entities.splice(sourceIndex, 1, ...splittedEntities);
};

const toTweetEntityURL = (
  tweetID: TweetID,
  media: readonly MediaObjectV2[]
): TweetEntityGenerator<
  TweetEntityUrlV2,
  TweetEntityURL | TweetEntityMedia
> => {
  return (
    text: string,
    entity: TweetEntityUrlV2
  ): TweetEntityWithPosition<TweetEntityURL | TweetEntityMedia> => {
    // position
    const position = {
      start: entity.start,
      end: entity.end,
    };
    // media
    // @ts-expect-error TweetEntityUrlV2.media_key is not defined
    const mediaKey: string | undefined = entity.media_key;
    if (mediaKey !== undefined) {
      const medium = media.find((medium) => medium.media_key === mediaKey);
      if (medium === undefined) {
        throw new ParseTweetError(
          tweetID,
          `media_key(${mediaKey}) is not found`
        );
      }
      if (medium.type === 'photo' && medium.url === undefined) {
        throw new ParseTweetError(
          tweetID,
          `url is not defined at photo media(media_key=${mediaKey})`
        );
      }
      return {
        entity: {
          type: 'media',
          text,
          media_key: mediaKey,
          media_type: medium.type,
          url: medium.url,
        },
        ...position,
      };
    }
    // url
    return {
      entity: {
        type: 'url',
        text,
        url: entity.expanded_url,
        display_url: entity.display_url,
        decoded_url: decodeURL(entity.expanded_url),
        title: entity.title,
        description: entity.description,
      },
      ...position,
    };
  };
};

const decodeURL = (url: string): string => {
  const host = new URL(url).host;
  return decodeURI(url).replace(host, punycode.toUnicode(host));
};

const toTweetEntityHashtag: TweetEntityGenerator<
  TweetEntityHashtagV2,
  TweetEntityHashtag
> = (
  text: string,
  entity: TweetEntityHashtagV2
): TweetEntityWithPosition<TweetEntityHashtag> => {
  return {
    entity: {
      type: 'hashtag',
      text,
      tag: entity.tag,
    },
    start: entity.start,
    end: entity.end,
  };
};

const toTweetEntityCashtag: TweetEntityGenerator<
  TweetEntityHashtagV2,
  TweetEntityCashtag
> = (
  text: string,
  entity: TweetEntityHashtagV2
): TweetEntityWithPosition<TweetEntityCashtag> => {
  return {
    entity: {
      type: 'cashtag',
      text,
      tag: entity.tag,
    },
    start: entity.start,
    end: entity.end,
  };
};

const toTweetEntityMention: TweetEntityGenerator<
  TweetEntityMentionV2,
  TweetEntityMention
> = (
  text: string,
  entity: TweetEntityMentionV2
): TweetEntityWithPosition<TweetEntityMention> => {
  return {
    entity: {
      type: 'mention',
      text,
      user_id: entity.id,
      username: entity.username,
    },
    start: entity.start,
    end: entity.end,
  };
};

const parseAnnotations = (
  tweet: TweetV2
): TweetEntityAnnotation[] | undefined => {
  const text = split(tweet.text);
  return tweet.entities?.annotations?.map((annotation) => ({
    type: 'annotation',
    text: text.slice(annotation.start, annotation.end + 1).join(''),
    probability: annotation.probability,
    annotation_type: annotation.type,
    normalized_text: annotation.normalized_text,
  }));
};

const parseReferencedTweets = (
  tweet: TweetV2
): ReferencedTweet[] | undefined => {
  return tweet.referenced_tweets?.map((referenced) => ({
    type: referenced.type,
    id: referenced.id,
  }));
};
