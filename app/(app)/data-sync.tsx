import { useNavigation } from 'expo-router';
import { ChevronLeft, Pencil, RefreshCw } from 'lucide-react-native';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import realm from '@/realm/useRealm';
import { FarmerSchema, PlotSchema } from '@/realm/schemas';
import i18n from '@/locales/i18n';
import cn from '@/utils/cn';
import { AuthContext } from '@/context/AuthContext';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { FullWindowOverlay } from 'react-native-screens';
import Selector from '@/components/common/Selector';
import { User } from '@/types/user';
import Colors from '@/constants/Colors';

export default function DataSync() {
  const navigation = useNavigation();
  const {
    isConnected,
    makeRequest,
    selectedCompany,
    user,
    guestAccess,
    instance,
    refreshFarmers,
  } = useContext(AuthContext) as {
    isConnected: boolean;
    makeRequest: any;
    selectedCompany: number;
    user: any;
    guestAccess: boolean;
    instance: string;
    refreshFarmers: (user: User) => Promise<void>;
  };

  const [farmersSynced, setFarmersSynced] = useState<any>([]);

  const [farmersToSync, setFarmersToSync] = useState<any>([]);
  const [plotsToSync, setPlotsToSync] = useState<any>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  const [editingPlot, setEditingPlot] = useState<any>(null);

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['75%'], []);
  const containerComponent = useCallback(
    (props: any) => <FullWindowOverlay>{props.children}</FullWindowOverlay>,
    []
  );

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

    getItemsToSync();
  }, []);

  const getItemsToSync = async () => {
    setLoading(true);
    try {
      const farmers = (await realm.realmRead(
        FarmerSchema,
        undefined,
        undefined,
        undefined,
        undefined,
        `(userId == '${user?.id}' OR userId == '0')`
      )) as any;
      const plots = (await realm.realmRead(
        PlotSchema,
        undefined,
        undefined,
        undefined,
        undefined,
        `(synced == false) AND (userId == '${user?.id}' OR userId == '0')`
      )) as any;

      let farmersDataSynced: any = [];
      let farmersData: any = [];
      let plotsData: any = [];

      for (const farmer of farmers) {
        const data = JSON.parse(farmer.data);
        if (farmer.synced) {
          farmersDataSynced.push({ ...farmer, data });
        } else {
          farmersData.push({ ...farmer, data });
        }
      }

      for (const plot of plots) {
        const data = JSON.parse(plot.data);

        plotsData.push({ ...plot, data });
      }

      setFarmersToSync(farmersData);
      setPlotsToSync(plotsData);
      setFarmersSynced(farmersDataSynced);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const syncData = async () => {
    if (!isConnected) {
      return;
    }

    setSyncing(true);

    try {
      let farmerPlots: any = [];
      const farmerPromises = await farmersToSync.map(async (farmer: any) => {
        const fp = plotsToSync.filter(
          (plot: any) => plot.farmerId === farmer.id
        );

        const farmerBody = {
          ...farmer.data,
          id: null,
          plots:
            fp?.map((plot: any) => {
              return {
                plotName: plot.data.plotName,
                crop: { id: parseInt(plot.data.crop, 10) },
                numberOfPlants: plot.data.numberOfPlants
                  ? parseInt(plot.data.numberOfPlants, 10)
                  : null,
                unit: plot.data.size.split(' ')[1],
                size: parseFloat(plot.data.size.split(' ')[0]),
                geoId: '',
                organicStartOfTransition: plot.data.organicStartOfTransition
                  ? plot.data.organicStartOfTransition
                  : null,
                certification: plot.data.certification
                  ? plot.data.certification
                  : null,
                coordinates: plot.data.featureInfo.geometry.coordinates[0].map(
                  (coordinate: number[]) => {
                    return {
                      latitude: coordinate[1],
                      longitude: coordinate[0],
                    };
                  }
                ),
              };
            }) ?? [],
        };

        farmerPlots = [...farmerPlots, ...fp];

        return makeRequest({
          url: `/api/company/userCustomers/add/${selectedCompany}`,
          method: 'POST',
          body: farmerBody,
        }).then((result: any) => ({
          result,
          farmerId: farmer.id,
          plotIds: fp.map((plot: any) => plot.id),
        }));
      });

      const farmerPromiseResults = await Promise.all(farmerPromises);

      for (const { result, farmerId, plotIds } of farmerPromiseResults) {
        if (result.data.status === 'OK') {
          await realm.realmUpdate(FarmerSchema, farmerId, 'synced', true);
          for (const plotId of plotIds) {
            await realm.realmDeleteOne(PlotSchema, `id == '${plotId}'`);
          }
        }
      }

      const plotsLeft = plotsToSync.filter(
        (plot: any) => !farmerPlots.includes(plot)
      );

      const plotPromises = await plotsLeft.map(async (plot: any) => {
        const plotBody = {
          plotName: plot.data.plotName,
          crop: { id: parseInt(plot.data.crop, 10) },
          numberOfPlants: plot.data.numberOfPlants
            ? parseInt(plot.data.numberOfPlants, 10)
            : null,
          unit: plot.data.size.split(' ')[1],
          size: parseFloat(plot.data.size.split(' ')[0]),
          geoId: '',
          organicStartOfTransition: plot.data.organicStartOfTransition
            ? plot.data.organicStartOfTransition
            : null,
          certification: plot.data.certification
            ? plot.data.certification
            : null,
          coordinates: plot.data.featureInfo.geometry.coordinates[0].map(
            (coordinate: number[]) => {
              return {
                latitude: coordinate[1],
                longitude: coordinate[0],
              };
            }
          ),
        };

        return makeRequest({
          url: `/api/company/userCustomers/${plot.farmerId.toString()}/plots/add`,
          method: 'POST',
          body: plotBody,
        }).then((result: any) => ({
          result,
          plotId: plot.id,
        }));
      });

      const plotPromiseResults = await Promise.all(plotPromises);

      for (const { result, plotId } of plotPromiseResults) {
        if (result.data.status === 'OK') {
          await realm.realmDeleteOne(PlotSchema, `id == '${plotId}'`);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSyncing(false);
      await getItemsToSync();
      Alert.alert(i18n.t('synced.syncedTitle'), i18n.t('synced.syncedMessage'));
    }
  };

  const handleEditPlot = (plot: any) => {
    setEditingPlot(plot);
    bottomSheetRef.current?.present();
  };

  const updatePlotFarmerId = async (farmerId: number) => {
    if (editingPlot) {
      await realm.realmUpdate(PlotSchema, editingPlot.id, 'farmerId', farmerId);
      setEditingPlot({ ...editingPlot, farmerId });
      await getItemsToSync();
    }
  };

  const openLink = async () => {
    const url = instance.includes('pro') ? 'https://inatrace.pro' : instance;
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      Linking.openURL(url);
    } else {
      console.error('Cannot open URL:', url);
    }
  };

  const farmerRefresh = async () => {
    await refreshFarmers(user);
    await getItemsToSync();
  };

  return (
    <View>
      {guestAccess ? (
        <View className="p-5">
          <Text className="text-lg">{i18n.t('synced.guestWarning')}</Text>
          <Pressable
            onPress={() => openLink()}
            className="self-start px-3 py-2 mx-auto my-5 rounded-md bg-Orange"
          >
            <Text className="text-lg text-White">INATrace</Text>
          </Pressable>
        </View>
      ) : (
        <View className="h-full">
          <ScrollView className="flex flex-col pt-5 h-full bg-White">
            <Text className="text-[18px] font-medium mx-5">
              {i18n.t('farmers.title')}
            </Text>
            {loading ? (
              <View className="flex flex-row justify-center items-center p-5 py-10">
                <Text className="text-[16px] font-medium">
                  {i18n.t('loading')}
                </Text>
              </View>
            ) : farmersToSync.length > 0 ? (
              <View className="flex flex-col mx-5 mt-5 rounded-md border border-LightGray bg-White">
                {farmersToSync.map((f: any, index: number) => (
                  <View
                    className={cn(
                      'border-b border-b-LightGray',
                      index === farmersToSync.length - 1 && 'border-b-0'
                    )}
                    key={index}
                  >
                    <View className="flex flex-row justify-between items-center py-4 pr-4 ml-4">
                      <View className="max-w-[45%]">
                        <Text className="font-bold">
                          {i18n.t('synced.name')}
                        </Text>
                        <Text>
                          {f?.name ?? ''}
                          {f?.name ? ' ' : ''}
                          {f?.surname}
                        </Text>
                      </View>
                      <View
                        className={cn(
                          'py-0.5 px-1.5 border rounded-full',
                          f.userId === '0'
                            ? 'bg-Orange/20 border-Orange'
                            : 'bg-Green/20 border-Green'
                        )}
                      >
                        <Text
                          className={cn(
                            'text-[12px]',
                            f.userId === '0' ? 'text-Orange' : 'text-Green'
                          )}
                        >
                          {f.userId === '0'
                            ? i18n.t('synced.guestMode')
                            : i18n.t('synced.offlineMode')}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="flex flex-row justify-center items-center p-5 py-10">
                <Text className="text-[16px] font-medium">
                  {i18n.t('synced.noFarmers')}
                </Text>
              </View>
            )}

            <Text className="text-[18px] font-medium mx-5 mt-5">
              {i18n.t('plots.title')}
            </Text>
            {loading ? (
              <View className="flex flex-row justify-center items-center p-5 py-10">
                <Text className="text-[16px] font-medium">
                  {i18n.t('loading')}
                </Text>
              </View>
            ) : plotsToSync.length > 0 ? (
              <View className="flex flex-col mx-5 mt-5 rounded-md border border-LightGray bg-White">
                {plotsToSync.map((p: any, index: number) => {
                  const farmerDisplay = [
                    ...farmersToSync,
                    ...farmersSynced,
                  ].find((fds: any) => fds.id === p.farmerId);

                  return (
                    <View
                      className={cn(
                        'border-b border-b-LightGray py-4',
                        index === plotsToSync.length - 1 && 'border-b-0'
                      )}
                      key={index}
                    >
                      <View className="flex flex-row justify-between items-center pr-4 ml-4">
                        <View className="max-w-[45%]">
                          <Text className="font-bold">
                            {i18n.t('synced.name')}
                          </Text>
                          <Text>{p.data.plotName}</Text>
                        </View>
                        <View
                          className={cn(
                            'py-0.5 px-1.5 border rounded-full',
                            p.userId === '0'
                              ? 'bg-Orange/20 border-Orange'
                              : 'bg-Green/20 border-Green'
                          )}
                        >
                          <Text
                            className={cn(
                              'text-[12px]',
                              p.userId === '0' ? 'text-Orange' : 'text-Green'
                            )}
                          >
                            {p.userId === '0'
                              ? i18n.t('synced.guestMode')
                              : i18n.t('synced.offlineMode')}
                          </Text>
                        </View>
                      </View>
                      <View className="flex flex-row justify-between items-center pr-4 mt-2 ml-4">
                        <View className="max-w-[45%]">
                          <Text className="font-bold">
                            {i18n.t('synced.syncToFarmer')}
                          </Text>
                          <Text>
                            {farmerDisplay?.name ?? ''}
                            {farmerDisplay?.name ? ' ' : ''}
                            {farmerDisplay?.surname}
                          </Text>
                        </View>
                        <Pressable onPress={() => handleEditPlot(p)}>
                          <Pencil size={18} color={Colors.orange} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="flex flex-row justify-center items-center p-5 py-10">
                <Text className="text-[16px] font-medium">
                  {i18n.t('synced.noPlots')}
                </Text>
              </View>
            )}
          </ScrollView>
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
              <Pressable
                onPress={farmerRefresh}
                className="self-start px-4 py-2 mx-5 rounded-md bg-Orange"
              >
                <Text className="text-white">
                  {i18n.t('farmers.refreshFarmers')}
                </Text>
              </Pressable>
              <Selector
                items={
                  [...farmersSynced, ...farmersToSync]?.map((f) => ({
                    label: `${f?.name ?? ''}${f?.name ? ' ' : ''}${f?.surname}`,
                    value: f?.id,
                  })) ?? []
                }
                selected={editingPlot?.farmerId}
                setSelected={updatePlotFarmerId}
              />
            </BottomSheetScrollView>
          </BottomSheetModal>
          <Pressable
            className="pb-5 bg-White"
            onPress={syncData}
            disabled={
              !isConnected ||
              (farmersToSync.length === 0 && plotsToSync.length === 0)
            }
          >
            {({ pressed }) => (
              <View
                className={cn(
                  pressed ||
                    !isConnected ||
                    (farmersToSync.length === 0 && plotsToSync.length === 0)
                    ? 'bg-LightOrange'
                    : 'bg-Orange',
                  'flex flex-row m-5 p-3 items-center justify-center rounded-md h-[48px]'
                )}
              >
                {syncing ? (
                  <ActivityIndicator />
                ) : (
                  <RefreshCw color={Colors.white} />
                )}
                <View className="w-2" />
                <Text className="text-[16px] text-White font-semibold">
                  {i18n.t('home.syncData')}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}
