import seaViewSkydiving from "@/knowledge/sources/sea-view-skydiving.json";

// A page captured from the website (see knowledge/sources/*.json).
export type Source = {
  id: string;
  title: string;
  url: string;
  capturedAt: string;
  sections: { heading: string; anchor: string | null; text: string }[];
  media: { images: string[]; videos: string[]; pdfs: string[] };
};

export const sources: Source[] = [seaViewSkydiving];
