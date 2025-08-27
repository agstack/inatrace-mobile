import Card from '@/components/common/Card';
import { ShadowButtonStyle } from '@/constants/Shadow';
import { AuthContext } from '@/context/AuthContext';
import i18n from '@/locales/i18n';
import { ProductTypeWithCompanyId } from '@/types/farmer';
import { router, useNavigation } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useContext, useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import realm from '@/realm/useRealm';
import { PlotSchema } from '@/realm/schemas';
import { Plot } from '@/types/plot';
import { User } from '@/types/user';
import { RequestParams } from '@/types/auth';
import cn from '@/utils/cn';
import { useSelectedFarmerState } from '@/state/state';
import Colors from '@/constants/Colors';

type PlotInto = {
  plotName: string;
  crop: string;
  numberOfPlants: string;
  size: string;
  geoId: string;
  certification: string;
  organicStartOfTransition: string;
};

type PlotInfoErrors = {
  plotName: boolean;
  crop: boolean;
};

const certificationItems = [
  {
    label: 'EU_ORGANIC',
    value: 'EU_ORGANIC',
  },
  /* {
    label: 'RAINFOREST_ALLIANCE',
    value: 'RAINFOREST_ALLIANCE',
  },
  {
    label: 'CARBON_NEUTRAL',
    value: 'CARBON_NEUTRAL',
  },
  {
    label: 'FAIRTRADE',
    value: 'FAIRTRADE',
  }, */
];

