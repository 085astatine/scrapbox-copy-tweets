import {
  UnexpectedPlaceholderError,
  tweetTemplateParser,
} from '~/lib/tweet/tweet-template';

describe('tweet-template/tweet', () => {
  test('empty', () => {
    const template = '';
    const expected: ReturnType<typeof tweetTemplateParser.tweet> = [];
    expect(tweetTemplateParser.tweet(template)).toStrictEqual(expected);
  });
  test('parse', () => {
    const template = '[${tweet.url} @${user.username}]';
    const expected = [
      { type: 'text', text: '[' },
      { type: 'placeholder', field: 'tweet.url' },
      { type: 'text', text: ' @' },
      { type: 'placeholder', field: 'user.username' },
      { type: 'text', text: ']' },
    ];
    expect(tweetTemplateParser.tweet(template)).toStrictEqual(expected);
  });
  test('escaped_placeholder', () => {
    const template = '[\\${tweet.url} @${user.username}]';
    const expected = [
      { type: 'text', text: '[\\${tweet.url} @' },
      { type: 'placeholder', field: 'user.username' },
      { type: 'text', text: ']' },
    ];
    expect(tweetTemplateParser.tweet(template)).toStrictEqual(expected);
  });
  test('connected_placeholder', () => {
    const template = '${tweet.url}${user.username}';
    const expected = [
      { type: 'placeholder', field: 'tweet.url' },
      { type: 'placeholder', field: 'user.username' },
    ];
    expect(tweetTemplateParser.tweet(template)).toStrictEqual(expected);
  });
  test('empty_placeholder', () => {
    const template = '${}';
    expect(() => tweetTemplateParser.tweet(template)).toThrow(
      UnexpectedPlaceholderError,
    );
  });
  test('unexpected_field', () => {
    const template = '[${tweet.url} @${user.usrname}]';
    try {
      expect(() => tweetTemplateParser.tweet(template)).toThrow(
        UnexpectedPlaceholderError,
      );
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(UnexpectedPlaceholderError);
      if (error instanceof UnexpectedPlaceholderError) {
        expect(error.field).toBe('user.usrname');
        expect(error.maybe).toStrictEqual(['user.username', 'user.name']);
      }
    }
  });
});
