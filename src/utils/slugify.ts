import slugify from "slugify";

const hasNonLatin = (str: string): boolean => /[^\x00-\x7F]/.test(str);

/**
 * Kebab-case that keeps non-Latin letters, so a tag written in another script
 * still produces a readable URL segment instead of an empty one.
 */
const kebabcase = (str: string): string =>
  str
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Slugify a string using a hybrid approach:
 * - Latin strings: slugify (e.g. "E2E Testing" → "e2e-testing")
 * - Strings with non-Latin chars: kebab-case, preserving those chars
 */
export const slugifyStr = (str: string): string => {
  if (hasNonLatin(str)) {
    return kebabcase(str);
  }
  return slugify(str, { lower: true });
};

export const slugifyAll = (arr: string[]) => arr.map(str => slugifyStr(str));
