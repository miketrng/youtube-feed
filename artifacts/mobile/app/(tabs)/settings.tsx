import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useChannels } from "@/context/ChannelsContext";
import { useColors } from "@/hooks/useColors";
import { StoredChannel, resolveChannelFromUrl } from "@/services/youtube";

export default function SettingsScreen() {
  const colors = useColors();
  const { channels, addChannel, removeChannel } = useChannels();
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setAdding(true);
    setError(null);
    try {
      const channel = await resolveChannelFromUrl(trimmed);
      const already = channels.some((c) => c.id === channel.id);
      if (already) {
        setError("Channel already added.");
        setAdding(false);
        return;
      }
      const stored: StoredChannel = {
        ...channel,
        addedAt: new Date().toISOString(),
      };
      await addChannel(stored);
      setUrl("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e?.message ?? "Failed to find channel. Check the URL and try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = (channel: StoredChannel) => {
    Alert.alert(
      "Remove Channel",
      `Remove "${channel.title}" from your feed?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeChannel(channel.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.container}>
        {/* Add Channel Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            ADD CHANNEL
          </Text>
          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: colors.card,
                borderColor: error ? colors.destructive : colors.border,
              },
            ]}
          >
            <Feather
              name="link"
              size={16}
              color={colors.mutedForeground}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="https://youtube.com/@channel"
              placeholderTextColor={colors.mutedForeground}
              value={url}
              onChangeText={(t) => {
                setUrl(t);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity
              onPress={handleAdd}
              disabled={adding || !url.trim()}
              style={[
                styles.addButton,
                {
                  backgroundColor:
                    adding || !url.trim() ? colors.muted : colors.primary,
                },
              ]}
              activeOpacity={0.8}
            >
              {adding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="plus" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          {error && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error}
            </Text>
          )}
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Paste a channel URL like youtube.com/@handle or youtube.com/c/Name
          </Text>
        </View>

        {/* Subscribed Channels */}
        {channels.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              SUBSCRIBED ({channels.length})
            </Text>
          </View>
        )}

        <FlatList
          data={channels}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChannelRow
              channel={item}
              onRemove={() => handleRemove(item)}
              colors={colors}
            />
          )}
          contentContainerStyle={styles.channelList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.noChannels}>
              <Feather name="tv" size={32} color={colors.mutedForeground} />
              <Text style={[styles.noChannelsText, { color: colors.mutedForeground }]}>
                No channels yet. Add one above.
              </Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function ChannelRow({
  channel,
  onRemove,
  colors,
}: {
  channel: StoredChannel;
  onRemove: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={[
        styles.channelRow,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {channel.thumbnail ? (
        <Image
          source={{ uri: channel.thumbnail }}
          style={styles.channelAvatar}
        />
      ) : (
        <View
          style={[
            styles.channelAvatar,
            styles.channelAvatarPlaceholder,
            { backgroundColor: colors.secondary },
          ]}
        >
          <Feather name="youtube" size={20} color={colors.mutedForeground} />
        </View>
      )}
      <View style={styles.channelInfo}>
        <Text
          style={[styles.channelTitle, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {channel.title}
        </Text>
        <Text style={[styles.channelAdded, { color: colors.mutedForeground }]}>
          Added{" "}
          {new Date(channel.addedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
      </View>
      <Pressable
        onPress={onRemove}
        style={({ pressed }) => [
          styles.removeButton,
          { opacity: pressed ? 0.6 : 1 },
        ]}
        hitSlop={8}
      >
        <Feather name="trash-2" size={18} color={colors.destructive} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 12,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 1,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
  },
  hint: {
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
  },
  channelList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  channelAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  channelAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  channelInfo: {
    flex: 1,
    gap: 3,
  },
  channelTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  channelAdded: {
    fontSize: 12,
  },
  removeButton: {
    padding: 4,
  },
  noChannels: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
    gap: 12,
  },
  noChannelsText: {
    fontSize: 14,
    textAlign: "center",
  },
});
