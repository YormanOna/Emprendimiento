// app/pages/_layout.tsx
import { Stack } from 'expo-router';

export default function PagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="admin" />
      <Stack.Screen name="doctor" />
      <Stack.Screen name="caregiver" />
      <Stack.Screen name="family" />
      <Stack.Screen name="senior" />
    </Stack>
  );
}
