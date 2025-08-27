import LoginLowerBlobSvg from '@/components/svg/LoginLowerBlob';
import LoginUpperBlobSvg from '@/components/svg/LoginUpperBlob';
import {
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  Text,
  TouchableWithoutFeedback,
  View,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Modal from 'react-native-modalbox';
import LanguageSwitcher from '@/components/settings/LanguageSwitcher';
import { Globe, X } from 'lucide-react-native';

import i18n from '@/locales/i18n';
import { Input, InputPassword } from '@/components/common/Input';
import { useState, useContext } from 'react';

import { AuthContext } from '@/context/AuthContext';
import { router } from 'expo-router';
import cn from '@/utils/cn';
import Colors from '@/constants/Colors';

export default function Login() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [askLanguage, setAskLanguage] = useState<boolean>(false);
  const [instanceChange, setInstanceChange] = useState<boolean>(false);

  const instances = [
    process.env.EXPO_PUBLIC_API_URI,
    process.env.EXPO_PUBLIC_API_TEST_URI,
    process.env.EXPO_PUBLIC_API_RW_URI,
  ];

  const { logIn, instance, setInstance, logInGuest } = useContext(AuthContext);

  const resetPassword = async () => {
    const url = instance + '/en/reset-password';
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      Linking.openURL(url);
    } else {
      console.error('Cannot open URL:', url);
    }
  };

  const handleLogIn = async () => {
    setIsLoading(true);

    Keyboard.dismiss();

    const logInResult = await logIn(username, password);

    if (logInResult.success) {
      router.replace('/(app)/');
    } else {
      switch (logInResult.errorStatus) {
        case 'AUTH_ERROR':
          setLoginError(i18n.t('login.authError'));
          break;
        case 'GENERIC_ERROR':
          setLoginError(i18n.t('login.genericError'));
          break;
        default:
          setLoginError(i18n.t('login.genericError'));
          break;
      }
    }

    setIsLoading(false);
  };

  const handleLogInGuest = async () => {
    setIsLoading(true);

    Keyboard.dismiss();

    try {
      await logInGuest();
    } catch (error) {
      console.error('Error logging in as guest:', error);
    }

    router.replace('/(app)/');
    router.push('/(app)/(farmers)/info/0');

    setIsLoading(false);
  };

  const clickPrivacyPolicy = async () => {
    const url = instance + '/en/s/privacy';
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      Linking.openURL(url);
    } else {
      console.error('Cannot open URL:', url);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex flex-col justify-between h-full bg-White">
        {askLanguage && (
          <Modal
            isOpen={askLanguage}
            onClosed={() => setAskLanguage(false)}
            position={'center'}
            backdropPressToClose={true}
            style={{
              height: 336,
              width: '90%',
              marginRight: 250,
              borderRadius: 8,
              padding: 20,
              justifyContent: 'space-between',
            }}
          >
            <View>
              <View className="flex flex-row justify-between items-center mb-2">
                <Text className="text-[18px] font-medium">
                  {i18n.t('userSettings.language')}
                </Text>
                <Pressable onPress={() => setAskLanguage(false)} className="">
                  <X size={20} color={Colors.black} />
                </Pressable>
              </View>

              <LanguageSwitcher />
              <Pressable
                onPress={() => setAskLanguage(false)}
                className="py-2 mt-4 rounded-md bg-Orange"
              >
                <Text className="text-center text-white">{i18n.t('ok')}</Text>
              </Pressable>
            </View>
          </Modal>
        )}
        {instanceChange && (
          <Modal
            isOpen={instanceChange}
            onClosed={() => setInstanceChange(false)}
            position={'center'}
            backdropPressToClose={true}
            style={{
              height: instances.length * 60 + 100,
              width: '90%',
              marginRight: 250,
              borderRadius: 8,
              padding: 20,
              justifyContent: 'space-between',
            }}
          >
            <View>
              <View className="flex flex-row justify-between items-center mb-2">
                <Text className="text-[18px] font-medium">
                  {i18n.t('changeInstance')}
                </Text>
                <Pressable
                  onPress={() => setInstanceChange(false)}
                  className=""
                >
                  <X size={20} color={Colors.black} />
                </Pressable>
              </View>

              <View className="pl-3 rounded-md border border-LightGray">
                {instances.map((ins, index) => (
                  <Pressable
                    key={index}
                    className={cn(
                      'flex flex-row justify-between pb-4 pr-3 mt-4 border-b border-b-LightGray',
                      index === instances.length - 1 && 'border-b-0'
                    )}
                    onPress={() => setInstance(ins ?? '')}
                  >
                    <Text className={cn(instance !== ins && 'text-DarkGray')}>
                      {ins}
                    </Text>
                    {instance === ins ? (
                      <View className="flex flex-row items-center justify-center w-5 h-5 rounded-full bg-[#333333]">
                        <View className="flex flex-row justify-center items-center w-4 h-4 rounded-full bg-White">
                          <View className="flex flex-row items-center justify-center w-2.5 h-2.5 rounded-full bg-[#333333]" />
                        </View>
                      </View>
                    ) : (
                      <View className="flex flex-row justify-center items-center w-5 h-5 rounded-full bg-DarkGray">
                        <View className="flex flex-row justify-center items-center w-4 h-4 rounded-full bg-White" />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => setInstanceChange(false)}
                className="py-2 mt-4 rounded-md bg-Orange"
              >
                <Text className="text-center text-white">{i18n.t('ok')}</Text>
              </Pressable>
            </View>
          </Modal>
        )}
        <LoginUpperBlobSvg />
        <SafeAreaView className="px-5">
          <KeyboardAvoidingView
            behavior="position"
            keyboardVerticalOffset={300}
          >
            <View className="flex flex-row justify-between items-center">
              <View>
                <Text className="text-[24px] font-semibold">
                  {i18n.t('login.welcomeBack')}
                </Text>
                <Text className="text-[20px]">
                  {i18n.t('login.welcomeBackSubtitle')}
                </Text>
              </View>
              <Pressable onPress={() => setAskLanguage(true)}>
                <Globe size={20} color="#000000" />
              </Pressable>
            </View>

            <View className="mt-5">
              <Text>{i18n.t('login.username')}</Text>
              <Input
                placeholder={i18n.t('login.usernamePlaceholder')}
                value={username}
                onChangeText={setUsername}
              />
            </View>
            <View className="mt-3">
              <Text>{i18n.t('login.password')}</Text>
              <InputPassword
                placeholder={i18n.t('login.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                isPasswordVisible={isPasswordVisible}
                setIsPasswordVisible={setIsPasswordVisible}
              />
            </View>
            <View className="self-start mt-3">
              <Pressable onPress={() => resetPassword()}>
                <Text className="underline text-Green">
                  {i18n.t('login.forgotPassword')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setInstanceChange(true)}
                className="mt-2"
              >
                <Text className="text-black">{i18n.t('changeInstance')}</Text>
              </Pressable>
            </View>
            {loginError && (
              <View className="my-3">
                <Text className="text-red-500">{loginError}</Text>
              </View>
            )}
            <View className="flex flex-row justify-between items-center">
              <Pressable
                onPress={() => clickPrivacyPolicy()}
                className="self-end"
              >
                <Text className="underline text-Green">
                  {i18n.t('privacyPolicy')}
                </Text>
              </Pressable>
              <View className="flex flex-row items-center">
                <Pressable
                  onPress={() => handleLogInGuest()}
                  className="px-5 py-3 mr-2 rounded-md bg-Green"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-White font-semibold text-[16px]">
                      {i18n.t('login.guest')}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => handleLogIn()}
                  className="px-5 py-3 rounded-md bg-Orange"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-White font-semibold text-[16px]">
                      {i18n.t('login.login')}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
        <View className="flex items-end w-full">
          <LoginLowerBlobSvg />
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}
