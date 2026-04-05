import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import YoutubeIframe from "react-native-youtube-iframe";

import { useColors } from "@/hooks/useColors";

const SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
  "Version/17.4 Mobile/15E148 Safari/604.1";

export default function PlayerScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [ready, setReady] = useState(false);

  // Auto-rotate to landscape when the player opens, restore on leave
  useEffect(() => {
    if (Platform.OS === "web") return;
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE
    ).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(() => {});
    };
  }, []);

  const onReady = useCallback(() => setReady(true), []);

  const handleBack = useCallback(async () => {
    if (Platform.OS !== "web") {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(() => {});
    }
    router.back();
  }, [router]);

  // In landscape, width > height — fill the full screen
  const playerWidth = Math.max(width, height);
  const playerHeight = Math.min(width, height);

  return (
    <View style={styles.container}>
      <StatusBar style="light" hidden />

      {/* Loading overlay */}
      {!ready && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {Platform.OS === "web" ? (
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
          width={playerWidth}
          height={playerHeight}
          play={true}
          onReady={onReady}
          webViewProps={{
            userAgent: SAFARI_UA,
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
            allowsFullscreenVideo: true,
          }}
        />
      )}

      {/* Floating back button */}
      <Pressable
        onPress={handleBack}
        style={[
          styles.backButton,
          {
            top: insets.top + 8,
            left: insets.left + 12,
          },
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
    alignItems: "center",
    justifyContent: "center",
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
});
