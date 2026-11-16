import type { UIStrings } from "../types";

export default {
  nav: {
    home: "Home",
    posts: "Writing",
    tags: "Tags",
    categories: "Categories",
    about: "About",
    archives: "Archive",
    search: "Search",
  },
  post: {
    publishedAt: "Published at",
    updatedAt: "Updated",
    sharePostIntro: "Share this post:",
    sharePostOn: "Share this post on {{platform}}",
    sharePostViaEmail: "Share this post via email",
    tagLabel: "Tags",
    backToTop: "Back to top",
    tableOfContents: "Table of contents",
    goBack: "Go back",
    editPage: "Edit page",
    previousPost: "Previous Post",
    nextPost: "Next Post",
    relatedPosts: "Related writing",
  },
  pagination: {
    prev: "Prev",
    next: "Next",
    page: "Page",
  },
  home: {
    socialLinks: "Social Links",
    featured: "Featured",
    recentPosts: "Recent writing",
    allPosts: "All writing",
    categories: "Browse by category",
  },
  footer: {
    copyright: "Copyright",
    allRightsReserved: "All rights reserved.",
  },
  pages: {
    tagTitle: "Tag",
    tagDesc: "All the articles with the tag",

    tagsTitle: "Tags",
    tagsDesc: "All the tags used in posts.",

    categoriesTitle: "Categories",
    categoriesDesc: "Every category in the journal, with its articles.",
    categoryDesc: "Articles filed under",

    postsTitle: "Writing",
    postsDesc: "Every article in the journal, newest first.",

    archivesTitle: "Archive",
    archivesDesc: "Every article, grouped by year.",

    searchTitle: "Search",
    searchDesc: "Search the journal by title, tag, or body text.",
  },
  a11y: {
    skipToContent: "Skip to content",
    skipTableOfContents: "Skip table of contents",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    toggleTheme: "Toggle theme",
    searchPlaceholder: "Search posts...",
    noResults: "No results found",
    goToPreviousPage: "Go to previous page",
    goToNextPage: "Go to next page",
  },
  notFound: {
    title: "404 Not Found",
    message: "Page Not Found",
    goHome: "Go back home",
  },
} satisfies UIStrings;
