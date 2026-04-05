import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  addChannel: (channel: StoredChannel) => Promise<void>;
  removeChannel: (channelId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ChannelsContext = createContext<ChannelsContextValue | null>(null);

export function ChannelsProvider({ children }: { children: React.ReactNode }) {
  const [channels, setChannels] = useState<StoredChannel[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadChannels = useCallback(async (): Promise<StoredChannel[]> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: StoredChannel[] = JSON.parse(raw);
        setChannels(parsed);
        return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }, []);

  const fetchAllVideos = useCallback(async (chs: StoredChannel[]) => {
    if (chs.length === 0) {
      setVideos([]);
      return;
    }
    try {
      const results = await Promise.all(
        chs.map((ch) => fetchVideosFromPlaylist(ch.uploadsPlaylistId, 15))
      );
      const all = results
        .flat()
        .sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime()
        );
      setVideos(all);
    } catch {
      // keep existing videos on error
    }
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

  const addChannel = useCallback(
    async (channel: StoredChannel) => {
      setChannels((prev) => {
        const exists = prev.some((c) => c.id === channel.id);
        if (exists) return prev;
        const next = [...prev, channel];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      // Also fetch videos for new channel
      const newVideos = await fetchVideosFromPlaylist(
        channel.uploadsPlaylistId,
        15
      );
      setVideos((prev) => {
        const combined = [...prev, ...newVideos];
        return combined.sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime()
        );
      });
    },
    []
  );

  const removeChannel = useCallback(async (channelId: string) => {
    setChannels((prev) => {
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
        addChannel,
        removeChannel,
        refresh,
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
