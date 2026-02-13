import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../theme";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: focused ? "🏠" : "🏡",
    practice: focused ? "♟️" : "♙",
    settings: focused ? "⚙️" : "⚙",
  };
  return <Text style={{ fontSize: 20 }}>{icons[name] || "📱"}</Text>;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: t("tabs.practice"),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="practice" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
