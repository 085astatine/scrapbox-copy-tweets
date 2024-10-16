import dayjs from 'dayjs';
import dayjsTimezone from 'dayjs/plugin/timezone';
import dayjsUTC from 'dayjs/plugin/utc';

dayjs.extend(dayjsUTC);
dayjs.extend(dayjsTimezone);

export const toDatetime = (
  timestamp?: number,
  timezone?: string,
): dayjs.Dayjs => {
  if (timestamp !== undefined) {
    return dayjs.unix(timestamp).tz(timezone);
  }
  return dayjs().tz(timezone);
};

export class InvalidTimezoneError extends Error {
  readonly timezone: string;

  constructor(timezone: string) {
    super();
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidTimezoneError);
    }
    this.timezone = timezone;
  }
}

export const validateTimezone = (timezone: string): void => {
  try {
    dayjs().tz(timezone);
  } catch (error: unknown) {
    if (error instanceof RangeError) {
      throw new InvalidTimezoneError(timezone);
    } else {
      throw error;
    }
  }
};

export const isValidTimezone = (timezone: string): boolean => {
  try {
    validateTimezone(timezone);
  } catch (error: unknown) {
    if (error instanceof InvalidTimezoneError) {
      return false;
    } else {
      throw error;
    }
  }
  return true;
};

export const defaultTimezone = (): string => {
  return dayjs.tz.guess();
};
