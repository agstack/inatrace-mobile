import i18n from '@/locales/i18n';
import { Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';
import Colors from '@/constants/Colors';

export default function FarmersLayout() {
  return (
    <Stack>
      <Stack.Screen name="[type]" options={{ headerShown: false }} />
      <Stack.Screen
        name="new-farmer"
        options={{
          presentation: 'modal',
          title: i18n.t('farmers.newFarmer'),
          headerLeft: () => <LeftHeader />,
        }}
      />
      <Stack.Screen name="info/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="info/edit-guest"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="view/[type]"
        options={{
          presentation: 'modal',
          title: i18n.t('plots.title'),
          headerLeft: () => <LeftHeader />,
        }}
      />
      <Stack.Screen
        name="view/add-plot"
        options={{
          presentation: 'modal',
          title: i18n.t('plots.addPlot.newPlot'),
          headerLeft: () => <LeftHeader />,
        }}
      />
    </Stack>
  );
}

const LeftHeader = () => (
  <Pressable className="flex flex-row justify-center items-center mr-3">
    <ChevronLeft color={Colors.orange} />
    <Text className="font-medium text-Orange text-[18px]">Back</Text>
  </Pressable>
);
