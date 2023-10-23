import { ErrorObject } from 'ajv';
import { TweetID } from '~/lib/tweet';

declare const validate: {
  (data: unknown): data is TweetID[];
  errors: ErrorObject[] | null;
};
export default validate;
