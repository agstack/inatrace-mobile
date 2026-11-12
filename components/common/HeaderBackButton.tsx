import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Platform, Pressable, Text } from 'react-native';
import Colors from '@/constants/Colors';

export default function HeaderBackButton({
  onPress,
}: {
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={12}
      onPress={onPress ?? (() => router.back())}
      className="mr-3 flex flex-row items-center justify-center"
    >
      <ChevronLeft color={Colors.orange} size={24} />
      {Platform.OS !== 'ios' && (
        <Text className="font-medium text-Orange text-[18px]">Back</Text>
      )}
    </Pressable>
  );
}
