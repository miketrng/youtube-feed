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

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;

function apiUrl(path: string) {
  if (DOMAIN) {
    return `https://${DOMAIN}/api${path}`;
  }
  return `/api${path}`;
}

async function apiFetch(path: string, params: Record<string, string>): Promise<any> {
  const query = new URLSearchParams(params).toString();
  const url = `${apiUrl(path)}?${query}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? `API error ${res.status}`);
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
    if (!data.items?.length) throw new Error("Channel not found");
    return fetchChannelById(data.items[0].snippet.channelId);
  }
  if (customUrlMatch || userMatch) {
    const name = (customUrlMatch?.[1] ?? userMatch?.[1]) as string;
    const data = await apiFetch("/youtube/search", { q: name, type: "channel", maxResults: "1" });
    if (!data.items?.length) throw new Error("Channel not found");
    return fetchChannelById(data.items[0].snippet.channelId);
  }
  if (!trimmed.startsWith("http")) {
    const data = await apiFetch("/youtube/search", { q: trimmed, type: "channel", maxResults: "1" });
    if (!data.items?.length) throw new Error("Channel not found");
    return fetchChannelById(data.items[0].snippet.channelId);
  }

  throw new Error("Could not parse channel URL. Try pasting the full URL (e.g. youtube.com/@handle).");
}

async function fetchChannelById(channelId: string): Promise<Channel> {
  const data = await apiFetch("/youtube/channels", { id: channelId, part: "snippet,contentDetails" });
  if (!data.items?.length) throw new Error("Channel not found");
  const ch = data.items[0];
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

  const videos: Video[] = (data.items ?? []).map((item: any) => ({
    id: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    channelId: item.snippet.channelId ?? "",
    channelTitle: item.snippet.channelTitle ?? item.snippet.videoOwnerChannelTitle ?? "",
    thumbnail:
      item.snippet.thumbnails?.high?.url ??
      item.snippet.thumbnails?.medium?.url ??
      item.snippet.thumbnails?.default?.url ??
      "",
    publishedAt: item.snippet.publishedAt,
  }));

  return { videos, nextPageToken: data.nextPageToken };
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
