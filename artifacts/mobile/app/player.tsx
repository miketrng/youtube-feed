import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import YoutubeIframe, { YoutubeIframeRef } from "react-native-youtube-iframe";
import { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";

import { useColors } from "@/hooks/useColors";


export default function PlayerScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const playerRef = useRef<YoutubeIframeRef>(null);
  const { width, height } = useWindowDimensions();
  const [ready, setReady] = useState(false);

  // Lock to landscape on open, restore portrait on leave
  useEffect(() => {
    if (Platform.OS === "web") return;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    };
  }, []);

  const handleBack = useCallback(async () => {
    if (Platform.OS !== "web") {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(() => {});
    }
    router.back();
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" hidden />

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
          ref={playerRef}
          height={height}
          width={width}
          videoId={videoId ?? ""}
          play={true}
          initialPlayerParams={{
            preventFullScreen: false,
            rel: 0,
            modestbranding: 1,
            controls: 1,
          }}
          onReady={() => setReady(true)}
          webViewProps={{
            allowsFullscreenVideo: true,
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
            scalesPageToFit: false,
            bounces: false,
            scrollEnabled: false,
            onShouldStartLoadWithRequest: (request: ShouldStartLoadRequest) => {
              const url = request.url;
              // Block navigation to YouTube watch pages or app deep links
              if (
                url.includes("youtube.com/watch") ||
                url.includes("youtu.be/") ||
                url.startsWith("intent://") ||
                url.startsWith("vnd.youtube://")
              ) {
                return false;
              }
              return true;
            },
          }}
        />
      )}

      {/* Floating back button */}
      <Pressable
        onPress={handleBack}
        style={[
          styles.backButton,
          { top: insets.top + 8, left: insets.left + 12 },
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
