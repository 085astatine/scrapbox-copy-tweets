import {
  Tweet,
  TweetEntity,
  TweetEntityCashtag,
  TweetEntityHashtag,
  TweetEntityMention,
  TweetEntityText,
  TweetEntityURL,
} from './tweet';
import { toDate } from './tweet-date';
import {
  EntityCashtagField,
  EntityHashtagField,
  EntityMentionField,
  EntityTextField,
  EntityURLField,
  ParsedTweetTemplate,
  TemplateElement,
  TweetField,
  TweetTemplate,
  parseTweetTemplate,
} from './tweet-template';

export const tweetToString = (
  tweet: Tweet,
  template: TweetTemplate,
): string => {
  const parsedTemplate = parseTweetTemplate(template);
  const filledOutTemplate = parsedTemplate.tweet
    .map((element) => fillTweetTemplateElement(element, tweet, parsedTemplate))
    .join('');
  return filledOutTemplate;
};

const fillTweetTemplateElement = (
  templateElement: TemplateElement<TweetField>,
  tweet: Tweet,
  template: ParsedTweetTemplate,
): string => {
  switch (templateElement.type) {
    case 'text':
      return templateElement.text;
    case 'placeholder':
      switch (templateElement.field) {
        case 'tweet.url':
          return `https://twitter.com/${tweet.author.username}/status/${tweet.id}`;
        case 'tweet.id':
          return tweet.id;
        case 'tweet.text':
          return tweet.text
            .map((entity) => fillTweetEntity(entity, template))
            .join('');
        case 'user.name':
          return tweet.author.name;
        case 'user.username':
          return tweet.author.username;
        case 'date.iso':
          return toDate(tweet.created_at, template.timezone).format();
        case 'date.year':
          return toDate(tweet.created_at, template.timezone).format('YYYY');
        case 'date.month':
          return toDate(tweet.created_at, template.timezone).format('MM');
        case 'date.day':
          return toDate(tweet.created_at, template.timezone).format('DD');
        case 'date.hours':
          return toDate(tweet.created_at, template.timezone).format('HH');
        case 'date.minutes':
          return toDate(tweet.created_at, template.timezone).format('mm');
        case 'date.seconds':
          return toDate(tweet.created_at, template.timezone).format('ss');
        case 'date.timestamp':
          return tweet.created_at.toString();
      }
  }
  ((_: never) => _)(templateElement);
  return '';
};

const fillTweetEntity = (
  entity: TweetEntity,
  template: ParsedTweetTemplate,
): string => {
  switch (entity.type) {
    case 'text':
      return template.entity.text
        .map((element) => fillTweetEntityText(element, entity))
        .join('');
    case 'url':
      return template.entity.url
        .map((element) => fillTweetEntityURL(element, entity))
        .join('');
    case 'hashtag':
      return template.entity.hashtag
        .map((element) => fillTweetEntityHashtag(element, entity))
        .join('');
    case 'cashtag':
      return template.entity.cashtag
        .map((element) => fillTweetEntityCashtag(element, entity))
        .join('');
    case 'mention':
      return template.entity.mention
        .map((element) => fillTweetEntityMention(element, entity))
        .join('');
    default:
      ((_: never) => _)(entity);
      return '';
  }
};

const fillTweetEntityText = (
  templateElement: TemplateElement<EntityTextField>,
  entity: TweetEntityText,
): string => {
  switch (templateElement.type) {
    case 'text':
      return templateElement.text;
    case 'placeholder':
      switch (templateElement.field) {
        case 'text':
          return entity.text;
      }
  }
  ((_: never) => _)(templateElement);
  return '';
};

const fillTweetEntityURL = (
  templateElement: TemplateElement<EntityURLField>,
  entity: TweetEntityURL,
): string => {
  switch (templateElement.type) {
    case 'text':
      return templateElement.text;
    case 'placeholder':
      switch (templateElement.field) {
        case 'text':
          return entity.text;
        case 'short_url':
          return entity.short_url;
        case 'expanded_url':
          return entity.expanded_url;
        case 'decoded_url':
          return entity.decoded_url;
        case 'title':
          return entity.title ?? '';
      }
  }
  ((_: never) => _)(templateElement);
  return '';
};

const fillTweetEntityHashtag = (
  templateElement: TemplateElement<EntityHashtagField>,
  entity: TweetEntityHashtag,
): string => {
  switch (templateElement.type) {
    case 'text':
      return templateElement.text;
    case 'placeholder':
      switch (templateElement.field) {
        case 'text':
          return entity.text;
        case 'tag':
          return entity.tag;
        case 'hashmoji':
          return entity.hashmoji ?? '';
      }
  }
  ((_: never) => _)(templateElement);
  return '';
};

const fillTweetEntityCashtag = (
  templateElement: TemplateElement<EntityCashtagField>,
  entity: TweetEntityCashtag,
): string => {
  switch (templateElement.type) {
    case 'text':
      return templateElement.text;
    case 'placeholder':
      switch (templateElement.field) {
        case 'text':
          return entity.text;
        case 'tag':
          return entity.tag;
      }
  }
  ((_: never) => _)(templateElement);
  return '';
};

const fillTweetEntityMention = (
  templateElement: TemplateElement<EntityMentionField>,
  entity: TweetEntityMention,
): string => {
  switch (templateElement.type) {
    case 'text':
      return templateElement.text;
    case 'placeholder':
      switch (templateElement.field) {
        case 'text':
          return entity.text;
        case 'username':
          return entity.username;
      }
  }
  ((_: never) => _)(templateElement);
  return '';
};
