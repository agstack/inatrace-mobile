import { Link } from 'expo-router';
import { Pressable, View, Text } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import cn from '@/utils/cn';
import i18n from '@/locales/i18n';
import Colors from '@/constants/Colors';

export default function SyncDataButton() {
  return (
    <Link href="/data-sync" className="mb-5" asChild>
      <Pressable>
        {({ pressed }) => (
          <View
            className={cn(
              pressed ? 'bg-LightOrange' : 'bg-Orange',
              'flex flex-row justify-center items-center p-3 m-5 rounded-md'
            )}
          >
            <RefreshCw color={Colors.white} />
            <View className="w-2" />
            <Text className="text-[16px] text-White font-semibold">
              {i18n.t('home.syncData')}
            </Text>
          </View>
        )}
      </Pressable>
    </Link>
  );
}
