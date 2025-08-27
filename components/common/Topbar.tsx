import { AuthContext } from '@/context/AuthContext';
import cn from '@/utils/cn';
import { Link } from 'expo-router';
import { ChevronLeft, Info, User2 } from 'lucide-react-native';
import { useContext } from 'react';
import { View, Text, Pressable } from 'react-native';
import i18n from '@/locales/i18n';
import Colors from '@/constants/Colors';

export type TopbarProps = {
  title: string;
  goBack?: boolean;
};

export default function Topbar(props: TopbarProps) {
  const { setDocumentationModal, guestAccess } = useContext(AuthContext);

  return (
    <View>
      <View className="flex flex-row justify-between items-center p-5">
        <View className="flex flex-row items-center">
          {props.goBack && (
            <>
              <Link href="/" asChild>
                <Pressable>
                  {({ pressed }) => (
                    <ChevronLeft
                      size={24}
                      color={pressed ? '#00000080' : Colors.black}
                      className={cn(pressed ? 'text-black/80' : 'text-black')}
                    />
                  )}
                </Pressable>
              </Link>
              <View className="w-4" />
            </>
          )}

          <Text className="font-bold text-[22px]">{props.title}</Text>
        </View>

        <View className="flex flex-row gap-3 items-center">
          <Pressable onPress={() => setDocumentationModal(true)}>
            <Info size={28} color={Colors.black} />
          </Pressable>
          <Link href="/user-settings" asChild>
            <Pressable>
              {({ pressed }) => (
                <View
                  className={cn(
                    pressed ? 'bg-LightOrange' : 'bg-Orange',
                    'rounded-full p-[6px]'
                  )}
                >
                  <User2 size={14} color={Colors.white} />
                </View>
              )}
            </Pressable>
          </Link>
        </View>
      </View>
      {guestAccess && (
        <View className="flex flex-row justify-center items-center -mt-2 w-full h-5 bg-black/50">
          <Text className="text-White">{i18n.t('guestAccess')}</Text>
        </View>
      )}
    </View>
  );
}
