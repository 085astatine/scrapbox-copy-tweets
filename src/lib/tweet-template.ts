import difflib from 'difflib';
import { validateTimezone } from './tweet-date';

export interface TweetTemplate {
  tweet: string;
  entity: {
    text: string;
  };
  timezone?: string;
}

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
  'user.id',
  'user.name',
  'user.username',
  'date.iso',
  'date.year',
  'date.month',
  'date.day',
  'date.hours',
  'date.minutes',
  'date.seconds',
  'date.timestamp',
] as const;

const entityTextFields = ['text'] as const;

export type TweetField = typeof tweetFields[number];

export type EntityTextField = typeof entityTextFields[number];

export interface ParsedTweetTemplate {
  tweet: readonly TemplateElement<TweetField>[];
  entity: {
    text: readonly TemplateElement<EntityTextField>[];
  };
  timezone?: string;
}

export const parseTweetTemplate = (
  template: TweetTemplate
): ParsedTweetTemplate => {
  // validate timezone
  if (template.timezone !== undefined) {
    validateTimezone(template.timezone);
  }
  // parse template
  const parser = tweetTemplateParser;
  return {
    tweet: parser.tweet(template.tweet),
    entity: {
      text: parser.entity.text(template.entity.text),
    },
    ...(template.timezone !== undefined ? { timezone: template.timezone } : {}),
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
  fields: readonly Field[]
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
  fields: readonly Field[]
): field is Field => {
  return (fields as readonly string[]).includes(field);
};

const fieldParser = <Field extends string>(
  fields: readonly Field[]
): ((template: string) => TemplateElement<Field>[]) => {
  return (template: string) => parsePlaceholders(template, fields);
};

export const tweetTemplateParser = {
  tweet: fieldParser(tweetFields),
  entity: {
    text: fieldParser(entityTextFields),
  },
} as const;
