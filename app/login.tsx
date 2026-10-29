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
  ScrollView,
  TextInput,
  NativeModules,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

import Modal from 'react-native-modalbox';
import LanguageSwitcher from '@/components/settings/LanguageSwitcher';
import { ChevronDown, Globe, Plus, X } from 'lucide-react-native';

import i18n from '@/locales/i18n';
import { Input, InputPassword } from '@/components/common/Input';
import { useState, useContext, useEffect, useRef } from 'react';
import { isCompatibleLoginProbe, isCompatibleOpenApi, isCompatiblePublicResponse, normalizeServerUrl } from '@/utils/servers';

import { AuthContext } from '@/context/AuthContext';
import { router } from 'expo-router';
import cn from '@/utils/cn';
import Colors from '@/constants/Colors';

let nextValidationId = 0;

export default function Login() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [askLanguage, setAskLanguage] = useState<boolean>(false);
  const [instanceChange, setInstanceChange] = useState<boolean>(false);
  const [savedInstances, setSavedInstances] = useState<string[]>([]);
  const [newInstance, setNewInstance] = useState('');
  const [serverError, setServerError] = useState('');
  const [checkingServer, setCheckingServer] = useState(false);
  const [addingServer, setAddingServer] = useState(false);
  const validationId = useRef<string | null>(null);

  const cancelValidation = () => {
    const id = validationId.current;
    validationId.current = null;
    if (id) NativeModules.ServerTransport?.cancelDiscovery(id);
    setCheckingServer(false);
  };

  useEffect(() => () => {
    const id = validationId.current;
    validationId.current = null;
    if (id) NativeModules.ServerTransport?.cancelDiscovery(id);
  }, []);

  const normalizeExisting = (url: string) => {
    try { return normalizeServerUrl(url, true, true); } catch { return url; }
  };
  const defaultInstance = normalizeExisting(process.env.EXPO_PUBLIC_API_URI ?? '');
  const instances = Array.from(new Set([
    process.env.EXPO_PUBLIC_API_URI,
    process.env.EXPO_PUBLIC_API_TEST_URI,
    process.env.EXPO_PUBLIC_API_RW_URI,
    ...savedInstances,
  ].filter((url): url is string => Boolean(url)).map(normalizeExisting)));

  useEffect(() => {
    AsyncStorage.getItem('saved_server_urls_v1').then(value => {
      if (value) {
        const saved = JSON.parse(value);
        if (Array.isArray(saved)) setSavedInstances(saved.filter(item => typeof item === 'string'));
      }
    }).catch(() => setServerError(i18n.t('server.loadError')));
  }, []);

  const addInstance = async () => {
    const id = `server-validation-${++nextValidationId}`;
    validationId.current = id;
    setServerError('');
    setCheckingServer(true);
    try {
      const url = normalizeServerUrl(newInstance);
      if (instances.some(value => {
        try { return normalizeServerUrl(value, true, true) === url; } catch { return false; }
      })) throw new Error('duplicate');
      let valid = false;
      try {
        const response = await NativeModules.ServerTransport.discover(`${url}/v3/api-docs`, id);
        valid = response.status === 200 && isCompatibleOpenApi(JSON.parse(response.body));
      } catch { /* Gateways may not expose OpenAPI. */ }
      if (validationId.current !== id) return;
      if (!valid) {
        const response = await NativeModules.ServerTransport.discover(`${url}/api/public/globalSettings/MOBILE_SERVER_CHECK`, id);
        if (validationId.current !== id) return;
        const loginProbe = await NativeModules.ServerTransport.discover(`${url}/api/user/login`, id);
        valid = response.status === 200 && isCompatiblePublicResponse(JSON.parse(response.body)) &&
          loginProbe.status === 405 && isCompatibleLoginProbe(JSON.parse(loginProbe.body));
      }
      if (validationId.current !== id) return;
      if (!valid) throw new Error('incompatible');
      const next = [...savedInstances, url];
      await AsyncStorage.setItem('saved_server_urls_v1', JSON.stringify(next));
      if (validationId.current !== id) return;
      setSavedInstances(next);
      setNewInstance('');
      setInstance(url);
      setAddingServer(false);
      setInstanceChange(false);
    } catch (error: any) {
      if (validationId.current !== id) return;
      const key = ['empty', 'invalid', 'duplicate'].includes(error?.message) ? error.message : 'unavailable';
      setServerError(i18n.t(`server.${key}`));
    } finally { if (validationId.current === id) { validationId.current = null; setCheckingServer(false); } }
  };

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
      router.replace('/(app)/');
      router.push('/(app)/(farmers)/info/0');
    } catch (error) {
      console.error('Error logging in as guest:', error);
      setLoginError(i18n.t('login.genericError'));
    } finally {
      setIsLoading(false);
    }
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
            onClosed={() => { cancelValidation(); setInstanceChange(false); setAddingServer(false); setServerError(''); }}
            position={'center'}
            backdropPressToClose={true}
            style={{
              height: '75%',
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
                  onPress={() => { cancelValidation(); setInstanceChange(false); }}
                  className=""
                >
                  <X size={20} color={Colors.black} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 240 }} className="pl-3 rounded-md border border-LightGray">
                {instances.map((ins, index) => (
                  <Pressable
                    key={index}
                    className={cn(
                      'flex flex-row justify-between pb-4 pr-3 mt-4 border-b border-b-LightGray',
                      index === instances.length - 1 && 'border-b-0'
                    )}
                    onPress={() => {
                      setInstance(ins);
                      setInstanceChange(false);
                      setAddingServer(false);
                      setServerError('');
                    }}
                  >
                    <Text className={cn(instance !== ins && 'text-DarkGray')}>
                      {ins === defaultInstance ? `${i18n.t('server.official')} — ${ins}` : ins}
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
              </ScrollView>
              {!addingServer ? (
                <Pressable accessibilityRole="button" onPress={() => { setAddingServer(true); setServerError(''); }}
                  className="flex flex-row items-center py-3 mt-3">
                  <Plus size={18} color={Colors.black} />
                  <Text className="ml-2 text-black font-medium">{i18n.t('server.add')}</Text>
                </Pressable>
              ) : (
                <View>
                  <Text className="mt-3">{i18n.t('server.address')}</Text>
                  <TextInput value={newInstance} onChangeText={setNewInstance}
                    placeholder="https://example.org" autoCapitalize="none" autoCorrect={false}
                    keyboardType="url" placeholderTextColor="#666666"
                    style={{ color: Colors.black }}
                    className="p-2 mt-1 rounded-md border border-LightGray bg-White" />
                  {serverError ? <Text className="text-red-500">{serverError}</Text> : null}
                  <Pressable onPress={addInstance} disabled={checkingServer} className="py-2 mt-2 rounded-md bg-Green">
                    <Text className="text-center text-white">{checkingServer ? i18n.t('loading') : i18n.t('server.save')}</Text>
                  </Pressable>
                </View>
              )}

              <Pressable
                onPress={() => { cancelValidation(); setInstanceChange(false); }}
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
              <Text>{i18n.t('server.label')}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={i18n.t('server.label')}
                accessibilityHint={i18n.t('server.selectHint')}
                onPress={() => setInstanceChange(true)}
                className="flex flex-row items-center justify-between px-3 py-3 mt-1 rounded-md border border-LightGray"
              >
                <View className="flex-1 mr-3">
                  {normalizeExisting(instance) === defaultInstance && defaultInstance ? (
                    <Text className="text-black font-medium">{i18n.t('server.official')}</Text>
                  ) : null}
                  <Text numberOfLines={1} className="text-DarkGray">{instance}</Text>
                </View>
                <ChevronDown size={20} color={Colors.black} />
              </Pressable>
            </View>
            <View className="mt-3">
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
