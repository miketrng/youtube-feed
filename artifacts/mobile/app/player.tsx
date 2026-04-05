import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { useColors } from "@/hooks/useColors";

// Spoof Safari so YouTube embed doesn't detect app WebView (error 153).
const SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
  "Version/17.4 Mobile/15E148 Safari/604.1";

export default function PlayerScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
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
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Full-screen video */}
      {error ? (
        <View style={[styles.errorContainer, { backgroundColor: "#000" }]}>
          <Feather name="alert-circle" size={40} color="#909090" />
          <Pressable
            onPress={() => {
              setError(false);
              setLoading(true);
              webRef.current?.reload();
            }}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
          >
            <Feather name="refresh-cw" size={16} color="#fff" />
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

      {/* Floating back button — top-left over the video */}
      <Pressable
        onPress={() => router.back()}
        style={[
          styles.backButton,
          { top: insets.top + 12 },
        ]}
        hitSlop={12}
      >
        <Feather name="arrow-left" size={20} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
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
  backButton: {
    position: "absolute",
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  retryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
