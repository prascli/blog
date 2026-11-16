/**
 * Reading time and related-post helpers.
 *
 * Both are derived from the Markdown source at build time, so there is no
 * client-side work and no stored metadata to drift out of date.
 */
import type { CollectionEntry } from "astro:content";

const WORDS_PER_MINUTE = 220;

/** Strip frontmatter and code fences before counting prose words. */
function proseWords(body: string): number {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .split(/\s+/)
    .filter(word => /[\p{L}\p{N}]/u.test(word)).length;
}

export function readingTime(body: string | undefined): number {
  if (!body) return 1;
  return Math.max(1, Math.round(proseWords(body) / WORDS_PER_MINUTE));
}

export function readingTimeLabel(body: string | undefined): string {
  const minutes = readingTime(body);
  return `${minutes} min read`;
}

type Post = CollectionEntry<"posts">;

/**
 * Related posts: shared tags weigh most, then the same category, then recency.
 * Only published posts are considered.
 */
export function getRelatedPosts(current: Post, all: Post[], limit = 3): Post[] {
  const currentTags = new Set(current.data.tags.map(tag => tag.toLowerCase()));

  return all
    .filter(post => post.id !== current.id && !post.data.draft)
    .map(post => {
      const sharedTags = post.data.tags.filter(tag =>
        currentTags.has(tag.toLowerCase())
      ).length;
      const sameCategory = post.data.category === current.data.category ? 2 : 0;
      return { post, score: sharedTags * 2 + sameCategory };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.post.data.pubDatetime).getTime() -
          new Date(a.post.data.pubDatetime).getTime()
    )
    .slice(0, limit)
    .map(({ post }) => post);
}
