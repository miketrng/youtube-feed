import { Router } from "express";

const router = Router();

const YT_API_KEY = process.env["YOUTUBE_API_KEY"];
const YT_BASE = "https://www.googleapis.com/youtube/v3";

async function ytFetch(endpoint: string, params: Record<string, string>) {
  if (!YT_API_KEY) {
    throw new Error("YOUTUBE_API_KEY is not configured");
  }
  const query = new URLSearchParams({ ...params, key: YT_API_KEY }).toString();
  const url = `${YT_BASE}/${endpoint}?${query}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    const msg = (data as any)?.error?.message ?? `YouTube API error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/** Parse ISO 8601 duration (e.g. PT1M30S) into total seconds. */
function parseDurationSeconds(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (
    parseInt(m[1] ?? "0") * 3600 +
    parseInt(m[2] ?? "0") * 60 +
    parseInt(m[3] ?? "0")
  );
}

// Proxy: channels lookup by ID
router.get("/youtube/channels", async (req, res) => {
  try {
    const { id, part } = req.query as Record<string, string>;
    const data = await ytFetch("channels", { part: part ?? "snippet,contentDetails", id });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Proxy: channel search
router.get("/youtube/search", async (req, res) => {
  try {
    const { q, type, maxResults, part } = req.query as Record<string, string>;
    const data = await ytFetch("search", {
      part: part ?? "snippet",
      q,
      type: type ?? "channel",
      maxResults: maxResults ?? "1",
    });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Proxy: playlist items (uploads) — filters out Shorts (≤60s), supports pagination
router.get("/youtube/playlistItems", async (req, res) => {
  try {
    const { playlistId, maxResults, pageToken } = req.query as Record<string, string>;
    const want = Math.min(parseInt(maxResults ?? "15"), 50);

    // Fetch more than requested to account for Shorts being filtered out.
    // YouTube API max per page is 50.
    const fetchCount = Math.min(want * 2, 50);

    const params: Record<string, string> = {
      part: "snippet",
      playlistId,
      maxResults: String(fetchCount),
    };
    if (pageToken) params.pageToken = pageToken;

    const playlistData = await ytFetch("playlistItems", params);
    const items: any[] = playlistData.items ?? [];

    if (items.length === 0) {
      return res.json({ items: [], nextPageToken: playlistData.nextPageToken });
    }

    // Batch-fetch durations for all video IDs in one call
    const videoIds = items
      .map((item: any) => item.snippet?.resourceId?.videoId)
      .filter(Boolean)
      .join(",");

    const videoData = await ytFetch("videos", {
      part: "contentDetails",
      id: videoIds,
    });

    // Build a duration map: videoId -> seconds
    const durationMap: Record<string, number> = {};
    for (const v of videoData.items ?? []) {
      const dur = v.contentDetails?.duration ?? "";
      durationMap[v.id] = parseDurationSeconds(dur);
    }

    // Filter out Shorts (≤ 60 seconds) then cap at the requested count
    const filtered = items
      .filter((item: any) => {
        const vid = item.snippet?.resourceId?.videoId;
        const secs = durationMap[vid] ?? 0;
        return secs > 60;
      })
      .slice(0, want);

    return res.json({
      items: filtered,
      nextPageToken: playlistData.nextPageToken,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
