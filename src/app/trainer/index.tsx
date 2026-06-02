import { Redirect } from 'expo-router';

/**
 * `/trainer` redirects to the Clients tab — the trainer's primary landing (D-1).
 * Deep-link safety: anything still pointing at `/trainer` lands on `/trainer/clients`.
 */
export default function Index() {
  return <Redirect href="/trainer/clients" />;
}
