import { WifiOff } from 'lucide-react-native';
import { Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import i18n from '@/locales/i18n';
import type { NetworkState } from '@/utils/network';

type NetworkNoticeProps = {
  networkState: NetworkState;
};

/**
 * Non-blocking hint shown on the home screen while the device has no
 * internet. It follows the pattern of OfflineMapNotice and only appears for a
 * network that is known to be offline, so an unanswered probe does not flash a
 * false warning.
 */
export default function NetworkNotice({ networkState }: NetworkNoticeProps) {
  if (networkState !== 'offline') {
    return null;
  }

  return (
    <View
      testID="network-notice"
      className="mx-5 mb-1 flex flex-row items-center rounded-md border border-LightGray bg-White p-3"
    >
      <WifiOff color={Colors.orange} size={20} />
      <Text className="flex-1 mx-3 text-[14px]">
        {i18n.t('home.networkNotice.offline')}
      </Text>
    </View>
  );
}
