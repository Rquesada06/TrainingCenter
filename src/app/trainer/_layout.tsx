import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Trainer tab shell — Phase 02 Plan 01 (D-1).
 * Five tabs in order: Clients | Exercises | Routines | Programs | Profile.
 * The Clients tab is the trainer's primary landing; `/trainer` redirects to it.
 */
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const tabIcon =
  (name: IoniconName) =>
  ({ color, size }: { color: string; size: number }) =>
    <Ionicons name={name} size={size} color={color} />;

export default function TrainerLayout() {
  // Android edge-to-edge (SDK 55 default) draws behind the system nav bar —
  // reserve its height so the tab bar isn't hidden behind back/home/recents.
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0E0E0E',
          borderTopColor: '#1A1A1A',
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
        },
        tabBarActiveTintColor: '#00FF66',
        tabBarInactiveTintColor: '#888888',
      }}
    >
      <Tabs.Screen
        name="clients"
        options={{ title: 'Clients', tabBarIcon: tabIcon('people-outline') }}
      />
      <Tabs.Screen
        name="exercises"
        options={{ title: 'Exercises', tabBarIcon: tabIcon('barbell-outline') }}
      />
      <Tabs.Screen
        name="routines"
        options={{ title: 'Routines', tabBarIcon: tabIcon('list-outline') }}
      />
      <Tabs.Screen
        name="programs"
        options={{ title: 'Programs', tabBarIcon: tabIcon('calendar-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person-outline') }}
      />
      {/* `index` is a redirect-only route; hide it from the tab bar. */}
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
