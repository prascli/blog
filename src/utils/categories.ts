/**
 * The publication's fixed category taxonomy.
 *
 * Categories are deliberate and few: they are the top-level navigation of the
 * journal. Free-form labels belong in `tags`. Adding a category means editing
 * this file and the navigation renders it automatically.
 */
export const CATEGORIES = [
  {
    slug: "backend-engineering",
    label: "Backend Engineering",
  },
  {
    slug: "database-engineering",
    label: "Database Engineering",
  },
  {
    slug: "devops-and-infrastructure",
    label: "DevOps & Infrastructure",
  },
  {
    slug: "ai-engineering",
    label: "AI Engineering",
  },
  {
    slug: "security-engineering",
    label: "Security Engineering",
  },
  {
    slug: "open-source",
    label: "Open Source",
  },
  {
    slug: "engineering-notes",
    label: "Engineering Notes",
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CATEGORY_SLUGS = CATEGORIES.map(c => c.slug) as [
  CategorySlug,
  ...CategorySlug[],
];

export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map(c => [c.slug, c.label])
) as Record<CategorySlug, string>;

export function categoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug as CategorySlug] ?? slug;
}

export function categoryUrl(slug: string): string {
  return `/categories/${slug}/`;
}
