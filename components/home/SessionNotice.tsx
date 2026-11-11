import { router } from 'expo-router';
import { ChevronRight, LogIn, UserRound } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import type { SessionState } from '@/context/AuthContext';
import i18n from '@/locales/i18n';

type SessionNoticeProps = {
  state: SessionState;
  onGuest: () => void;
};

/**
 * Session prompt shown on the home screen instead of redirecting on launch.
 * The user chooses to log in or to continue as guest from here.
 */
export default function SessionNotice({ state, onGuest }: SessionNoticeProps) {
  if (state === 'authenticated' || state === 'unknown') return null;

  const message =
    state === 'guest'
      ? 'home.sessionNotice.guest'
      : state === 'expired'
        ? 'home.sessionNotice.expired'
        : 'home.sessionNotice.none';

  return (
    <View className="mx-5 mb-1 rounded-md border border-LightGray bg-White p-3">
      <View className="flex flex-row items-center">
        {state === 'guest' ? (
          <UserRound color={Colors.orange} size={20} />
        ) : (
          <LogIn color={Colors.orange} size={20} />
        )}
        <Text className="flex-1 mx-3 text-[14px]">{i18n.t(message)}</Text>
      </View>
      <View className="flex flex-row justify-end items-center mt-2">
        {state === 'none' && (
          <Pressable
            accessibilityRole="button"
            onPress={onGuest}
            className="mr-4"
          >
            <Text className="text-[14px] font-semibold text-Green">
              {i18n.t('home.sessionNotice.continueAsGuest')}
            </Text>
          </Pressable>
        )}
        {state !== 'guest' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/login')}
            className="flex flex-row items-center"
          >
            <Text className="text-[14px] font-semibold text-Orange">
              {i18n.t('home.sessionNotice.logIn')}
            </Text>
            <ChevronRight color={Colors.orange} size={16} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(app)/(farmers)/info/0')}
            className="flex flex-row items-center"
          >
            <Text className="text-[14px] font-semibold text-Orange">
              {i18n.t('home.sessionNotice.openGuestArea')}
            </Text>
            <ChevronRight color={Colors.orange} size={16} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
