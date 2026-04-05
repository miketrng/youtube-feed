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

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  // Block any navigation away from the embed (title/logo taps try to open youtube.com/watch).
  // Only the embed URL itself and youtube.com/* resources needed for playback are allowed.
  const handleNavigationRequest = ({ url }: { url: string }) => {
    if (url.includes("youtube.com/embed/")) return true;
    if (url.includes("youtube.com/api/") || url.includes("googlevideo.com")) return true;
    if (url.startsWith("about:") || url.startsWith("data:")) return true;
    // Block watch pages, homepage, logo taps, etc.
    return false;
  };

  // Neutralise clickable overlays (title, watermark) directly inside the player page.
  const injectedJS = `
    (function() {
      window.open = function() { return null; };
      function disableLinks() {
        document.querySelectorAll(
          '.ytp-title-link, .ytp-watermark, .ytp-youtube-button'
        ).forEach(function(el) {
          el.style.pointerEvents = 'none';
          el.style.cursor = 'default';
          el.removeAttribute('href');
          el.removeAttribute('target');
        });
      }
      disableLinks();
      // Re-run after player fully initialises
      setTimeout(disableLinks, 2000);
      setTimeout(disableLinks, 5000);
    })();
    true;
  `;

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
            { opacity: pressed ? 0.6 : 1, backgroundColor: "rgba(255,255,255,0.12)" },
          ]}
          hitSlop={8}
        >
          <Feather name="x" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title ?? ""}
        </Text>
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
                sandbox="allow-scripts allow-same-origin allow-forms allow-fullscreen allow-presentation"
                onLoad={() => setLoading(false)}
              />
            ) : (
              <WebView
                ref={webRef}
                source={{ uri: embedUrl }}
                style={styles.webview}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                allowsFullscreenVideo
                javaScriptEnabled
                domStorageEnabled
                injectedJavaScript={injectedJS}
                onShouldStartLoadWithRequest={handleNavigationRequest}
                originWhitelist={["https://www.youtube.com", "https://*.youtube.com", "https://*.googlevideo.com"]}
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError(true);
                }}
                onHttpError={() => {
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
