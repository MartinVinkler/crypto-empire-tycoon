import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useSFX } from "@/hooks/useSFX";

function TabIcon({
  name,
  color,
  focused,
  glow,
}: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  focused: boolean;
  glow: string;
}) {
  return (
    <View style={styles.iconWrap}>
      <MaterialCommunityIcons
        name={name}
        size={22}
        color={color}
        style={
          focused
            ? Platform.OS === "web"
              ? { textShadow: `0 0 12px ${glow}` } as object
              : { textShadowColor: glow, textShadowRadius: 12 }
            : undefined
        }
      />
      {focused ? (
        <View style={styles.particleRow}>
          <View style={[styles.dotL, { backgroundColor: glow, shadowColor: glow }]} />
          <View style={[styles.dotS, { backgroundColor: glow, shadowColor: glow }]} />
        </View>
      ) : (
        <View style={styles.dotPlaceholder} />
      )}
    </View>
  );
}

export default function TabLayout() {
  const c = useColors();
  const { playClick } = useSFX();
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.neon,
        tabBarInactiveTintColor: c.textMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.bgElevated,
          borderTopColor: c.border,
          borderTopWidth: 1,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () => (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: c.bgElevated },
            ]}
          />
        ),
        tabBarLabelStyle: {
          fontFamily: "Inter_700Bold",
          fontSize: 9,
          letterSpacing: 1.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={{ tabPress: () => playClick() }}
        options={{
          title: "MINE",
          tabBarActiveTintColor: "#39FF14",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="hammer" color={color} focused={focused} glow="#39FF14" />
          ),
        }}
      />
      <Tabs.Screen
        name="trade"
        listeners={{ tabPress: () => playClick() }}
        options={{
          title: "TRADE",
          tabBarActiveTintColor: "#00E5FF",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="chart-line"
              color={color}
              focused={focused}
              glow="#00E5FF"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="upgrades"
        listeners={{ tabPress: () => playClick() }}
        options={{
          title: "UPGRADES",
          tabBarActiveTintColor: "#FF6B35",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="chip" color={color} focused={focused} glow="#FF6B35" />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        listeners={{ tabPress: () => playClick() }}
        options={{
          title: "PROPERTY",
          tabBarActiveTintColor: "#3B82F6",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="map-marker" color={color} focused={focused} glow="#3B82F6" />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        listeners={{ tabPress: () => playClick() }}
        options={{
          title: "PORTFOLIO",
          tabBarActiveTintColor: "#F59E0B",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="briefcase" color={color} focused={focused} glow="#F59E0B" />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        listeners={{ tabPress: () => playClick() }}
        options={{
          title: "AI",
          tabBarActiveTintColor: "#EC4899",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="robot" color={color} focused={focused} glow="#EC4899" />
          ),
        }}
      />
      <Tabs.Screen
        name="pass"
        listeners={{ tabPress: () => playClick() }}
        options={{
          title: "PASS",
          tabBarActiveTintColor: "#A855F7",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="crown-outline" color={color} focused={focused} glow="#A855F7" />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        listeners={{ tabPress: () => playClick() }}
        options={{
          title: "SHOP",
          tabBarActiveTintColor: "#FFD700",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="cart" color={color} focused={focused} glow="#FFD700" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        listeners={{ tabPress: () => playClick() }}
        options={{
          title: "SETTINGS",
          tabBarActiveTintColor: "#94A3B8",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="cog" color={color} focused={focused} glow="#94A3B8" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  particleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  dotL: {
    width: 4,
    height: 4,
    borderRadius: 2,
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  dotS: {
    width: 2,
    height: 2,
    borderRadius: 1,
    opacity: 0.7,
    shadowOpacity: 0.7,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  dotPlaceholder: {
    height: 7,
    marginTop: 0,
  },
});
