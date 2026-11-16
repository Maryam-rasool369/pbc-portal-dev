/**
 * Klipy GIF search — client-only, no backend involved, mirroring the mobile
 * app's `components/chat/GifPickerSheet.jsx`. The API key is a public,
 * client-safe key (like the existing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY), set
 * via NEXT_PUBLIC_KLIPY_API_KEY.
 */

export interface KlipyGif {
  id: string;
  previewUrl: string | null;
  fullUrl: string | null;
}

interface KlipyItem {
  id: string | number;
  file?: {
    sm?: { gif?: { url?: string } };
    xs?: { gif?: { url?: string } };
    md?: { gif?: { url?: string } };
    hd?: { gif?: { url?: string } };
  };
}

function buildUrl(path: string, params: Record<string, string | number> = {}): string {
  const key = process.env.NEXT_PUBLIC_KLIPY_API_KEY ?? "";
  const base = `https://api.klipy.com/api/v1/${key}${path}`;
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return qs ? `${base}?${qs}` : base;
}

function getPreviewUrl(item: KlipyItem): string | null {
  return (
    item.file?.sm?.gif?.url ??
    item.file?.xs?.gif?.url ??
    item.file?.md?.gif?.url ??
    item.file?.hd?.gif?.url ??
    null
  );
}

function getFullUrl(item: KlipyItem): string | null {
  return item.file?.hd?.gif?.url ?? item.file?.md?.gif?.url ?? item.file?.sm?.gif?.url ?? null;
}

function mapItems(items: KlipyItem[]): KlipyGif[] {
  return items
    .map((item) => ({
      id: String(item.id),
      previewUrl: getPreviewUrl(item),
      fullUrl: getFullUrl(item),
    }))
    .filter((gif) => !!gif.previewUrl && !!gif.fullUrl);
}

export interface KlipyPage {
  gifs: KlipyGif[];
  hasNext: boolean;
}

async function fetchKlipy(path: string, params: Record<string, string | number>): Promise<KlipyPage> {
  if (!process.env.NEXT_PUBLIC_KLIPY_API_KEY) {
    throw new Error("GIFs aren't configured yet — NEXT_PUBLIC_KLIPY_API_KEY is missing.");
  }
  const res = await fetch(buildUrl(path, params));
  const json = await res.json();
  if (!json.result) {
    throw new Error("Failed to load GIFs.");
  }
  const items: KlipyItem[] = json.data?.data ?? [];
  return { gifs: mapItems(items), hasNext: !!json.data?.has_next };
}

export const getTrendingGifs = (page: number): Promise<KlipyPage> =>
  fetchKlipy("/gifs/trending", { per_page: 24, page });

export const searchGifs = (query: string, page: number): Promise<KlipyPage> =>
  fetchKlipy("/gifs/search", { q: query, per_page: 24, page });
