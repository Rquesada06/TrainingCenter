import { Tabs } from 'expo-router';

/**
 * Trainer tab shell — Phase 02 Plan 01 (D-1).
 * Five tabs in order: Clients | Exercises | Routines | Programs | Profile.
 * The Clients tab is the trainer's primary landing; `/trainer` redirects to it.
 */
export default function TrainerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0E0E0E' },
        tabBarActiveTintColor: '#00FF66',
        tabBarInactiveTintColor: '#888888',
      }}
    >
      <Tabs.Screen name="clients" options={{ title: 'Clients' }} />
      <Tabs.Screen name="exercises" options={{ title: 'Exercises' }} />
      <Tabs.Screen name="routines" options={{ title: 'Routines' }} />
      <Tabs.Screen name="programs" options={{ title: 'Programs' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      {/* `index` is a redirect-only route; hide it from the tab bar. */}
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
