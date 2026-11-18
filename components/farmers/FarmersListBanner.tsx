import { AlertCircle, WifiOff } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import i18n from '@/locales/i18n';
import type { FarmersBannerKey } from '@/utils/farmersList';

type FarmersListBannerProps = {
  messageKey: FarmersBannerKey;
  /** Shows the retry action. Only the stale warning offers it. */
  onRetry?: () => void;
};

/**
 * Notice shown above the farmer list when the rows came from the cache or a
 * refresh failed.
 *
 * `ListEmptyComponent` only runs for an empty list, so the messages about
 * cached or stale rows had no place to render before. This banner sits above
 * the rows and keeps the empty state for the cases where there is nothing to
 * show at all.
 */
export default function FarmersListBanner({
  messageKey,
  onRetry,
}: FarmersListBannerProps) {
  const offline = messageKey === 'farmers.offlineCached';
  const Icon = offline ? WifiOff : AlertCircle;

  return (
    <View
      testID="farmers-list-banner"
      className="mx-5 mt-1 mb-2 rounded-md border border-LightGray bg-White p-3"
    >
      <View className="flex flex-row items-center">
        <Icon color={Colors.orange} size={20} />
        <Text className="flex-1 mx-3 text-[14px]">{i18n.t(messageKey)}</Text>
      </View>
      {onRetry && !offline ? (
        <View className="flex flex-row justify-end items-center mt-2">
          <Pressable accessibilityRole="button" onPress={onRetry}>
            <Text className="text-[14px] font-semibold text-Orange">
              {i18n.t('farmers.retry')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
