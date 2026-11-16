import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://blog.qansa.web.id/",
    title: "Indra Prasetya",
    description:
      "Engineering journal on backend systems, databases, infrastructure, and the tooling around AI coding agents.",
    author: "Indra Prasetya",
    profile: "https://github.com/prascli",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "Asia/Jakarta",
    dir: "ltr",
  },
  posts: {
    perPage: 10,
    perIndex: 8,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: true,
      url: "https://github.com/prascli/blog/edit/main/",
    },
    search: "pagefind",
    toc: true,
  },
  socials: [
    { name: "github", url: "https://github.com/prascli" },
    { name: "mail", url: "mailto:indra@qansa.id" },
    {
      name: "rss",
      url: "https://blog.qansa.web.id/rss.xml",
      linkTitle: "RSS feed of Indra Prasetya's engineering journal",
    },
  ],
  shareLinks: [
    { name: "x", url: "https://x.com/intent/post?url=" },
    {
      name: "linkedin",
      url: "https://www.linkedin.com/sharing/share-offsite/?url=",
    },
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "mail", url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
