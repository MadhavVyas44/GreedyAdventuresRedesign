import page from "@/knowledge/sources/sea-view-skydiving.json";

// Every PDF and video the assistant is allowed to show.
// "website" files come from the captured page; "demo" files were made for this prototype.
export type MediaItem = {
  id: string;
  kind: "pdf" | "video";
  title: string;
  url: string;
  origin: "website" | "demo";
  // Still image shown before a video plays, so nothing downloads until the customer presses play.
  poster?: string;
};

export const media: MediaItem[] = [
  {
    id: "brochure",
    kind: "pdf",
    title: "Sea View Skydiving brochure (demo)",
    url: "/media/brochure-demo.pdf",
    origin: "demo",
  },
  {
    id: "experience-film",
    kind: "video",
    title: "Sea View Skydiving film",
    // First video in the captured page: the main experience film.
    url: page.media.videos[0],
    origin: "website",
    poster: page.media.images.find((url) => url.includes("tandem-with-sea-view")),
  },
];

export function findMedia(kind: MediaItem["kind"]): MediaItem | undefined {
  return media.find((item) => item.kind === kind);
}
