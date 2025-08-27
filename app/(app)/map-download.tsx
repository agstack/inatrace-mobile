import { useNavigation } from 'expo-router';
import {
  Check,
  ChevronLeft,
  Download,
  Navigation,
  Trash,
  X,
} from 'lucide-react-native';
import { createRef, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import i18n from '@/locales/i18n';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import { Input } from '@/components/common/Input';
import Modal from 'react-native-modalbox';
import { AuthContext } from '@/context/AuthContext';
import cn from '@/utils/cn';
import { CameraRef } from '@rnmapbox/maps/lib/typescript/src/components/Camera';
import Colors from '@/constants/Colors';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

type OfflinePack = {
  name: string;
  state: string;
  percentage: number;
  completedResourceSize: number;
  expires: string;
};

export default function MapDownload() {
  const navigation = useNavigation();

  const { isConnected } = useContext(AuthContext) as { isConnected: boolean };

  const [location, setLocation] = useState<LocationObject | null>(null);

  const [offlinePacks, setOfflinePacks] = useState<OfflinePack[]>([]);
  const [bounds, setBounds] = useState<any | null>(null);
  const [estimatedSize, setEstimatedSize] = useState<number>(0);
  const [selectingMap, setSelectingMap] = useState<boolean>(false);
  const [downloadConfirm, setDownloadConfirm] = useState<boolean>(false);
  const [packName, setPackName] = useState<string>('');
  const [hasInputError, setHasInputError] = useState<boolean>(false);

  const mapRef = createRef<Mapbox.MapView>();
  const cameraRef = useRef<CameraRef>(null);

  useEffect(() => {
    navigation.setOptions({
      title: i18n.t('plots.mapDownload'),
      headerLeft: () => (
        <Pressable
          onPress={() =>
            selectingMap ? setSelectingMap(false) : navigation.goBack()
          }
          className="flex flex-row justify-center items-center mr-3"
        >
          <ChevronLeft color={Colors.orange} />
          <Text className="font-medium text-Orange text-[18px]">Back</Text>
        </Pressable>
      ),
    });
  }, [selectingMap]);

  useEffect(() => {
    checkForOfflineMaps();
    askForLocationPermission();
  }, []);

  const checkForOfflineMaps = async () => {
    try {
      const packs = await Mapbox.offlineManager.getPacks();
      let completeCount = 0;
      const displayPacks = packs.map((pack: any) => {
        if (pack.pack.state === 'complete') {
          completeCount++;
        }

        return {
          name: pack.name,
          state: pack.pack?.state ?? 'unknown',
          percentage: pack.pack?.percentage ?? 0,
          completedResourceSize: pack.pack?.completedResourceSize ?? 0,
          expires: pack.pack?.expires ?? 'unknown',
        };
      });

      setOfflinePacks(displayPacks);

      if (completeCount === packs.length) {
        return;
      }

      setTimeout(() => {
        checkForOfflineMaps();
      }, 1000);
    } catch (error) {
      console.error('Error fetching offline packs:', error);
    }
  };

  const askForLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        i18n.t('plots.offlineMapsScreen.locationPermissionDeniedAlert'),
        i18n.t('plots.offlineMapsScreen.locationPermissionDeniedAlertMessage')
      );
      return;
    }

    let currentLocation = await Location.getCurrentPositionAsync({});
    setLocation(currentLocation);
  };

  const onRegionDidChange = async () => {
    if (mapRef.current) {
      const visibleBounds = await mapRef.current.getVisibleBounds();
      const zoomLevel = await mapRef.current.getZoom();
      setBounds(visibleBounds);
      estimateOfflinePackSize(zoomLevel);
    }
  };

  const estimateOfflinePackSize = (zoomLevel: number) => {
    if (zoomLevel < 13) {
      setEstimatedSize(parseFloat((Math.abs(20 - zoomLevel) * 20).toFixed(2)));
    } else if (zoomLevel < 14) {
      setEstimatedSize(parseFloat((Math.abs(20 - zoomLevel) * 10).toFixed(2)));
    } else {
      setEstimatedSize(parseFloat((Math.abs(20 - zoomLevel) * 6).toFixed(2)));
    }
  };

  const onDownloadArea = async () => {
    if (!packName) {
      setHasInputError(true);
      return;
    }

    if (!bounds) {
      Alert.alert(
        i18n.t('plots.offlineMapsScreen.noAreaSelected'),
        i18n.t('plots.offlineMapsScreen.noAreaSelectedMessage')
      );
      return;
    }

    const metadata = { name: packName, date: new Date().toISOString() };

    setDownloadConfirm(false);

    try {
      await Mapbox.offlineManager.createPack(
        {
          name: packName,
          styleURL: Mapbox.StyleURL.SatelliteStreet,
          bounds: [
            [bounds[0][0], bounds[0][1]],
            [bounds[1][0], bounds[1][1]],
          ],
          minZoom: 14,
          maxZoom: 20,
          metadata,
        },
        (progress: any) => {
          checkForOfflineMaps();
        }
      );

      setSelectingMap(false);
    } catch (error) {
      console.error('Error starting offline pack download:', error);
      Alert.alert(
        i18n.t('plots.offlineMapsScreen.errorDownloadingTitle'),
        i18n.t('plots.offlineMapsScreen.errorDownloading')
      );
    }
  };

  const deleteOfflinePack = async (packName: string) => {
    try {
      await Mapbox.offlineManager.deletePack(packName);
      checkForOfflineMaps();
    } catch (error) {
      console.error('Error deleting offline pack:', error);
      Alert.alert(
        i18n.t('plots.offlineMapsScreen.errorTitle'),
        i18n.t('plots.offlineMapsScreen.errorDeleting')
      );
    }
  };

  const deletePack = async (packName: string) => {
    Alert.alert(
      i18n.t('plots.offlineMapsScreen.delete'),
      i18n.t('plots.offlineMapsScreen.deleteAlert'),
      [
        {
          text: i18n.t('plots.offlineMapsScreen.cancel'),
          style: 'cancel',
        },
        {
          text: i18n.t('plots.offlineMapsScreen.delete'),
          onPress: () => deleteOfflinePack(packName),
        },
      ]
    );
  };

  const focusOnCurrentLocation = () => {
    if (location && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [location.coords.longitude, location.coords.latitude],
        zoomLevel: 16,
        animationDuration: 500,
      });
    }
  };

  return (
    <KeyboardAvoidingView className="h-full bg-White" behavior="padding">
      <Modal
        isOpen={downloadConfirm}
        onClosed={() => setDownloadConfirm(false)}
        position={'center'}
        backdropPressToClose={true}
        style={{
          height: 200,
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
              {i18n.t('plots.mapTitle')}
            </Text>
            <Pressable onPress={() => setDownloadConfirm(false)} className="">
              <X size={20} color={Colors.black} />
            </Pressable>
          </View>

          <Input
            value={packName}
            onChangeText={(text: string) => {
              setHasInputError(false);
              setPackName(text);
            }}
            placeholder={i18n.t('input.type')}
            error={hasInputError}
          />
        </View>

        <View className="flex flex-row justify-between items-center">
          <Pressable
            onPress={() => setDownloadConfirm(false)}
            className="bg-Green w-[48%] px-5 py-3 rounded-md flex flex-col items-center justify-center"
          >
            <Text className="text-White font-semibold text-[16px]">
              {i18n.t('plots.offlineMapsScreen.cancel')}
            </Text>
          </Pressable>
          <Pressable
            onPress={onDownloadArea}
            className="bg-Orange w-[48%] px-5 py-3 rounded-md flex flex-col items-center justify-center"
          >
            <Text className="text-White font-semibold text-[16px]">
              {i18n.t('plots.offlineMapsScreen.confirm')}
            </Text>
          </Pressable>
        </View>
      </Modal>
      {selectingMap ? (
        <View className="flex-1 h-full">
          <View className="flex flex-row justify-center items-center p-5 w-full bg-White">
            <Text className="text-[20px]">
              {i18n.t('plots.offlineMapsScreen.downloadThisMap')}
            </Text>
          </View>
          {location ? (
            <Mapbox.MapView
              className="border-[5px] border-blue-500"
              style={{
                height:
                  Dimensions.get('window').height -
                  (Platform.OS === 'android' ? 254 : 304),
              }}
              ref={mapRef}
              onMapIdle={onRegionDidChange}
              styleURL={Mapbox.StyleURL.SatelliteStreet}
              onDidFinishLoadingMap={() => focusOnCurrentLocation()}
            >
              <Mapbox.Camera
                zoomLevel={14}
                minZoomLevel={10}
                centerCoordinate={[
                  location.coords.longitude,
                  location.coords.latitude,
                ]}
                ref={cameraRef}
              />
              <Mapbox.PointAnnotation
                coordinate={[
                  location.coords.longitude,
                  location.coords.latitude,
                ]}
                id="current-location"
              >
                <View className="flex relative flex-row justify-center items-center w-5 h-5 bg-white rounded-full">
                  <View className="w-4 h-4 bg-blue-500 rounded-full" />
                </View>
              </Mapbox.PointAnnotation>
            </Mapbox.MapView>
          ) : (
            <View className="flex flex-col flex-1 justify-center items-center w-full h-full bg-White">
              <ActivityIndicator size="large" animating={true} />
              <Text className="mt-2">{i18n.t('plots.mapLoading')}</Text>
            </View>
          )}
          <Text className="px-5 my-3 bg-White">
            {i18n.t('plots.offlineMapsScreen.sizeWarning', {
              size: estimatedSize,
            })}
          </Text>
          <View className="flex flex-row justify-between items-center px-5 pb-5 bg-White">
            <Pressable
              className="flex absolute right-5 bottom-32 flex-row justify-center items-center self-end mb-5 w-16 h-16 rounded-full border-2 border-blue-500 bg-White"
              onPress={focusOnCurrentLocation}
              style={style.shadowMedium}
            >
              <Navigation color="#3b82f6" size={30} />
            </Pressable>
            <Pressable
              onPress={() => setSelectingMap(false)}
              className="w-[48%] px-5 py-3 rounded-md bg-Green flex flex-row items-center justify-center"
            >
              <Text className="text-White font-semibold text-[16px]">
                {i18n.t('plots.offlineMapsScreen.cancel')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setPackName('');
                setDownloadConfirm(true);
              }}
              className="flex flex-row items-center justify-center w-[48%] px-5 py-3 rounded-md bg-Orange"
            >
              <Download
                color={Colors.white}
                style={{ marginRight: 8 }}
                size={20}
              />
              <Text className="text-White font-semibold text-[16px]">
                {i18n.t('plots.offlineMapsScreen.download')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="m-5">
          <Pressable
            onPress={() => (isConnected ? setSelectingMap(true) : null)}
            className={cn(
              isConnected ? 'bg-Orange' : 'bg-LightOrange',
              'flex flex-row justify-center items-center px-2 h-12 rounded-md'
            )}
            disabled={!isConnected}
          >
            <Download
              color={Colors.white}
              style={{ marginRight: 8 }}
              size={20}
            />
            <Text className="font-semibold text-[16px] text-White">
              {i18n.t('plots.offlineMapsScreen.selectYourOwnMap')}
            </Text>
          </Pressable>
          {offlinePacks.length > 0 ? (
            <ScrollView className="mt-5">
              <Text className="text-[18px] font-medium mb-2">
                {i18n.t('plots.offlineMapsScreen.downloadedMaps')}
              </Text>
              {offlinePacks.map((pack: any, index: number) => {
                let formattedDate = '';
                if (pack?.expires && pack?.percentage === 100) {
                  if (Platform.OS === 'android') {
                    const date = pack.expires.split(' ');
                    formattedDate = date[2] + ' ' + date[1] + ' ' + date[5];
                  } else {
                    const date = new Date(pack.expires);
                    formattedDate =
                      date.getDate() +
                      ' ' +
                      date.toLocaleString('default', { month: 'short' }) +
                      ' ' +
                      date.getFullYear();
                  }
                } else {
                  formattedDate = '-';
                }

                return (
                  <View
                    key={index}
                    className="flex flex-row justify-between items-center mt-4"
                  >
                    <View className="flex flex-row justify-center items-center">
                      {pack?.state === 'complete' &&
                      pack?.percentage === 100 ? (
                        <View className="flex flex-row items-center justify-center w-[24] h-[24] p-[2px] bg-blue-500 rounded-full">
                          <Check color={Colors.white} size={16} />
                        </View>
                      ) : (
                        <View className="w-[24] h-[24] p-[2px] bg-Orange rounded-full flex items-center justify-center">
                          <Text className="text-White text-[8px]">
                            {Math.round(pack?.percentage)}%
                          </Text>
                        </View>
                      )}
                      <View className="ml-2">
                        <Text>{pack?.name}</Text>
                        <View className="flex flex-row items-center">
                          <Text>
                            {(pack?.completedResourceSize / 1048576).toFixed(1)}{' '}
                            MB
                          </Text>
                          <View className="w-[4] h-[4] rounded-full bg-black mx-2" />
                          <Text>
                            {i18n.t('plots.offlineMapsScreen.expires', {
                              date: formattedDate,
                            })}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => deletePack(pack.name)}
                      className="flex-row"
                    >
                      <Trash color={Colors.black} size={20} />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View className="mt-5">
              <Text className="text-[18px] font-medium">
                {i18n.t('plots.offlineMapsScreen.downloadedMaps')}
              </Text>
              <Text>{i18n.t('plots.offlineMapsScreen.noMapsDownloaded')}</Text>
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const style = StyleSheet.create({
  shadowMedium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 2,
  },
});
