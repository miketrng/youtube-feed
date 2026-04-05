import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import YoutubeIframe from "react-native-youtube-iframe";

import { useColors } from "@/hooks/useColors";

// Safari UA used only for the web fallback iframe
const SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
  "Version/17.4 Mobile/15E148 Safari/604.1";

export default function PlayerScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);

  const onReady = useCallback(() => setReady(true), []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Video fills the screen */}
      <View style={styles.playerWrapper}>
        {!ready && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {Platform.OS === "web" ? (
          // Web fallback: plain iframe (works in browser preview)
          <iframe
            src={
              `https://www.youtube.com/embed/${videoId}` +
              `?autoplay=1&rel=0&modestbranding=1&playsinline=1`
            }
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setReady(true)}
          />
        ) : (
          <YoutubeIframe
            videoId={videoId ?? ""}
            height={300}
            play={true}
            onReady={onReady}
            webViewStyle={styles.webview}
            webViewProps={{
              userAgent: SAFARI_UA,
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
            }}
          />
        )}
      </View>

      {/* Floating back button */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.backButton, { top: insets.top + 12 }]}
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
  playerWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  webview: {
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
});
