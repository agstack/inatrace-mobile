import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import ViewSwitcher, { ViewSwitcherProps } from './ViewSwitcher';
import { useContext, useEffect, useState } from 'react';
import { Plot } from '@/types/plot';
import { emptyComponent } from '../common/FlashListComponents';
import Card, { CardProps, ItemProps } from '../common/Card';
import { FlashList } from '@shopify/flash-list';
import { AuthContext } from '@/context/AuthContext';
import i18n from '@/locales/i18n';
import realm from '@/realm/useRealm';
import { PlotSchema } from '@/realm/schemas';
import { Farmer, ProductTypeWithCompanyId } from '@/types/farmer';
import { User } from '@/types/user';
import { RequestParams } from '@/types/auth';
import cn from '@/utils/cn';
import { FileUp } from 'lucide-react-native';
import { useSelectedFarmerState } from '@/state/state';
import Colors from '@/constants/Colors';

type SummaryData = {
  crop: string;
  numberOfPlots: number;
  totalArea: number;
};

export default function ListView({
  viewType,
  setViewType,
  setSeePlot,
}: ViewSwitcherProps) {
  const [featureCollection, setFeatureCollection] =
    useState<GeoJSON.FeatureCollection>({
      type: 'FeatureCollection',
      features: [],
    });
  const [data, setData] = useState<CardProps[]>([]);
  const [summary, setSummary] = useState<CardProps>({} as CardProps);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingGeoId, setLoadingGeoId] = useState<number>(-1);

  const { selectedFarmer, setSelectedFarmer } = useSelectedFarmerState();

  const {
    user,
    productTypes,
    selectedCompany,
    isConnected,
    guestAccess,
    makeRequest,
  } = useContext(AuthContext) as {
    user: User;
    productTypes: ProductTypeWithCompanyId[];
    selectedCompany: number;
    isConnected: boolean;
    guestAccess: boolean;
    makeRequest: ({
      url,
      method,
      body,
      headers,
    }: RequestParams) => Promise<any>;
  };

  useEffect(() => {
    if (selectedFarmer) {
      loadPlotsAndSummary();
    }
  }, [selectedFarmer]);

  const handleSeePlot = (plotId: string) => {
    if (setSeePlot) {
      setViewType('map');
      setSeePlot(plotId);
    }
  };

  const loadPlotsAndSummary = async () => {
    setLoading(true);
    try {
      let summaryData: SummaryData[] = [];

      if ((productTypes as any) === 'none') return;

      const product = guestAccess
        ? {
            companyId: 0,
            productTypes: [productTypes?.find((p: any) => p.id === 1) as any],
          }
        : productTypes?.find((p: ProductTypeWithCompanyId) => {
            return p.companyId === selectedCompany;
          });

      const offlinePlots = await realm.realmRead(
        PlotSchema,
        undefined,
        undefined,
        undefined,
        undefined,
        `farmerId == '${selectedFarmer?.id}' AND userId == '${guestAccess ? '0' : user.id}'`
      );

      let features: GeoJSON.Feature[] = [];

      const dataToDisplay =
        offlinePlots?.map((plot: any) => {
          const plotData = JSON.parse(plot.data) as Plot;
          const summarySize = parseFloat(plotData.size.split(' ')[0]);

          features.push(plotData.featureInfo);

          if (summaryData.find((s) => s.crop === plotData.crop)) {
            const summaryIndex = summaryData.findIndex(
              (s) => s.crop === plotData.crop
            );
            summaryData[summaryIndex].numberOfPlots += 1;
            summaryData[summaryIndex].totalArea += summarySize;
          } else {
            summaryData.push({
              crop: plotData.crop,
              numberOfPlots: 1,
              totalArea: summarySize,
            });
          }

          const crop = product?.productTypes.find(
            (p) => p.id.toString() === plotData.crop
          );

          return {
            items: [
              {
                type: 'view',
                name: i18n.t('plots.addPlot.crop'),
                value: crop?.name,
                editable: false,
              },
              {
                type: 'view',
                name: i18n.t('plots.addPlot.numberOfPlants'),
                value: plotData.numberOfPlants
                  ? plotData.numberOfPlants.toString()
                  : '0',
                editable: false,
              },
              {
                type: 'view',
                name: i18n.t('plots.addPlot.size'),
                value: plotData.size,
                editable: false,
              },
              {
                type: 'view',
                name: i18n.t('plots.addPlot.geoId'),
                value: plotData.geoId,
                editable: false,
                share: true,
              },
              {
                type: 'view',
                name: i18n.t('plots.addPlot.certification'),
                value: plotData.certification ? plotData.certification : '',
                editable: false,
              },
              {
                type: 'view',
                name: i18n.t('plots.addPlot.organicStartOfTransition'),
                value: plotData.organicStartOfTransition
                  ? Intl.DateTimeFormat('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: '2-digit',
                    }).format(new Date(plotData.organicStartOfTransition))
                  : '',
                editable: false,
              },
            ],
            title: plotData.plotName,
            synced: false,
            switchView: () => handleSeePlot(plotData.id.toString()),
          } as CardProps;
        }) ?? [];

      const farmerPlots =
        selectedFarmer?.plots?.map((plot: any) => {
          const summarySize = parseFloat(plot.size ?? 0);

          if (summaryData.find((s) => s.crop === plot.crop.id.toString())) {
            const summaryIndex = summaryData.findIndex(
              (s) => s.crop === plot.crop.id.toString()
            );
            summaryData[summaryIndex].numberOfPlots += 1;
            summaryData[summaryIndex].totalArea += summarySize;
          } else {
            summaryData.push({
              crop: plot.crop.id.toString(),
              numberOfPlots: 1,
              totalArea: summarySize,
            });
          }

          const featureInfo = {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                plot?.coordinates.map((c: any) => [c.longitude, c.latitude]),
              ],
            },
          };

          features.push(featureInfo as any);

          const crop = product?.productTypes.find((p) => p.id === plot.crop.id);

          return {
            id: plot.id,
            title: plot.plotName,
            synced: true,
            items: [
              {
                type: 'view',
                name: i18n.t('plots.addPlot.crop'),
                value: crop?.name,
                editable: false,
              },
              {
                type: 'view',
                name: i18n.t('plots.addPlot.numberOfPlants'),
                value: plot.numberOfPlants
                  ? plot.numberOfPlants.toString()
                  : '0',
                editable: false,
              },
              {
                type: 'view',
                name: i18n.t('plots.addPlot.size'),
                value: plot.size ? plot.size + ' ' + plot.unit : '/',
                editable: false,
              },
              {
                type: 'view',
                name: i18n.t('plots.addPlot.geoId'),
                value: plot.geoId,
                editable: false,
                share: true,
              },
              {
                type: 'view',
                name: i18n.t('plots.addPlot.certification'),
                value: plot.certification ? plot.certification : '',
                editable: false,
              },
              {
                type: 'view',
                name: i18n.t('plots.addPlot.organicStartOfTransition'),
                value: plot.organicStartOfTransition
                  ? Intl.DateTimeFormat('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: '2-digit',
                    }).format(new Date(plot.organicStartOfTransition))
                  : '',
                editable: false,
              },
            ],
            switchView: () => handleSeePlot(plot.id.toString()),
          } as CardProps;
        }) ?? [];

      if (summaryData.length !== 0) {
        const summaryItems = summaryData.map((s: any) => {
          const crop = product?.productTypes.find(
            (p) => p.id.toString() === s.crop
          );

          return {
            type: 'view',
            name: crop?.name,
            value: `${s.numberOfPlots} ${i18n.t('plots.plots')}, ${s.totalArea.toFixed(2) ?? 0} ha ${i18n.t('plots.totalArea')}`,
            editable: false,
          };
        });

        setSummary({
          items: summaryItems as ItemProps[],
        });
      }

      setFeatureCollection({
        type: 'FeatureCollection',
        features,
      });

      setData([...dataToDisplay, ...farmerPlots]);
    } catch (error) {
      console.error('Failed to load plots:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshGeoId = async (plotId?: number, isSynced?: boolean) => {
    if (!isConnected || !plotId || !isSynced || guestAccess || !selectedFarmer)
      return;

    setLoadingGeoId(plotId);

    try {
      const response = await makeRequest({
        url: `/api/company/userCustomers/${selectedFarmer.id}/plots/${plotId}/updateGeoID`,
        method: 'POST',
      });

      const geoId = response.data.data.geoId;

      if (!geoId) {
        Alert.alert(
          i18n.t('plots.refreshGeoIdError'),
          i18n.t('plots.refreshGeoIdErrorAGSTACK')
        );
        return;
      }

      setSelectedFarmer({
        ...selectedFarmer,
        plots: selectedFarmer.plots?.map((plot) => {
          if (parseInt(plot.id) === plotId) {
            return {
              ...plot,
              geoId,
            };
          }
          return plot;
        }),
      } as Farmer);
      Alert.alert(
        i18n.t('plots.refreshGeoIdSuccess'),
        i18n.t('plots.refreshGeoIdSuccessMessage')
      );
    } catch (e) {
      console.error('Failed to refresh geoId:', e);
      Alert.alert(
        i18n.t('plots.refreshGeoIdError'),
        i18n.t('plots.refreshGeoIdErrorMessage')
      );
    } finally {
      setLoadingGeoId(-1);
    }
  };

  const exportPlots = async () => {
    if (!selectedFarmer) return;

    const filePath = `${RNFS.DocumentDirectoryPath}/${selectedFarmer.id}_plots.geojson`;

    try {
      const plotsJson = JSON.stringify(featureCollection);

      await RNFS.writeFile(filePath, plotsJson, 'utf8');

      Alert.alert(i18n.t('plots.exportTitle'), i18n.t('plots.exportMessage'), [
        {
          text: i18n.t('plots.cancel'),
          style: 'cancel',
          onPress: async () => {
            await RNFS.unlink(filePath);
          },
        },
        {
          text: i18n.t('plots.share'),
          onPress: async () => {
            const shareOptions = {
              title: i18n.t('plots.exportTitle'),
              url: `file://${filePath}`,
              type: 'application/json',
              filename: `${selectedFarmer.id}_plots.geojson`,
            };
            await Share.open(shareOptions);
          },
        },
        {
          text: i18n.t('plots.copyContent'),
          onPress: async () => {
            try {
              Clipboard.setString(plotsJson);
              Alert.alert(
                i18n.t('plots.copySuccessTitle'),
                i18n.t('plots.copySuccessMessage')
              );
            } catch (error) {
              console.error('Failed to copy content:', error);
              await RNFS.unlink(filePath);
              Alert.alert(
                i18n.t('plots.exportError'),
                i18n.t('plots.copyErrorMessage')
              );
            }
          },
        },
      ]);
    } catch (error) {
      try {
        await RNFS.unlink(filePath);
      } catch (unlinkError) {
        console.error('Failed to delete file:', unlinkError);

        Alert.alert(
          i18n.t('plots.exportError'),
          i18n.t('plots.exportErrorMessage')
        );
      }
    }
  };

  return (
    <View className="h-full">
      <ViewSwitcher
        viewType={viewType}
        setViewType={setViewType}
        padding
        setSeePlot={setSeePlot}
      />
      {summary?.items?.length > 0 && (
        <View>
          <Text className="text-[18px] font-medium mx-5">
            {i18n.t('plots.summaryTitle')}
          </Text>
          <Card {...summary} />
        </View>
      )}
      {data.length > 0 && (
        <View className="flex flex-row justify-between items-center mx-5">
          <Text className="text-[18px] font-medium my-2">
            {i18n.t('plots.plotsTitle')}
          </Text>
          <Pressable
            onPress={exportPlots}
            className="flex flex-row justify-center items-center px-5 py-2 rounded-md bg-Orange"
          >
            <FileUp color={Colors.white} style={{ marginRight: 8 }} />
            <Text className="text-[16px] text-White font-semibold">
              {i18n.t('plots.export')}
            </Text>
          </Pressable>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <FlashList
          extraData={[loadingGeoId, isConnected]}
          data={data}
          renderItem={({ item }) => (
            <View>
              <Pressable
                className={cn(
                  'flex flex-row items-center self-start px-2 py-1 mt-3 ml-5 -mb-3 rounded-md',
                  isConnected && !guestAccess ? 'bg-Orange' : 'bg-LightOrange'
                )}
                disabled={!isConnected || !item.synced || guestAccess}
                onPress={() => refreshGeoId(item.id, item.synced)}
              >
                {loadingGeoId === item.id && (
                  <ActivityIndicator
                    animating
                    color={'white'}
                    className="mr-2"
                  />
                )}
                <Text className="font-medium text-white">
                  {i18n.t('plots.refreshGeoId')}
                </Text>
              </Pressable>
              <Card {...item} />
            </View>
          )}
          estimatedItemSize={200}
          keyExtractor={(_, index) => index.toString()}
          className="flex flex-col h-full"
          ListEmptyComponent={emptyComponent(
            loading ? i18n.t('loading') : i18n.t('plots.noData')
          )}
          contentContainerStyle={{ paddingBottom: 50 }}
        />
      </View>
    </View>
  );
}
