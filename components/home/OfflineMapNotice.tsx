import { router } from 'expo-router';
import { ChevronRight, Download } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import i18n from '@/locales/i18n';
import type { OfflineMapStatus } from '@/utils/offlineMaps';

type OfflineMapNoticeProps = {
  status: OfflineMapStatus;
  isConnected?: boolean;
};

const MESSAGES = {
  none: 'home.offlineMapNotice.none',
  noneOffline: 'home.offlineMapNotice.noneOffline',
  downloading: 'home.offlineMapNotice.downloading',
  expired: 'home.offlineMapNotice.expired',
} as const;

const ACTIONS = {
  none: 'home.offlineMapNotice.download',
  downloading: 'home.offlineMapNotice.view',
  expired: 'home.offlineMapNotice.update',
} as const;

/**
 * Non-blocking hint shown on the home screen when there is no usable offline
 * map. It never redirects on its own: the user opens Map download by choice.
 */
export default function OfflineMapNotice({
  status,
  isConnected = true,
}: OfflineMapNoticeProps) {
  if (status !== 'none' && status !== 'downloading' && status !== 'expired') {
    return null;
  }

  const message =
    status === 'none' && !isConnected ? MESSAGES.noneOffline : MESSAGES[status];

  return (
    <View className="mx-5 mb-1 flex flex-row items-center rounded-md border border-LightGray bg-White p-3">
      <Download color={Colors.orange} size={20} />
      <Text className="flex-1 mx-3 text-[14px]">{i18n.t(message)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={i18n.t(ACTIONS[status])}
        onPress={() => router.push('/map-download')}
        className="flex flex-row items-center"
      >
        <Text className="text-[14px] font-semibold text-Orange">
          {i18n.t(ACTIONS[status])}
        </Text>
        <ChevronRight color={Colors.orange} size={16} />
      </Pressable>
    </View>
  );
}
