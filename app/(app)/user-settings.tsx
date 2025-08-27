import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  Image,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AuthContext } from '@/context/AuthContext';
import { router, useNavigation } from 'expo-router';
import i18n from '@/locales/i18n';
import { Input } from '@/components/common/Input';
import LanguageSwitcher from '@/components/settings/LanguageSwitcher';
import {
  ChevronDown,
  ChevronLeft,
  LogIn,
  LogOut,
  Map,
} from 'lucide-react-native';
import { CompanyInfo } from '@/types/company';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import Selector from '@/components/common/Selector';
import { FullWindowOverlay } from 'react-native-screens';
import cn from '@/utils/cn';
import Colors from '@/constants/Colors';

export default function UserSettings() {
  const [company, setCompany] = useState<CompanyInfo | undefined>(undefined);
  const {
    logOut,
    user,
    selectedCompany,
    companies,
    isConnected,
    selectCompany,
    instance,
    guestAccess,
    refreshFarmers,
  } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['75%'], []);
  const handlePresentModalPress = () => {
    bottomSheetRef.current?.present();
  };
  const containerComponent = useCallback(
    (props: any) => <FullWindowOverlay>{props.children}</FullWindowOverlay>,
    []
  );

  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.goBack()}
          className="flex flex-row justify-center items-center mr-3"
        >
          <ChevronLeft color={Colors.orange} />
          <Text className="font-medium text-Orange text-[18px]">Back</Text>
        </Pressable>
      ),
    });
  }, []);

  useEffect(() => {
    if (
      selectedCompany &&
      typeof selectedCompany !== 'string' &&
      companies &&
      typeof companies !== 'string'
    ) {
      setCompany(companies.find((c) => c?.id === selectedCompany));
    }
  }, [selectedCompany, companies]);

  const handleLogOut = () => {
    logOut();
    router.replace('/login');
  };

  const resetPassword = async () => {
    const url = instance + '/en/reset-password';
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      Linking.openURL(url);
    } else {
      console.error('Cannot open URL:', url);
    }
  };

  const handleRefreshFarmers = async () => {
    setLoading(true);
    await refreshFarmers(user as any);
    setLoading(false);
  };

  return (
    <ScrollView className="p-5 h-full border-t bg-White border-t-LightGray">
      <Text className="text-[18px] font-medium">
        {i18n.t('userSettings.userInformation')}
      </Text>
      {guestAccess ? (
        <View>
          <Text>{i18n.t('userSettings.loggedInGuest')}</Text>
          <Pressable
            onPress={() => handleLogOut()}
            className="flex flex-row items-center justify-center w-[50%] mt-5 px-5 py-3 rounded-md bg-Orange"
          >
            <LogIn color={Colors.white} style={{ marginRight: 8 }} size={20} />
            <Text className="text-White font-semibold text-[16px]">
              {i18n.t('login.login')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View>
          <View className="flex flex-row items-center mx-1.5 mt-5 justify-evenly">
            <View className="w-1/2">
              <Text>{i18n.t('userSettings.name')}</Text>
              <Input
                value={user?.name || ''}
                onChangeText={() => {}}
                editable={false}
              />
            </View>
            <View className="mx-2.5" />
            <View className="w-1/2">
              <Text>{i18n.t('userSettings.surname')}</Text>
              <Input
                value={user?.surname || ''}
                onChangeText={() => {}}
                editable={false}
              />
            </View>
          </View>
          <View className="mt-3">
            <Text>{i18n.t('userSettings.username')}</Text>
            <Input
              value={user?.email || ''}
              onChangeText={() => {}}
              editable={false}
            />
          </View>
          <Pressable
            onPress={handleRefreshFarmers}
            className="flex flex-row items-center justify-center py-3.5 mt-5 rounded-md bg-Orange"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-[16px] font-medium">
                {i18n.t('farmers.refreshFarmers')}
              </Text>
            )}
          </Pressable>
          <Text className="text-[18px] font-medium mt-5">
            {i18n.t('userSettings.companyInformation')}
          </Text>
          <View className="flex flex-row justify-between items-center mt-3 w-full">
            <View className="flex flex-row justify-center items-center w-20 h-20 rounded-full border border-LightGray">
              {company?.logo && (
                <Image
                  source={{
                    uri: company?.logo,
                  }}
                  className="w-[76px] h-[76px] rounded-full"
                />
              )}
            </View>
            <View className="flex flex-col items-start ml-4 w-full">
              <Text className="text-[16px]">
                {i18n.t('userSettings.company')}
              </Text>
              {isConnected ? (
                <>
                  <Pressable
                    className="flex flex-row items-center justify-between min-h-[48px] px-2 mt-2 border rounded-md border-LightGray"
                    style={{ width: Dimensions.get('window').width - 136 }}
                    onPress={handlePresentModalPress}
                  >
                    <Text className="text-[16px] w-[85%]">{company?.name}</Text>
                    <ChevronDown color={Colors.black} />
                  </Pressable>
                  <BottomSheetModal
                    ref={bottomSheetRef}
                    index={0}
                    snapPoints={snapPoints}
                    backdropComponent={(props) => (
                      <BottomSheetBackdrop
                        {...props}
                        onPress={() => bottomSheetRef.current?.close()}
                        disappearsOnIndex={-1}
                      />
                    )}
                    enableDismissOnClose={true}
                    containerComponent={
                      Platform.OS === 'ios' ? containerComponent : undefined
                    }
                  >
                    <BottomSheetScrollView className="rounded-t-md">
                      {typeof companies !== 'string' && (
                        <Selector
                          items={
                            companies?.map((company) => ({
                              label: company?.name ?? '',
                              value: company?.id ?? 0,
                            })) ?? []
                          }
                          selected={company?.id ?? 0}
                          setSelected={selectCompany}
                        />
                      )}
                    </BottomSheetScrollView>
                  </BottomSheetModal>
                </>
              ) : (
                <Pressable
                  className="flex flex-row justify-between items-center px-2 mt-2 h-12 rounded-md border border-LightGray"
                  style={{ width: Dimensions.get('window').width - 136 }}
                >
                  <Text className="text-[16px] text-DarkGray">
                    {company?.name}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      )}
      <Text className="text-[18px] font-medium mt-5 mb-3">
        {i18n.t('userSettings.offlineMaps')}
      </Text>
      <View className="flex flex-row justify-between items-center">
        <Pressable
          onPress={() => router.push('/map-download')}
          className="flex flex-row justify-center items-center px-2 w-full h-12 rounded-md bg-Orange"
        >
          <Map color={Colors.white} style={{ marginRight: 8 }} size={20} />
          <Text className="text-White font-semibold text-[16px]">
            {i18n.t('userSettings.offlineMapsSettings')}
          </Text>
        </Pressable>
      </View>
      <Text className="text-[18px] font-medium mt-5 mb-3">
        {i18n.t('userSettings.language')}
      </Text>
      <LanguageSwitcher />
      <View className="flex flex-row justify-between items-center mt-5 mb-16">
        <Pressable
          onPress={() => resetPassword()}
          className={cn(
            guestAccess ? 'w-full' : 'w-[55%]',
            'px-5 py-3 rounded-md bg-Green flex flex-row items-center justify-center'
          )}
        >
          <Text className="text-White font-semibold text-[16px]">
            {i18n.t('userSettings.resetPassword')}
          </Text>
        </Pressable>
        {!guestAccess && (
          <Pressable
            onPress={() => handleLogOut()}
            className="flex flex-row items-center justify-center w-[40%] px-5 py-3 rounded-md bg-Orange"
          >
            <LogOut color={Colors.white} style={{ marginRight: 8 }} size={20} />
            <Text className="text-White font-semibold text-[16px]">
              {i18n.t('userSettings.logOut')}
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
