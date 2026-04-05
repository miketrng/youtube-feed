import { Platform } from "react-native";

export interface Channel {
  id: string;
  title: string;
  thumbnail: string;
  uploadsPlaylistId: string;
}

export interface Video {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
}

export interface StoredChannel {
  id: string;
  title: string;
  thumbnail: string;
  uploadsPlaylistId: string;
  addedAt: string;
}

export interface PlaylistPage {
  videos: Video[];
  nextPageToken?: string;
}

/** Full origin of the API server, e.g. `http://192.168.1.42:3000` (no trailing slash). */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
/** Deployed host (e.g. Replit); uses https. */
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;

const MISSING_API_MSG =
  "Missing API URL. For Expo Go on a phone, start the api-server and set EXPO_PUBLIC_API_BASE_URL in artifacts/mobile/.env (e.g. http://YOUR_LAN_IP:PORT). Same Wi‑Fi as the phone. Server needs YOUTUBE_API_KEY.";

function apiUrl(path: string): string {
  const suffix = `/api${path}`;
  if (API_BASE_URL) {
    return `${API_BASE_URL.replace(/\/$/, "")}${suffix}`;
  }
  if (DOMAIN) {
    const host = DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}${suffix}`;
  }
  if (Platform.OS === "web") {
    return suffix;
  }
  throw new Error(MISSING_API_MSG);
}

async function parseJsonBody(res: Response): Promise<unknown> {
  const text = await res.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<")) {
    throw new Error(
      "Got HTML instead of JSON — the app is not talking to the YouTube API server. " + MISSING_API_MSG,
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(
      `Invalid JSON from API (${res.status}): ${text.slice(0, 120)}${text.length > 120 ? "…" : ""}`,
    );
  }
}

async function apiFetch(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const query = new URLSearchParams(params).toString();
  const url = `${apiUrl(path)}?${query}`;
  const res = await fetch(url);
  const data = (await parseJsonBody(res)) as Record<string, unknown>;
  if (!res.ok) {
    const err = typeof data.error === "string" ? data.error : `API error ${res.status}`;
    throw new Error(err);
  }
  return data;
}

export async function resolveChannelFromUrl(inputUrl: string): Promise<Channel> {
  const trimmed = inputUrl.trim();

  const channelIdMatch = trimmed.match(/\/channel\/(UC[\w-]+)/);
  const handleMatch = trimmed.match(/@([\w.-]+)/);
  const customUrlMatch = trimmed.match(/\/c\/([\w.-]+)/);
  const userMatch = trimmed.match(/\/user\/([\w.-]+)/);

  if (channelIdMatch) {
    return fetchChannelById(channelIdMatch[1]);
  }
  if (handleMatch) {
    const data = await apiFetch("/youtube/search", { q: `@${handleMatch[1]}`, type: "channel", maxResults: "1" });
    const items = data.items;
    if (!Array.isArray(items) || items.length === 0) throw new Error("Channel not found");
    const first = items[0] as { snippet?: { channelId?: string } };
    const id = first.snippet?.channelId;
    if (!id) throw new Error("Channel not found");
    return fetchChannelById(id);
  }
  if (customUrlMatch || userMatch) {
    const name = (customUrlMatch?.[1] ?? userMatch?.[1]) as string;
    const data = await apiFetch("/youtube/search", { q: name, type: "channel", maxResults: "1" });
    const items = data.items;
    if (!Array.isArray(items) || items.length === 0) throw new Error("Channel not found");
    const first = items[0] as { snippet?: { channelId?: string } };
    const id = first.snippet?.channelId;
    if (!id) throw new Error("Channel not found");
    return fetchChannelById(id);
  }
  if (!trimmed.startsWith("http")) {
    const data = await apiFetch("/youtube/search", { q: trimmed, type: "channel", maxResults: "1" });
    const items = data.items;
    if (!Array.isArray(items) || items.length === 0) throw new Error("Channel not found");
    const first = items[0] as { snippet?: { channelId?: string } };
    const id = first.snippet?.channelId;
    if (!id) throw new Error("Channel not found");
    return fetchChannelById(id);
  }

  throw new Error("Could not parse channel URL. Try pasting the full URL (e.g. youtube.com/@handle).");
}

async function fetchChannelById(channelId: string): Promise<Channel> {
  const data = await apiFetch("/youtube/channels", { id: channelId, part: "snippet,contentDetails" });
  const items = data.items;
  if (!Array.isArray(items) || items.length === 0) throw new Error("Channel not found");
  const ch = items[0] as {
    id: string;
    snippet: { title: string; thumbnails?: { high?: { url?: string }; default?: { url?: string } } };
    contentDetails: { relatedPlaylists: { uploads: string } };
  };
  return {
    id: ch.id,
    title: ch.snippet.title,
    thumbnail: ch.snippet.thumbnails?.high?.url ?? ch.snippet.thumbnails?.default?.url ?? "",
    uploadsPlaylistId: ch.contentDetails.relatedPlaylists.uploads,
  };
}

export async function fetchVideosFromPlaylist(
  uploadsPlaylistId: string,
  maxResults = 15,
  pageToken?: string
): Promise<PlaylistPage> {
  const params: Record<string, string> = {
    playlistId: uploadsPlaylistId,
    maxResults: String(maxResults),
  };
  if (pageToken) params.pageToken = pageToken;

  const data = await apiFetch("/youtube/playlistItems", params);

  const rawItems = data.items;
  const items = Array.isArray(rawItems) ? rawItems : [];

  const videos: Video[] = items.map((item: unknown) => {
    const row = item as {
      snippet: {
        resourceId: { videoId: string };
        title: string;
        channelId?: string;
        channelTitle?: string;
        videoOwnerChannelTitle?: string;
        thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
        publishedAt: string;
      };
    };
    return {
      id: row.snippet.resourceId.videoId,
      title: row.snippet.title,
      channelId: row.snippet.channelId ?? "",
      channelTitle: row.snippet.channelTitle ?? row.snippet.videoOwnerChannelTitle ?? "",
      thumbnail:
        row.snippet.thumbnails?.high?.url ??
        row.snippet.thumbnails?.medium?.url ??
        row.snippet.thumbnails?.default?.url ??
        "",
      publishedAt: row.snippet.publishedAt,
    };
  });

  const next = data.nextPageToken;
  return { videos, nextPageToken: typeof next === "string" ? next : undefined };
}

export function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diff = now - then;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  if (diff < hour) { const m = Math.floor(diff / minute); return `${m} ${m === 1 ? "minute" : "minutes"} ago`; }
  if (diff < day) { const h = Math.floor(diff / hour); return `${h} ${h === 1 ? "hour" : "hours"} ago`; }
  if (diff < week) { const d = Math.floor(diff / day); return `${d} ${d === 1 ? "day" : "days"} ago`; }
  if (diff < month) { const w = Math.floor(diff / week); return `${w} ${w === 1 ? "week" : "weeks"} ago`; }
  if (diff < year) { const mo = Math.floor(diff / month); return `${mo} ${mo === 1 ? "month" : "months"} ago`; }
  const y = Math.floor(diff / year); return `${y} ${y === 1 ? "year" : "years"} ago`;
}