export default function AddPlot() {
  const [plotInfo, setPlotInfo] = useState<PlotInto>({} as PlotInto);
  const [plotFieldErrors, setPlotFieldErrors] = useState<PlotInfoErrors>(
    {} as PlotInfoErrors
  );
  const [crops, setCrops] = useState<Array<{ label: string; value: string }>>(
    []
  );
  const {
    newPlot,
    productTypes,
    selectedCompany,
    user,
    isConnected,
    guestAccess,
    makeRequest,
  } = useContext(AuthContext) as {
    newPlot: Plot;
    productTypes: ProductTypeWithCompanyId[];
    selectedCompany: number;
    user: User;
    isConnected: boolean;
    guestAccess: boolean;
    makeRequest: ({
      url,
      method,
      body,
      headers,
    }: RequestParams) => Promise<any>;
  };

  const { selectedFarmer, setSelectedFarmer } = useSelectedFarmerState();

  const [loading, setLoading] = useState<boolean>(false);

  const navigation = useNavigation();

  const updateState = (path: Array<string | number>, value: any) => {
    setPlotInfo((currentInfo) => {
      const updateNestedObject = (
        object: any,
        path: Array<string | number>,
        value: any
      ): any => {
        const updatedObject = { ...object };

        const key = path[0];

        setPlotFieldErrors((currentErrors) => {
          const updatedErrors = { ...currentErrors };

          if (key === 'plotName') {
            updatedErrors.plotName = false;
          } else if (key === 'crop') {
            updatedErrors.crop = false;
          }

          return updatedErrors;
        });

        if (path.length === 1) {
          updatedObject[key] = value;
        } else {
          updatedObject[key] = updateNestedObject(
            object[key] || {},
            path.slice(1),
            value
          );
        }

        return updatedObject;
      };

      return updateNestedObject(currentInfo, path, value);
    });
  };

  useEffect(() => {
    if (
      guestAccess &&
      productTypes.length > 0 &&
      typeof productTypes !== 'string'
    ) {
      setCrops(
        productTypes.map((product: any) => ({
          label: product?.name,
          value: product?.id?.toString(),
        }))
      );
      setPlotInfo((currentInfo) => ({
        ...currentInfo,
        crop: (productTypes[0] as any)?.id?.toString(),
      }));
      return;
    }

    if (
      productTypes.length > 0 &&
      typeof productTypes !== 'string' &&
      selectedCompany &&
      typeof selectedCompany !== 'string'
    ) {
      const products = productTypes?.find(
        (product: ProductTypeWithCompanyId) => {
          return product.companyId === selectedCompany;
        }
      );

      if (products) {
        setCrops(
          products.productTypes.map((product) => ({
            label: product?.name,
            value: product?.id?.toString(),
          }))
        );

        const firstProduct = products.productTypes[0];
        setPlotInfo((currentInfo) => ({
          ...currentInfo,
          crop: firstProduct?.id?.toString(),
        }));
      }
    }
  }, [productTypes, selectedCompany]);

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

  const validateFields = () => {
    const errors: PlotInfoErrors = {
      plotName: !plotInfo.plotName ? true : false,
      crop: !plotInfo.crop ? true : false,
    };

    setPlotFieldErrors(errors);

    return Object.values(errors).every((error) => !error);
  };

  const savePlot = async () => {
    if (!validateFields()) return;
    if (!selectedFarmer) return;

    setLoading(true);

    try {
      if (
        isConnected &&
        !isUUIDV4(selectedFarmer.id.toString()) &&
        !guestAccess
      ) {
        const response = await makeRequest({
          url: `/api/company/userCustomers/${selectedFarmer.id}/plots/add`,
          method: 'POST',
          body: {
            plotName: plotInfo.plotName,
            crop: { id: parseInt(plotInfo.crop, 10) },
            numberOfPlants: parseInt(plotInfo.numberOfPlants, 10),
            unit: newPlot.size.split(' ')[1],
            size: parseFloat(newPlot.size.split(' ')[0]),
            geoId: '',
            organicStartOfTransition: plotInfo.organicStartOfTransition,
            certification: plotInfo.certification,
            coordinates: newPlot.featureInfo.geometry.coordinates[0].map(
              (coordinate: number[]) => {
                return { latitude: coordinate[1], longitude: coordinate[0] };
              }
            ),
          },
        });

        setSelectedFarmer({
          ...selectedFarmer,
          plots: [...selectedFarmer.plots, response.data.data],
        });

        if (response.data.status !== 'OK') {
          Alert.alert(
            i18n.t('plots.addPlot.error'),
            i18n.t('plots.addPlot.errorMessage')
          );
          return;
        }
      } else {
        const plot: Plot = {
          id: newPlot?.id ?? '',
          plotName: plotInfo.plotName,
          crop: plotInfo.crop,
          numberOfPlants: parseInt(plotInfo.numberOfPlants, 10),
          size: newPlot?.size ?? '',
          geoId: newPlot?.geoId ?? '',
          certification: plotInfo.certification,
          organicStartOfTransition: plotInfo.organicStartOfTransition,
          featureInfo: newPlot?.featureInfo ?? {
            type: 'Feature',
            properties: {},
            id: '',
            geometry: { type: 'Polygon', coordinates: [] },
          },
        };

        const plotRealm = {
          id: plot.id,
          farmerId: selectedFarmer?.id?.toString(),
          userId: guestAccess ? '0' : user.id.toString(),
          data: JSON.stringify(plot),
          synced: false,
        };

        await realm.realmWrite(PlotSchema, plotRealm);
      }

      if (guestAccess) {
        router.back();
      }

      router.back();
      router.replace(
        `${guestAccess ? 'info' : 'view'}/${selectedFarmer?.id?.toString()}` as any
      );
    } catch (error) {
      console.error('Error saving plot', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{
        justifyContent: 'space-between',
        height: '100%',
      }}
      className="flex border-t bg-White border-t-LightGray"
    >
      <View>
        <Text className="text-[18px] font-medium mt-5 mx-5">
          {i18n.t('plots.addPlot.plotInformation')}
        </Text>
        <Card
          items={[
            {
              type: 'type',
              name: i18n.t('plots.addPlot.plotName') + '*',
              placeholder: i18n.t('input.type'),
              value: plotInfo?.plotName ?? '',
              setValue: (value: string) => updateState(['plotName'], value),
              error: plotFieldErrors?.plotName,
            },
            {
              type: 'select',
              name: i18n.t('plots.addPlot.crop') + '*',
              placeholder: i18n.t('input.select'),
              value: plotInfo?.crop ?? '',
              setValue: (value: string) => updateState(['crop'], value),
              selectItems: crops,
              error: plotFieldErrors?.crop,
            },
            {
              type: 'type',
              name: i18n.t('plots.addPlot.numberOfPlants'),
              placeholder: i18n.t('input.type'),
              value: plotInfo?.numberOfPlants?.toString() ?? '',
              isNumeric: true,
              setValue: (value: string) =>
                updateState(['numberOfPlants'], value),
            },
            {
              type: 'view',
              name: i18n.t('plots.addPlot.size'),
              value: newPlot?.size ?? '',
            },
            {
              type: 'view',
              name: i18n.t('plots.addPlot.geoId'),
              value: newPlot?.geoId ?? '',
            },
            {
              type: 'select',
              name: i18n.t('plots.addPlot.certification'),
              placeholder: i18n.t('input.select'),
              value: plotInfo?.certification ?? '',
              setValue: (value: string) =>
                updateState(['certification'], value),
              selectItems: certificationItems,
              snapPoints: '50%',
            },
            {
              type: 'date',
              name: i18n.t('plots.addPlot.organicStartOfTransition'),
              placeholder: i18n.t('input.select'),
              value: plotInfo?.organicStartOfTransition ?? '',
              setValue: (value: string) =>
                updateState(['organicStartOfTransition'], value),
            },
          ]}
        />
      </View>
      <Pressable
        className={cn(
          'flex flex-row justify-center items-center mx-5 mt-5 mb-10 h-12 rounded-md',
          loading ? 'bg-LightOrange' : 'bg-Orange'
        )}
        style={ShadowButtonStyle}
        onPress={savePlot}
        disabled={loading}
      >
        <ActivityIndicator color="white" animating={loading} className="mr-2" />
        <Text className="text-White text-[18px] font-medium">
          {i18n.t('plots.addPlot.savePlot')}
        </Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

const isUUIDV4 = (uuid: string) => {
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  return uuidV4Regex.test(uuid);
};
