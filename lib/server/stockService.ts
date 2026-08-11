export interface StockAsset {
  id: string;
  url: string;
  previewUrl: string;
  width?: number;
  height?: number;
  provider: string;
  attribution: string;
  mediaType: 'image' | 'video';
}

/**
 * Extracts a short 2-4 word search query from scene text or visual prompt.
 */
export function buildStockSearchQuery(
  scene: { text?: string | null; visual_prompt?: string | null },
  series?: { niche?: string | null } | null
): string {
  const promptText = scene.visual_prompt || scene.text || series?.niche || 'cinematic portrait';

  // Remove common filler words and visual prompt instructions
  const stopWords = new Set([
    'cinematic', 'photography', 'photo', 'shot', 'lighting', 'documentary', 'realistic',
    'hyper-realistic', 'high', 'detail', '4k', '8k', '35mm', '9:16', 'vertical', 'composition',
    'style', 'no', 'text', 'subtitles', 'captions', 'logos', 'watermarks', 'a', 'an', 'the',
    'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'and', 'or',
    'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
    'does', 'did', 'showing', 'featuring', 'background', 'foreground', 'view', 'dramatic',
    'atmosphere', 'aesthetic', 'candid', 'authentic', 'moody', 'modern', 'sleek', 'vintage',
  ]);

  const words = promptText
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()));

  if (words.length > 0) {
    // Take top 3 relevant words
    return words.slice(0, 3).join(' ');
  }

  return (series?.niche || 'vertical landscape').trim();
}

/**
 * Searches stock image providers (Pexels API if STOCK_API_KEY present, with curated Unsplash/Picsum fallback).
 */
export async function searchStockImages(
  query: string,
  count = 12,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<StockAsset[]> {
  const cleanQuery = query.trim() || (orientation === 'landscape' ? 'cinematic landscape' : 'vertical portrait');
  const apiKey = process.env.STOCK_API_KEY;

  if (apiKey) {
    try {
      const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(cleanQuery)}&orientation=${orientation}&per_page=${count}`;
      const response = await fetch(pexelsUrl, {
        headers: { Authorization: apiKey },
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.photos && Array.isArray(data.photos) && data.photos.length > 0) {
          return data.photos.map((p: any) => ({
            id: `pexels-${p.id}`,
            url: p.src?.large2x || p.src?.large || p.src?.original,
            previewUrl: p.src?.medium || p.src?.small,
            width: p.width,
            height: p.height,
            provider: 'Pexels',
            attribution: `Photo by ${p.photographer} on Pexels`,
            mediaType: 'image' as const,
          }));
        }
      }
    } catch (err) {
      console.warn('[StockService] Pexels API call failed, using fallback stock provider:', err);
    }
  }

  // Royalty-free fallback curated search using high-quality Unsplash/Picsum source images
  const fallbackAssets: StockAsset[] = [];
  const seeds = [101, 204, 305, 408, 512, 615, 720, 831, 942, 1053, 1164, 1275];
  const width = orientation === 'landscape' ? 1920 : 1080;
  const height = orientation === 'landscape' ? 1080 : 1920;

  for (let i = 0; i < Math.min(count, seeds.length); i++) {
    const seed = seeds[i];
    const sourceUrl = `https://picsum.photos/seed/${encodeURIComponent(cleanQuery + seed)}/${width}/${height}`;

    fallbackAssets.push({
      id: `stock-fallback-${seed}`,
      url: sourceUrl,
      previewUrl: sourceUrl,
      width,
      height,
      provider: 'Stock Library',
      attribution: 'Royalty Free Stock',
      mediaType: 'image',
    });
  }

  return fallbackAssets;
}
