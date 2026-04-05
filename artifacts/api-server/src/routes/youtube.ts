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

// Proxy: playlist items (uploads) — supports pageToken for pagination
router.get("/youtube/playlistItems", async (req, res) => {
  try {
    const { playlistId, maxResults, part, pageToken } = req.query as Record<string, string>;
    const params: Record<string, string> = {
      part: part ?? "snippet",
      playlistId,
      maxResults: maxResults ?? "15",
    };
    if (pageToken) params.pageToken = pageToken;
    const data = await ytFetch("playlistItems", params);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
