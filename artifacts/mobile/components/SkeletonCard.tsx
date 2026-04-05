import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function SkeletonCard() {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  const bg = colors.card;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={[styles.thumbnail, { backgroundColor: bg, borderRadius: 8 }]} />
      <View style={styles.info}>
        <View style={[styles.titleLine, { backgroundColor: bg }]} />
        <View style={[styles.titleLineShort, { backgroundColor: bg }]} />
        <View style={[styles.metaLine, { backgroundColor: bg }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  thumbnail: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  info: {
    paddingTop: 10,
    paddingHorizontal: 2,
    gap: 8,
  },
  titleLine: {
    height: 14,
    borderRadius: 4,
    width: "90%",
  },
  titleLineShort: {
    height: 14,
    borderRadius: 4,
    width: "65%",
  },
  metaLine: {
    height: 12,
    borderRadius: 4,
    width: "40%",
  },
});
