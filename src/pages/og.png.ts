import type { APIRoute } from "astro";
import satori from "satori";
import sharp from "sharp";
import { fontData, experimental_getFontFileURL } from "astro:assets";
import { getFontPathByWeight } from "@/utils/getFontPathByWeight";
import config from "@/config";

export const GET: APIRoute = async context => {
  const sansFonts = fontData["--font-sans"];
  const monoFonts = fontData["--font-mono"];

  const sansRegular = getFontPathByWeight(sansFonts, 400);
  const sansBold = getFontPathByWeight(sansFonts, 700);
  const monoRegular = getFontPathByWeight(monoFonts, 400);

  if (!sansRegular || !sansBold || !monoRegular) {
    throw new Error("Cannot find the font path for the OG image.");
  }

  const [regularData, boldData, monoData] = await Promise.all([
    fetch(experimental_getFontFileURL(sansRegular, context.url)).then(res =>
      res.arrayBuffer()
    ),
    fetch(experimental_getFontFileURL(sansBold, context.url)).then(res =>
      res.arrayBuffer()
    ),
    fetch(experimental_getFontFileURL(monoRegular, context.url)).then(res =>
      res.arrayBuffer()
    ),
  ]);

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
                color: "#5b626d",
                fontFamily: "JetBrains Mono",
              },
              children: [
                { type: "span", props: { children: "Engineering Journal" } },
                {
                  type: "span",
                  props: {
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
                gap: "24px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 76,
                      fontWeight: 700,
                      lineHeight: 1.08,
                      letterSpacing: "-0.02em",
                    },
                    children: config.site.author,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 30,
                      lineHeight: 1.4,
                      color: "#3d434c",
                      maxWidth: "900px",
                    },
                    children:
                      "Building reliable systems. Measuring what matters. Sharing what works.",
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
                    children:
                      "Backend · Databases · Infrastructure · AI engineering",
                  },
                },
                {
                  type: "span",
                  props: {
                    style: { fontFamily: "JetBrains Mono" },
                    children: "powered by Qansa",
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
