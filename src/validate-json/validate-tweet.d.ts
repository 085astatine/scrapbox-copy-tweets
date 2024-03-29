import { ErrorObject } from 'ajv';
import { Tweet } from '~/lib/tweet/types';

declare const validate: {
  (data: unknown): data is Tweet;
  errors: ErrorObject[] | null;
};
export default validate;
