/** Shared plain-language messages and the 401 hook used by every API service. */

export const NETWORK_MESSAGE = "Can't reach Amugonna. Check your connection and try again.";
export const ADD_FAILED_MESSAGE = "Couldn't add that. Try a shorter name.";
export const READ_FAILED_MESSAGE = "Couldn't read that. Try fewer or shorter items.";
export const GENERIC_MESSAGE = 'Something went wrong. Please try again.';
export const SESSION_EXPIRED_MESSAGE = 'Please sign in again';
export const CHECK_DETAILS_MESSAGE =
  'Please check your details. The password needs 8 or more characters with an uppercase letter, a lowercase letter and a number.';

let onUnauthorized: (() => void) | null = null;

/** The auth context registers its logout here so any service can end an expired session. */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

/** Call when a request that carried a token came back 401. */
export function notifyUnauthorized() {
  onUnauthorized?.();
}

/** Server text is only shown when it is plain; server errors and bare "Validation failed" get friendly copy. */
export function plainServerMessage(status: number | undefined, message: string | undefined): string {
  if (!message || (status !== undefined && status >= 500) || /^validation failed$/i.test(message)) return GENERIC_MESSAGE;
  return message;
}
