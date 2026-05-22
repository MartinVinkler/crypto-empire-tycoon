import { useSettings } from "@/context/SettingsContext";
import colors from "@/constants/colors";

/**
 * Returns design tokens for the user-selected theme (dark / light).
 * The theme is stored in SettingsContext and persisted to AsyncStorage.
 */
export function useColors() {
  const { isDark } = useSettings();
  const palette = isDark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
