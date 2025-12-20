import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bollywood Beatz",
    short_name: "Bollywood Beatz",
    description: "Dance class attendance, points, and awards",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#ff8c1a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
