import Colors from '@/constants/Colors';
import { ShadowButtonStyle } from '@/constants/Shadow';
import i18n from '@/locales/i18n';
import cn from '@/utils/cn';
import { Link } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Pressable, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NewFarmerButton() {
  return (
    <Link href="/(app)/(farmers)/new-farmer" className="mb-5" asChild>
      <Pressable>
        {({ pressed }) => (
          <View
            className={cn(
              pressed ? 'bg-Orange' : 'bg-Orange',
              'flex flex-row justify-center items-center p-3 m-5 rounded-md'
            )}
          >
            <Plus color={Colors.white} />
            <View className="w-2" />
            <Text className="text-[16px] text-White font-semibold">
              {i18n.t('farmers.newFarmer')}
            </Text>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

export const ButtonWrapper = ({ children }: any) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="absolute w-full"
      style={[
        ShadowButtonStyle,
        { bottom: 0, paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      {children}
    </View>
  );
};
