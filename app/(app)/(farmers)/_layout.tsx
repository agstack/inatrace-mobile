import i18n from '@/locales/i18n';
import { Stack } from 'expo-router';
import HeaderBackButton from '@/components/common/HeaderBackButton';

export default function FarmersLayout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: { ios: false },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="[type]" options={{ headerShown: false }} />
      <Stack.Screen
        name="new-farmer"
        options={{
          presentation: 'modal',
          title: i18n.t('farmers.newFarmer'),
          headerLeft: () => <HeaderBackButton />,
        }}
      />
      <Stack.Screen
        name="info/[id]"
        options={{
          presentation: 'modal',
          headerLeft: () => <HeaderBackButton />,
        }}
      />
      <Stack.Screen
        name="info/edit-guest"
        options={{
          presentation: 'modal',
          headerLeft: () => <HeaderBackButton />,
        }}
      />
      <Stack.Screen
        name="view/[type]"
        options={{
          presentation: 'modal',
          title: i18n.t('plots.title'),
          headerLeft: () => <HeaderBackButton />,
        }}
      />
      <Stack.Screen
        name="view/add-plot"
        options={{
          presentation: 'modal',
          title: i18n.t('plots.addPlot.newPlot'),
          headerLeft: () => <HeaderBackButton />,
        }}
      />
    </Stack>
  );
}
