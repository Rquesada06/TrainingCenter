import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const tabIcon =
  (name: IoniconName) =>
  ({ color, size }: { color: string; size: number }) =>
    <Ionicons name={name} size={size} color={color} />;

export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0E0E0E', borderTopColor: '#1A1A1A' },
        tabBarActiveTintColor: '#00FF66',
        tabBarInactiveTintColor: '#888888',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: tabIcon('home-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person-outline') }}
      />
    </Tabs>
  );
}
