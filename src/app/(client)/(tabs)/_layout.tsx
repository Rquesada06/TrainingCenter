/**
 * Client tab navigator — Phase 01 Plan 02
 *
 * Two placeholder tabs: Home (index) and Profile.
 * Real tab content ships in Phases 3-4.
 */

import { Tabs } from 'expo-router';

export default function ClientTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0E0E0E' },
        tabBarActiveTintColor: '#00FF66',
        tabBarInactiveTintColor: '#888888',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
