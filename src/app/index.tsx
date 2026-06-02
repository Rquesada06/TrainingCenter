import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { uid, role, isLoaded } = useAuthStore();

  if (!isLoaded) return null;
  if (uid && role === 'trainer') return <Redirect href="/trainer" />;
  if (uid && role === 'client') return <Redirect href="/client" />;
  return <Redirect href="/sign-in" />;
}
