import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface AssetImageProps {
  iconLib: "MaterialCommunityIcons" | "Ionicons" | "FontAwesome5" | "Feather";
  icon: string;
  color: string;
  size?: number;
}

/**
 * Stylized colored container with a vector icon.
 * Drop-in replacement target: swap children for an <Image source={require(...)} />
 * once local PNGs (gpu.png, server.png, ...) are added.
 */
export function AssetImage({ iconLib, icon, color, size = 56 }: AssetImageProps) {
  const c = useColors();
  const iconSize = Math.round(size * 0.55);

  const renderIcon = () => {
    const props = { name: icon as never, size: iconSize, color };
    switch (iconLib) {
      case "Ionicons":
        return <Ionicons {...props} />;
      case "FontAwesome5":
        return <FontAwesome5 {...props} />;
      case "Feather":
        return <Feather {...props} />;
      default:
        return <MaterialCommunityIcons {...props} />;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: 12,
          borderColor: color + "55",
          backgroundColor: c.bgElevated,
          shadowColor: color,
        },
      ]}
    >
      <LinearGradient
        colors={[color + "22", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      {renderIcon()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
