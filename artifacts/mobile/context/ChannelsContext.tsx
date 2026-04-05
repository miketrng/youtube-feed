import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  StoredChannel,
  Video,
  fetchVideosFromPlaylist,
} from "@/services/youtube";

const STORAGE_KEY = "@curated_yt_channels";

interface ChannelsContextValue {
  channels: StoredChannel[];
  videos: Video[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  addChannel: (channel: StoredChannel) => Promise<void>;
  removeChannel: (channelId: string) => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

const ChannelsContext = createContext<ChannelsContextValue | null>(null);

function sortVideos(vids: Video[]): Video[] {
  return [...vids].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function ChannelsProvider({ children }: { children: React.ReactNode }) {
  const [channels, setChannels] = useState<StoredChannel[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // nextPageToken per uploadsPlaylistId
  const pageTokensRef = useRef<Record<string, string | undefined>>({});

  const hasMore = Object.values(pageTokensRef.current).some((t) => !!t);

  const loadChannels = useCallback(async (): Promise<StoredChannel[]> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: StoredChannel[] = JSON.parse(raw);
        setChannels(parsed);
        return parsed;
      }
    } catch {}
    return [];
  }, []);

  const fetchAllVideos = useCallback(async (chs: StoredChannel[]) => {
    if (chs.length === 0) {
      setVideos([]);
      pageTokensRef.current = {};
      return;
    }
    try {
      const results = await Promise.all(
        chs.map((ch) => fetchVideosFromPlaylist(ch.uploadsPlaylistId, 15))
      );
      const tokens: Record<string, string | undefined> = {};
      const all: Video[] = [];
      results.forEach((page, i) => {
        all.push(...page.videos);
        tokens[chs[i].uploadsPlaylistId] = page.nextPageToken;
      });
      pageTokensRef.current = tokens;
      setVideos(sortVideos(all));
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const chs = await loadChannels();
      await fetchAllVideos(chs);
      setLoading(false);
    })();
  }, [loadChannels, fetchAllVideos]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const chs = await loadChannels();
    await fetchAllVideos(chs);
    setRefreshing(false);
  }, [loadChannels, fetchAllVideos]);

  const loadMore = useCallback(async () => {
    const tokens = pageTokensRef.current;
    const channelsWithMore = channels.filter((ch) => !!tokens[ch.uploadsPlaylistId]);
    if (channelsWithMore.length === 0 || loadingMore) return;

    setLoadingMore(true);
    try {
      const results = await Promise.all(
        channelsWithMore.map((ch) =>
          fetchVideosFromPlaylist(ch.uploadsPlaylistId, 15, tokens[ch.uploadsPlaylistId])
        )
      );
      const newTokens = { ...pageTokensRef.current };
      const newVideos: Video[] = [];
      results.forEach((page, i) => {
        newVideos.push(...page.videos);
        newTokens[channelsWithMore[i].uploadsPlaylistId] = page.nextPageToken;
      });
      pageTokensRef.current = newTokens;
      setVideos((prev) => {
        const ids = new Set(prev.map((v) => v.id));
        const unique = newVideos.filter((v) => !ids.has(v.id));
        return sortVideos([...prev, ...unique]);
      });
    } catch {}
    setLoadingMore(false);
  }, [channels, loadingMore]);

  const addChannel = useCallback(async (channel: StoredChannel) => {
    setChannels((prev) => {
      const exists = prev.some((c) => c.id === channel.id);
      if (exists) return prev;
      const next = [...prev, channel];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    const page = await fetchVideosFromPlaylist(channel.uploadsPlaylistId, 15);
    pageTokensRef.current = {
      ...pageTokensRef.current,
      [channel.uploadsPlaylistId]: page.nextPageToken,
    };
    setVideos((prev) => {
      const ids = new Set(prev.map((v) => v.id));
      const unique = page.videos.filter((v) => !ids.has(v.id));
      return sortVideos([...prev, ...unique]);
    });
  }, []);

  const removeChannel = useCallback(async (channelId: string) => {
    setChannels((prev) => {
      const ch = prev.find((c) => c.id === channelId);
      if (ch) {
        const tokens = { ...pageTokensRef.current };
        delete tokens[ch.uploadsPlaylistId];
        pageTokensRef.current = tokens;
      }
      const next = prev.filter((c) => c.id !== channelId);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    setVideos((prev) => prev.filter((v) => v.channelId !== channelId));
  }, []);

  return (
    <ChannelsContext.Provider
      value={{
        channels,
        videos,
        loading,
        refreshing,
        loadingMore,
        hasMore,
        addChannel,
        removeChannel,
        refresh,
        loadMore,
      }}
    >
      {children}
    </ChannelsContext.Provider>
  );
}

export function useChannels(): ChannelsContextValue {
  const ctx = useContext(ChannelsContext);
  if (!ctx) throw new Error("useChannels must be used within ChannelsProvider");
  return ctx;
}
