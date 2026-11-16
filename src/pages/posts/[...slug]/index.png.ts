import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { fontData, experimental_getFontFileURL } from "astro:assets";
import satori from "satori";
import sharp from "sharp";
import { getFontPathByWeight } from "@/utils/getFontPathByWeight";
import { getPostSlug } from "@/utils/getPostPaths";
import { postFilter } from "@/utils/postFilter";
import { categoryLabel } from "@/utils/categories";
import { readingTime } from "@/utils/postMeta";
import config from "@/config";

export async function getStaticPaths() {
  if (!config.features.dynamicOgImage) {
    return [];
  }

  const posts = await getCollection("posts").then(p =>
    p.filter(post => postFilter(post) && !post.data.ogImage)
  );

  return posts.map(post => ({
    params: { slug: getPostSlug(post.id, post.filePath) },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props, url }) => {
  if (!config.features.dynamicOgImage) {
    return new Response(null, { status: 404, statusText: "Not found" });
  }

  const sansFonts = fontData["--font-sans"];
  const monoFonts = fontData["--font-mono"];

  const sansRegular = getFontPathByWeight(sansFonts, 400);
  const sansBold = getFontPathByWeight(sansFonts, 700);
  const monoRegular = getFontPathByWeight(monoFonts, 400);

  if (!sansRegular || !sansBold || !monoRegular) {
    throw new Error("Cannot find the font path for the OG image.");
  }

  const [regularData, boldData, monoData] = await Promise.all([
    fetch(experimental_getFontFileURL(sansRegular, url)).then(res =>
      res.arrayBuffer()
    ),
    fetch(experimental_getFontFileURL(sansBold, url)).then(res =>
      res.arrayBuffer()
    ),
    fetch(experimental_getFontFileURL(monoRegular, url)).then(res =>
      res.arrayBuffer()
    ),
  ]);

  const published = new Date(props.data.pubDatetime).toISOString().slice(0, 10);

  const svg = await satori(
    {
      key: null,
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fbfaf8",
          color: "#16181d",
          padding: "72px 80px",
          borderTop: "14px solid #9c3d18",
          fontFamily: "Inter",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 24,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#9c3d18",
                fontFamily: "JetBrains Mono",
              },
              children: [
                {
                  type: "span",
                  props: { children: categoryLabel(props.data.category) },
                },
                {
                  type: "span",
                  props: {
                    style: { color: "#5b626d" },
                    children: new URL(config.site.url).hostname,
                  },
                },
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: props.data.title.length > 70 ? 58 : 68,
                      fontWeight: 700,
                      lineHeight: 1.1,
                      letterSpacing: "-0.02em",
                      maxHeight: "280px",
                      overflow: "hidden",
                    },
                    children: props.data.title,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 26,
                      lineHeight: 1.4,
                      color: "#3d434c",
                      maxWidth: "940px",
                      maxHeight: "82px",
                      overflow: "hidden",
                    },
                    children: props.data.description,
                  },
                },
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #e2ddd3",
                paddingTop: "24px",
                fontSize: 24,
                color: "#5b626d",
              },
              children: [
                {
                  type: "span",
                  props: {
                    style: { fontWeight: 700, color: "#16181d" },
                    children: config.site.author,
                  },
                },
                {
                  type: "span",
                  props: {
                    style: { fontFamily: "JetBrains Mono" },
                    children: `${published} · ${readingTime(props.body)} min read`,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: [
        { name: "Inter", data: regularData, weight: 400, style: "normal" },
        { name: "Inter", data: boldData, weight: 700, style: "normal" },
        {
          name: "JetBrains Mono",
          data: monoData,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(pngBuffer), {
    headers: { "Content-Type": "image/png" },
  });
};
