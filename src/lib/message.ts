import { Logger } from './logger';
import { expandTCoURL, getURLTitle } from './url';

export interface ExpandTCoURLRequestMessage {
  type: 'ExpandTCoURL/Request';
  shortURL: string;
}

export interface ExpandTCoURLSuccessMessage {
  type: 'ExpandTCoURL/Response';
  ok: true;
  shortURL: string;
  expandedURL: string;
  title?: string;
}

export interface ExpandTCoURLFailureMessage {
  type: 'ExpandTCoURL/Response';
  ok: false;
  shortURL: string;
}

export type ExpandTCoURLResponseMessage =
  | ExpandTCoURLSuccessMessage
  | ExpandTCoURLFailureMessage;

export interface ForwardToOffscreenMessage<Message> {
  type: 'Forward/ToOffscreen';
  message: Message;
}

export interface SettingsDownloadStorageMessage {
  type: 'Settings/DownloadStorage';
}

// Respond to ExpandTCoURL/Request
export const respondToExpandTCoURLRequest = async (
  shortURL: string,
  logger: Logger,
): Promise<ExpandTCoURLResponseMessage> => {
  // expand https://t.co/...
  const expandedURL = await expandTCoURL(shortURL, logger);
  if (expandedURL === null) {
    return {
      type: 'ExpandTCoURL/Response',
      ok: false,
      shortURL,
    };
  }
  // get title
  const title = await getURLTitle(expandedURL, logger);
  return {
    type: 'ExpandTCoURL/Response',
    ok: true,
    shortURL,
    expandedURL,
    ...(title !== null && { title }),
  };
};
