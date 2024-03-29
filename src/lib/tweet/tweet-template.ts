import difflib from 'difflib';

export interface TweetTemplate {
  tweet: string;
  footer: string;
  entity: {
    text: string;
    url: string;
    hashtag: string;
    cashtag: string;
    mention: string;
  };
  media: {
    photo: string;
    video: string;
  };
  quote: boolean;
}

export const defaultTweetTemplate = (): TweetTemplate => {
  return {
    tweet: '[${tweet.url} ${user.name}(@${user.username})]: ${tweet.text}',
    footer: '${tweet.datetime}',
    entity: {
      text: '${text}',
      url: '[${decoded_url} ${title}]',
      hashtag: '${text}',
      cashtag: '${text}',
      mention: '[${user_url} ${text}]',
    },
    media: {
      photo: '[${url}]',
      video: '[${thumbnail}]',
    },
    quote: true,
  };
};

export interface TemplateElementText {
  type: 'text';
  text: string;
}

export interface TemplateElementPlaceholder<Field extends string> {
  type: 'placeholder';
  field: Field;
}

export type TemplateElement<Field extends string> =
  | TemplateElementText
  | TemplateElementPlaceholder<Field>;

const tweetFields = [
  'tweet.url',
  'tweet.id',
  'tweet.text',
  'tweet.datetime',
  'user.name',
  'user.username',
  'user.url',
] as const;

const entityTextFields = ['text'] as const;

const entityURLFields = [
  'text',
  'short_url',
  'expanded_url',
  'decoded_url',
  'title',
] as const;

const entityHashtagFields = ['text', 'tag', 'hashmoji'] as const;

const entityCashtagFields = ['text', 'tag'] as const;

const entityMentionFields = ['text', 'username', 'user_url'] as const;

const mediaPhotoFields = ['url'] as const;

const mediaVideoFields = ['thumbnail'] as const;

export type TweetField = (typeof tweetFields)[number];

export type EntityTextField = (typeof entityTextFields)[number];

export type EntityURLField = (typeof entityURLFields)[number];

export type EntityHashtagField = (typeof entityHashtagFields)[number];

export type EntityCashtagField = (typeof entityCashtagFields)[number];

export type EntityMentionField = (typeof entityMentionFields)[number];

export type MediaPhotoField = (typeof mediaPhotoFields)[number];

export type MediaVideoField = (typeof mediaVideoFields)[number];

export interface ParsedTweetTemplate {
  tweet: readonly TemplateElement<TweetField>[];
  footer: readonly TemplateElement<TweetField>[];
  entity: {
    text: readonly TemplateElement<EntityTextField>[];
    url: readonly TemplateElement<EntityURLField>[];
    hashtag: readonly TemplateElement<EntityHashtagField>[];
    cashtag: readonly TemplateElement<EntityCashtagField>[];
    mention: readonly TemplateElement<EntityMentionField>[];
  };
  media: {
    photo: readonly TemplateElement<MediaPhotoField>[];
    video: readonly TemplateElement<MediaVideoField>[];
  };
  quote: boolean;
}

export const parseTweetTemplate = (
  template: TweetTemplate,
): ParsedTweetTemplate => {
  // parse template
  const parser = tweetTemplateParser;
  return {
    tweet: parser.tweet(template.tweet),
    footer: parser.tweet(template.footer),
    entity: {
      text: parser.entity.text(template.entity.text),
      url: parser.entity.url(template.entity.url),
      hashtag: parser.entity.hashtag(template.entity.hashtag),
      cashtag: parser.entity.cashtag(template.entity.cashtag),
      mention: parser.entity.mention(template.entity.mention),
    },
    media: {
      photo: parser.media.photo(template.media.photo),
      video: parser.media.video(template.media.video),
    },
    quote: template.quote,
  };
};

export class UnexpectedPlaceholderError extends Error {
  readonly field: string;
  readonly fields: readonly string[];
  readonly maybe: readonly string[];

  constructor(field: string, fields: readonly string[]) {
    const maybe = difflib.getCloseMatches(field, fields as string[]);
    let message = `"${field}" is not assignable to a placeholder.`;
    if (maybe.length > 0) {
      message += ` Did you mean ${maybe
        .map((field) => `"${field}"`)
        .join(' / ')}?`;
    }
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnexpectedPlaceholderError);
    }
    this.field = field;
    this.fields = fields;
    this.maybe = maybe;
  }
}

const parsePlaceholders = <Field extends string>(
  template: string,
  fields: readonly Field[],
): TemplateElement<Field>[] => {
  const elements: TemplateElement<Field>[] = [];
  let tail = template;
  while (tail.length > 0) {
    const match = tail.match(/(?<!\\)\$\{(?<field>.+?)\}/);
    if (match !== null) {
      if (match.index !== 0) {
        elements.push({ type: 'text', text: tail.slice(0, match.index) });
      }
      const field = match?.groups?.field;
      if (field !== undefined) {
        if (!isField(field, fields)) {
          throw new UnexpectedPlaceholderError(field, fields);
        }
        elements.push({ type: 'placeholder', field: field as Field });
        tail = tail.slice((match.index ?? 0) + match[0].length);
      }
    } else {
      elements.push({ type: 'text', text: tail });
      tail = '';
    }
  }
  return elements;
};

const isField = <Field extends string>(
  field: string,
  fields: readonly Field[],
): field is Field => {
  return (fields as readonly string[]).includes(field);
};

const fieldParser = <Field extends string>(
  fields: readonly Field[],
): ((template: string) => TemplateElement<Field>[]) => {
  return (template: string) => parsePlaceholders(template, fields);
};

export const tweetTemplateParser = {
  tweet: fieldParser(tweetFields),
  entity: {
    text: fieldParser(entityTextFields),
    url: fieldParser(entityURLFields),
    hashtag: fieldParser(entityHashtagFields),
    cashtag: fieldParser(entityCashtagFields),
    mention: fieldParser(entityMentionFields),
  },
  media: {
    photo: fieldParser(mediaPhotoFields),
    video: fieldParser(mediaVideoFields),
  },
} as const;
