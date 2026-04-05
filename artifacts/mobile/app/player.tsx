import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { useColors } from "@/hooks/useColors";

// Spoof a real iOS Safari user agent so YouTube's embed player
// doesn't detect "app WebView" and refuse playback (error 153).
const SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
  "Version/17.4 Mobile/15E148 Safari/604.1";

export default function PlayerScreen() {
  const { videoId, title } = useLocalSearchParams<{
    videoId: string;
    title: string;
  }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const webRef = useRef<WebView>(null);

  const embedUrl =
    `https://www.youtube.com/embed/${videoId}` +
    `?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, backgroundColor: "#000" },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            {
              opacity: pressed ? 0.6 : 1,
              backgroundColor: "rgba(255,255,255,0.12)",
            },
          ]}
          hitSlop={8}
        >
          <Feather name="x" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title ?? ""}
        </Text>
        {/* Spacer to keep title centred */}
        <View style={styles.backButton} />
      </View>

      {/* Video player */}
      <View style={styles.playerWrapper}>
        {error ? (
          <View style={styles.errorContainer}>
            <Feather name="alert-circle" size={40} color="#909090" />
            <Text style={styles.errorText}>Unable to load video</Text>
            <Pressable
              onPress={() => {
                setError(false);
                setLoading(true);
                webRef.current?.reload();
              }}
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}

            {Platform.OS === "web" ? (
              <iframe
                src={embedUrl}
                style={{ width: "100%", height: "100%", border: "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => setLoading(false)}
              />
            ) : (
              <WebView
                ref={webRef}
                source={{ uri: embedUrl }}
                style={styles.webview}
                userAgent={SAFARI_UA}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                allowsFullscreenVideo
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={["*"]}
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError(true);
                }}
              />
            )}
          </>
        )}
      </View>

      {/* Bottom safe area */}
      <View style={{ height: insets.bottom, backgroundColor: "#000" }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
    textAlign: "center",
  },
  playerWrapper: {
    flex: 1,
    position: "relative",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    zIndex: 10,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  errorText: {
    color: "#909090",
    fontSize: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600" as const,
  },
});
