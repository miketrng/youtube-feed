import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import YoutubeIframe from "react-native-youtube-iframe";

export default function PlayerScreen() {
  const { videoId, title } = useLocalSearchParams<{
    videoId: string;
    title?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);

  const id = Array.isArray(videoId) ? videoId[0] : videoId;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" hidden />

      {Platform.OS === "web" ? (
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
          style={{ width: "100%", height: "100%", border: "none" }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <>
          <View style={styles.player}>
            {!ready && (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
            <YoutubeIframe
              videoId={id}
              play
              onReady={() => setReady(true)}
              initialPlayerParams={{ rel: false, controls: true, fs: true }}
            />
          </View>

          {title ? (
            <Text style={styles.title} numberOfLines={3}>
              {Array.isArray(title) ? title[0] : title}
            </Text>
          ) : null}
        </>
      )}

      <Pressable
        onPress={() => router.back()}
        style={[styles.back, { top: insets.top + 8 }]}
        hitSlop={12}
      >
        <Feather name="arrow-left" size={20} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
  },
  player: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    padding: 16,
  },
  back: {
    position: "absolute",
    left: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
