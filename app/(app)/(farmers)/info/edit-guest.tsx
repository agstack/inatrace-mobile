import Card, { ItemProps } from '@/components/common/Card';
import SelectorMultiple from '@/components/common/SelectorMultiple';
import { ShadowButtonStyle } from '@/constants/Shadow';
import { AuthContext } from '@/context/AuthContext';
import i18n from '@/locales/i18n';
import { Country } from '@/types/country';
import { Farmer, ProductType } from '@/types/farmer';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Link, useNavigation } from 'expo-router';
import { ChevronLeft, PlusCircle, User2, XCircle } from 'lucide-react-native';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Text, Pressable, Alert, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import realm from '@/realm/useRealm';
import { FarmerSchema } from '@/realm/schemas';
import { FullWindowOverlay } from 'react-native-screens';
import { useSelectedFarmerState } from '@/state/state';
import cn from '@/utils/cn';
import { isEqual } from 'lodash';
import Colors from '@/constants/Colors';

type NewFarmerErrors = {
  lastName: boolean;
  gender: boolean;
  country: boolean;
  areaUnit: boolean;
  totalCultivatedArea: boolean;
  hondurasFarm?: boolean;
  hondurasVillage?: boolean;
  hondurasMunicipality?: boolean;
  hondurasDepartment?: boolean;
  village?: boolean;
  cell?: boolean;
  sector?: boolean;
  address?: boolean;
  city?: boolean;
  state?: boolean;
  zip?: boolean;
  otherAddress?: boolean;
};

export default function EditGuestFarmer() {
  const { countries, productTypes } = useContext(AuthContext) as {
    countries: Country[];
    productTypes: ProductType[];
  };

  const { selectedFarmer, setSelectedFarmer } = useSelectedFarmerState();

  const [searchedCountries, setSearchedCountries] =
    useState<Country[]>(countries);
  const navigation = useNavigation();
  const [oldFarmer, _] = useState<Farmer>(selectedFarmer ?? ({} as Farmer));
  const [farmer, setFarmer] = useState<Farmer>(
    selectedFarmer ?? ({} as Farmer)
  );

  const [errors, setErrors] = useState<NewFarmerErrors>({} as NewFarmerErrors);
  const [customAddress, setCustomAddress] = useState<string>('No');

  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const genderItems = [
    {
      label: i18n.t('farmers.newFarmerCreation.gender.female'),
      value: 'FEMALE',
    },
    {
      label: i18n.t('farmers.newFarmerCreation.gender.male'),
      value: 'MALE',
    },
    {
      label: i18n.t('farmers.newFarmerCreation.gender.diverse'),
      value: 'DIVERSE',
    },
    {
      label: i18n.t('farmers.newFarmerCreation.gender.n/a'),
      value: 'N_A',
    },
  ];

  const containerComponent = useCallback(
    (props: any) => <FullWindowOverlay>{props.children}</FullWindowOverlay>,
    []
  );

  useEffect(() => {
    navigation.setOptions({
      title: `${selectedFarmer?.name ?? ''} ${selectedFarmer?.surname}`,
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.goBack()}
          className="flex flex-row justify-center items-center mr-3"
        >
          <ChevronLeft color={Colors.orange} />
          <Text className="font-medium text-Orange text-[18px]">Back</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Link href="/user-settings" asChild>
          <Pressable>
            {({ pressed }) => (
              <View
                className={cn(
                  pressed ? 'bg-LightOrange' : 'bg-Orange',
                  'rounded-full p-[6px]'
                )}
              >
                <User2 color={Colors.white} size={14} />
              </View>
            )}
          </Pressable>
        </Link>
      ),
    });
  }, [selectedFarmer]);

  const updateState = (path: Array<string | number>, value: any) => {
    setFarmer((currentFarmer) => {
      const updateNestedObject = (
        object: any,
        path: Array<string | number>,
        value: any
      ): any => {
        const updatedObject = { ...object };

        const key = path[0];

        updateErrors(key.toString());

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

      return updateNestedObject(currentFarmer, path, value);
    });
  };

  const updateErrors = (key: string) => {
    setErrors((currentErrors) => {
      const updatedErrors = { ...currentErrors };

      if (key === 'surname') {
        updatedErrors.lastName = false;
      } else if (key === 'gender') {
        updatedErrors.gender = false;
      } else if (key === 'country') {
        updatedErrors.country = false;
      } else if (
        key === 'hondurasFarm' &&
        farmer.location?.address?.country?.code === 'HN'
      ) {
        updatedErrors.hondurasFarm = false;
      } else if (
        key === 'hondurasVillage' &&
        farmer.location?.address?.country?.code === 'HN'
      ) {
        updatedErrors.hondurasVillage = false;
      } else if (
        key === 'hondurasMunicipality' &&
        farmer.location?.address?.country?.code === 'HN'
      ) {
        updatedErrors.hondurasMunicipality = false;
      } else if (
        key === 'hondurasDepartment' &&
        farmer.location?.address?.country?.code === 'HN'
      ) {
        updatedErrors.hondurasDepartment = false;
      } else if (
        key === 'village' &&
        farmer.location?.address?.country?.code === 'RW'
      ) {
        updatedErrors.village = false;
      } else if (
        key === 'cell' &&
        farmer.location?.address?.country?.code === 'RW'
      ) {
        updatedErrors.cell = false;
      } else if (
        key === 'sector' &&
        farmer.location?.address?.country?.code === 'RW'
      ) {
        updatedErrors.sector = false;
      } else if (
        key === 'address' &&
        farmer.location?.address?.country?.code !== 'HN' &&
        farmer.location?.address?.country?.code !== 'RW' &&
        customAddress !== 'Yes'
      ) {
        updatedErrors.address = false;
      } else if (
        key === 'city' &&
        farmer.location?.address?.country?.code !== 'HN' &&
        farmer.location?.address?.country?.code !== 'RW' &&
        customAddress !== 'Yes'
      ) {
        updatedErrors.city = false;
      } else if (
        key === 'state' &&
        farmer.location?.address?.country?.code !== 'HN' &&
        farmer.location?.address?.country?.code !== 'RW' &&
        customAddress !== 'Yes'
      ) {
        updatedErrors.state = false;
      } else if (
        key === 'zip' &&
        farmer.location?.address?.country?.code !== 'HN' &&
        farmer.location?.address?.country?.code !== 'RW' &&
        customAddress !== 'Yes'
      ) {
        updatedErrors.zip = false;
      } else if (key === 'otherAddress' && customAddress === 'Yes') {
        updatedErrors.otherAddress = false;
      }

      return updatedErrors;
    });
  };

  const updateSearchCountries = (search: string) => {
    setSearchedCountries(
      countries.filter((country) =>
        country.name.toLowerCase().includes(search.toLowerCase())
      )
    );
  };

  const validateFields = () => {
    const errors: NewFarmerErrors = {
      lastName: !farmer.surname,
      gender: !farmer.gender,
      country: !farmer.location?.address?.country,
      areaUnit: !farmer.farm?.areaUnit,
      totalCultivatedArea: !farmer.farm?.totalCultivatedArea,
      hondurasFarm:
        farmer?.location?.address?.country?.code === 'HN' &&
        !farmer.location?.address?.hondurasFarm,
      hondurasVillage:
        farmer?.location?.address?.country?.code === 'HN' &&
        !farmer.location?.address?.hondurasVillage,
      hondurasMunicipality:
        farmer?.location?.address?.country?.code === 'HN' &&
        !farmer.location?.address?.hondurasMunicipality,
      hondurasDepartment:
        farmer?.location?.address?.country?.code === 'HN' &&
        !farmer.location?.address?.hondurasDepartment,
      village:
        farmer?.location?.address?.country?.code === 'RW' &&
        !farmer.location?.address?.village,
      cell:
        farmer?.location?.address?.country?.code === 'RW' &&
        !farmer.location?.address?.cell,
      sector:
        farmer?.location?.address?.country?.code === 'RW' &&
        !farmer.location?.address?.sector,
      address:
        farmer?.location?.address?.country?.code !== 'HN' &&
        farmer?.location?.address?.country?.code !== 'RW' &&
        customAddress !== 'Yes' &&
        !farmer.location?.address?.address,
      city:
        farmer?.location?.address?.country?.code !== 'HN' &&
        farmer?.location?.address?.country?.code !== 'RW' &&
        customAddress !== 'Yes' &&
        !farmer.location?.address?.city,
      state:
        farmer?.location?.address?.country?.code !== 'HN' &&
        farmer?.location?.address?.country?.code !== 'RW' &&
        customAddress !== 'Yes' &&
        !farmer.location?.address?.state,
      zip:
        farmer?.location?.address?.country?.code !== 'HN' &&
        farmer?.location?.address?.country?.code !== 'RW' &&
        customAddress !== 'Yes' &&
        !farmer.location?.address?.zip,
      otherAddress:
        customAddress === 'Yes' && !farmer.location?.address?.otherAddress,
    };

    setErrors(errors);

    return Object.values(errors).every((error) => !error);
  };

  const saveFarmer = async () => {
    if (!validateFields()) return;

    const farmerBody = {
      type: 'FARMER',
      id: farmer.id ?? '',
      name: farmer.name ?? '',
      surname: farmer.surname ?? '',
      phone: farmer.phone ?? '',
      email: farmer.email ?? '',
      hasSmartphone: farmer.hasSmartphone ?? false,
      location: {
        address: {
          cell: farmer.location?.address?.cell ?? '',
          sector: farmer.location?.address?.sector ?? '',
          village: farmer.location?.address?.village ?? '',
          address: farmer.location?.address?.address ?? '',
          city: farmer.location?.address?.city ?? '',
          state: farmer.location?.address?.state ?? '',
          zip: farmer.location?.address?.zip ?? '',
          hondurasFarm: farmer.location?.address?.hondurasFarm ?? '',
          hondurasVillage: farmer.location?.address?.hondurasVillage ?? '',
          hondurasMunicipality:
            farmer.location?.address?.hondurasMunicipality ?? '',
          hondurasDepartment:
            farmer.location?.address?.hondurasDepartment ?? '',
          country: farmer.location?.address?.country,
          otherAddress: farmer.location?.address?.otherAddress ?? '',
        },
      },
      gender: farmer.gender ?? '',
      bank: {
        accountHolderName: farmer.bank?.accountHolderName ?? '',
        accountNumber: farmer.bank?.accountNumber ?? '',
        bankName: farmer.bank?.bankName ?? '',
        additionalInformation: farmer.bank?.additionalInformation ?? '',
      },
      farm: {
        areaUnit: farmer.farm?.areaUnit ?? '',
        totalCultivatedArea: farmer.farm?.totalCultivatedArea ?? 0,
        farmPlantInformationList: farmer.farm?.farmPlantInformationList ?? [],
        organic: farmer.farm?.organic ?? false,
        areaOrganicCertified: farmer.farm?.areaOrganicCertified ?? 0,
        startTransitionToOrganic: farmer.farm?.startTransitionToOrganic ?? '',
      },
      associations: [],
      cooperatives: [],
      certifications: [],
      productTypes:
        farmer.farm?.farmPlantInformationList?.map(
          (item) => item.productType
        ) ?? [],
    } as any;

    try {
      await realm.realmUpdate(
        FarmerSchema,
        farmer.id.toString(),
        'data',
        JSON.stringify(farmerBody)
      );

      setSelectedFarmer(farmerBody);

      Alert.alert(
        i18n.t('farmers.newFarmerCreation.success'),
        i18n.t('farmers.newFarmerCreation.successEditMessage'),
        [
          {
            text: i18n.t('farmers.newFarmerCreation.ok'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        i18n.t('farmers.newFarmerCreation.error'),
        i18n.t('farmers.newFarmerCreation.errorEditMessage')
      );
    }
  };

  const updateCustomAddress = (value: string) => {
    if (value === 'Yes') {
      setFarmer((currentFarmer: Farmer) => {
        return {
          ...currentFarmer,
          location: {
            ...currentFarmer.location,
            address: {
              ...currentFarmer.location?.address,
              address: '',
              city: '',
              state: '',
              zip: '',
            },
          },
        };
      });
      setErrors((currentErrors) => {
        return {
          ...currentErrors,
          address: false,
          city: false,
          state: false,
          zip: false,
        };
      });
    } else {
      setFarmer((currentFarmer: Farmer) => {
        return {
          ...currentFarmer,
          location: {
            ...currentFarmer.location,
            address: {
              ...currentFarmer.location?.address,
              otherAddress: '',
            },
          },
        };
      });
      setErrors((currentErrors) => {
        return {
          ...currentErrors,
          otherAddress: false,
        };
      });
    }
    setCustomAddress(value);
  };

  const isDisabled = useMemo(() => {
    if (isEqual(farmer, oldFarmer)) {
      return true;
    }
    if (!validateFields()) {
      return true;
    }

    return false;
  }, [farmer, oldFarmer]);

  return (
    <>
      <View className="flex flex-row justify-center items-center w-full h-5 bg-black/50">
        <Text className="text-white">{i18n.t('guestAccess')}</Text>
      </View>
      <KeyboardAwareScrollView
        extraScrollHeight={52}
        className="h-full border-t bg-White border-t-LightGray"
      >
        <Text className="text-[18px] font-medium mt-5 mx-5">
          {i18n.t('farmers.info.basicInformation.title')}
        </Text>
        <Card
          items={[
            {
              type: 'type',
              name: i18n.t('farmers.info.basicInformation.firstName'),
              placeholder: i18n.t('input.type'),
              value: farmer?.name ?? '',
              setValue: (value: string) => updateState(['name'], value),
            },
            {
              type: 'type',
              name: i18n.t('farmers.info.basicInformation.lastName') + '*',
              placeholder: i18n.t('input.type'),
              value: farmer?.surname ?? '',
              setValue: (value: string) => updateState(['surname'], value),
              error: errors.lastName,
            },
            {
              type: 'select',
              name: i18n.t('farmers.info.basicInformation.gender') + '*',
              placeholder: i18n.t('input.select'),
              value: farmer?.gender ?? '',
              setValue: (value: string) => updateState(['gender'], value),
              selectItems: genderItems,
              error: errors.gender,
            },
            {
              type: 'type',
              name: i18n.t(
                'farmers.info.basicInformation.companyInternalFarmerId'
              ),
              placeholder: i18n.t('input.type'),
              value: farmer?.farmerCompanyInternalId ?? '',
              setValue: (value: string) =>
                updateState(['farmerCompanyInternalId'], value),
            },
          ]}
        />

        <Text className="text-[18px] font-medium mt-5 mx-5">
          {i18n.t('farmers.info.address.title')}
        </Text>
        <Card
          items={[
            {
              type: 'select',
              name: i18n.t('farmers.info.address.country') + '*',
              placeholder: i18n.t('input.select'),
              value: farmer?.location?.address?.country?.name ?? '',
              setValue: (value: string) =>
                updateState(
                  ['location', 'address', 'country'],
                  searchedCountries?.find(
                    (country) => country.name === value
                  ) ?? {}
                ),
              selectItems: searchedCountries?.map((country: Country) => ({
                label: country.name,
                value: country.name,
              })),
              selectWithSearch: true,
              updateSearch: updateSearchCountries,
              error: errors.country,
            },
            ...((farmer?.location?.address?.country?.code === 'HN'
              ? [
                  {
                    type: 'type',
                    name: i18n.t('farmers.info.address.hondurasFarm') + '*',
                    placeholder: i18n.t('input.type'),
                    value: farmer?.location?.address?.hondurasFarm ?? '',
                    setValue: (value: string) =>
                      updateState(
                        ['location', 'address', 'hondurasFarm'],
                        value
                      ),
                    error: errors.hondurasFarm,
                  },
                  {
                    type: 'type',
                    name: i18n.t('farmers.info.address.hondurasVillage') + '*',
                    placeholder: i18n.t('input.type'),
                    value: farmer?.location?.address?.hondurasVillage ?? '',
                    setValue: (value: string) =>
                      updateState(
                        ['location', 'address', 'hondurasVillage'],
                        value
                      ),
                    error: errors.hondurasVillage,
                  },
                  {
                    type: 'type',
                    name:
                      i18n.t('farmers.info.address.hondurasMunicipality') + '*',
                    placeholder: i18n.t('input.type'),
                    value:
                      farmer?.location?.address?.hondurasMunicipality ?? '',
                    setValue: (value: string) =>
                      updateState(
                        ['location', 'address', 'hondurasMunicipality'],
                        value
                      ),
                    error: errors.hondurasMunicipality,
                  },
                  {
                    type: 'type',
                    name:
                      i18n.t('farmers.info.address.hondurasDepartment') + '*',
                    placeholder: i18n.t('input.type'),
                    value: farmer?.location?.address?.hondurasDepartment ?? '',
                    setValue: (value: string) =>
                      updateState(
                        ['location', 'address', 'hondurasDepartment'],
                        value
                      ),
                    error: errors.hondurasDepartment,
                  },
                ]
              : farmer?.location?.address?.country?.code === 'RW'
                ? [
                    {
                      type: 'type',
                      name: i18n.t('farmers.info.address.village') + '*',
                      placeholder: i18n.t('input.type'),
                      value: farmer?.location?.address?.village ?? '',
                      setValue: (value: string) =>
                        updateState(['location', 'address', 'village'], value),
                      error: errors.village,
                    },
                    {
                      type: 'type',
                      name: i18n.t('farmers.info.address.cell') + '*',
                      placeholder: i18n.t('input.type'),
                      value: farmer?.location?.address?.cell ?? '',
                      setValue: (value: string) =>
                        updateState(['location', 'address', 'cell'], value),
                      error: errors.cell,
                    },
                    {
                      type: 'type',
                      name: i18n.t('farmers.info.address.sector') + '*',
                      placeholder: i18n.t('input.type'),
                      value: farmer?.location?.address?.sector ?? '',
                      setValue: (value: string) =>
                        updateState(['location', 'address', 'sector'], value),
                      error: errors.sector,
                    },
                  ]
                : customAddress === 'Yes'
                  ? [
                      {
                        type: 'type',
                        name:
                          i18n.t('farmers.info.address.customAddress') + '*',
                        placeholder: i18n.t('input.type'),
                        value: farmer?.location?.address?.otherAddress ?? '',
                        setValue: (value: string) =>
                          updateState(
                            ['location', 'address', 'otherAddress'],
                            value
                          ),
                        error: errors.otherAddress,
                      },
                      {
                        type: 'checkbox',
                        name: i18n.t(
                          'farmers.info.address.customAddressEnabled'
                        ),
                        value: customAddress,
                        setValue: (value: string) => updateCustomAddress(value),
                      },
                    ]
                  : [
                      {
                        type: 'type',
                        name: i18n.t('farmers.info.address.address') + '*',
                        placeholder: i18n.t('input.type'),
                        value: farmer?.location?.address?.address ?? '',
                        setValue: (value: string) =>
                          updateState(
                            ['location', 'address', 'address'],
                            value
                          ),
                        error: errors.address,
                      },
                      {
                        type: 'type',
                        name: i18n.t('farmers.info.address.city') + '*',
                        placeholder: i18n.t('input.type'),
                        value: farmer?.location?.address?.city ?? '',
                        setValue: (value: string) =>
                          updateState(['location', 'address', 'city'], value),
                        error: errors.city,
                      },
                      {
                        type: 'type',
                        name: i18n.t('farmers.info.address.state') + '*',
                        placeholder: i18n.t('input.type'),
                        value: farmer?.location?.address?.state ?? '',
                        setValue: (value: string) =>
                          updateState(['location', 'address', 'state'], value),
                        error: errors.state,
                      },
                      {
                        type: 'type',
                        name: i18n.t('farmers.info.address.zip') + '*',
                        placeholder: i18n.t('input.type'),
                        value: farmer?.location?.address?.zip ?? '',
                        setValue: (value: string) =>
                          updateState(['location', 'address', 'zip'], value),
                        error: errors.zip,
                      },
                      {
                        type: 'checkbox',
                        name: i18n.t(
                          'farmers.info.address.customAddressEnabled'
                        ),
                        value: customAddress,
                        setValue: (value: string) => updateCustomAddress(value),
                      },
                    ]) as ItemProps[]),
          ]}
        />

        <Text className="text-[18px] font-medium mt-5 mx-5">
          {i18n.t('farmers.info.contact.title')}
        </Text>
        <Card
          items={[
            {
              type: 'type',
              name: i18n.t('farmers.info.contact.phoneNumber'),
              placeholder: i18n.t('input.type'),
              value: farmer?.phone ?? '',
              setValue: (value: string) => updateState(['phone'], value),
            },
            {
              type: 'type',
              name: i18n.t('farmers.info.contact.email'),
              placeholder: i18n.t('input.type'),
              value: farmer?.email ?? '',
              setValue: (value: string) => updateState(['email'], value),
            },
          ]}
        />
        <Text className="text-[18px] font-medium mt-5 mx-5">
          {i18n.t('farmers.info.productTypes.title')}
        </Text>
        <View className="flex items-center w-full">
          <View className="flex flex-row flex-wrap justify-start px-5 mt-2 mb-4 w-full">
            {farmer?.farm?.farmPlantInformationList?.map((item, index) => (
              <View
                key={index}
                className="flex flex-row justify-between items-center px-2 py-1 mt-2 mr-2 rounded-md border border-DarkGray"
              >
                <Text className="text-[16px] text-black mr-2">
                  {item.productType.name.trim()}
                </Text>
                <Pressable
                  className="flex justify-center items-center"
                  onPress={() => {
                    setFarmer((currentFarmer: Farmer) => {
                      return {
                        ...currentFarmer,
                        farm: {
                          ...currentFarmer.farm,
                          farmPlantInformationList:
                            currentFarmer.farm?.farmPlantInformationList?.filter(
                              (f) => f.productType.id !== item.productType.id
                            ),
                        },
                      };
                    });
                  }}
                >
                  <XCircle color={Colors.black} size={16} />
                </Pressable>
              </View>
            ))}
          </View>
          <BottomSheetModal
            ref={bottomSheetRef}
            index={0}
            snapPoints={['50%']}
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
              <SelectorMultiple
                items={productTypes.map((productType: ProductType) => ({
                  label: productType.name,
                  value: productType.id,
                }))}
                selected={
                  farmer?.farm?.farmPlantInformationList?.length > 0
                    ? farmer?.farm?.farmPlantInformationList?.map(
                        (item) => item.productType.id
                      )
                    : []
                }
                setSelected={(selected: string | number) => {
                  const productType = productTypes.find(
                    (productType) => productType.id === selected
                  );
                  if (productType) {
                    if (
                      farmer?.farm?.farmPlantInformationList?.find(
                        (item) => item.productType.id === selected
                      )
                    ) {
                      setFarmer((currentFarmer: Farmer) => {
                        return {
                          ...currentFarmer,
                          farm: {
                            ...currentFarmer.farm,
                            farmPlantInformationList:
                              currentFarmer.farm?.farmPlantInformationList?.filter(
                                (item) => item.productType.id !== selected
                              ),
                          },
                        };
                      });
                    } else {
                      setFarmer((currentFarmer: Farmer) => {
                        return {
                          ...currentFarmer,
                          farm: {
                            ...currentFarmer.farm,
                            farmPlantInformationList: [
                              ...(currentFarmer.farm
                                ?.farmPlantInformationList ?? []),
                              {
                                productType,
                                plantCultivatedArea: 0,
                                numberOfPlants: 0,
                              },
                            ],
                          },
                        };
                      });
                    }
                  }
                }}
              />
            </BottomSheetScrollView>
          </BottomSheetModal>
          <Pressable onPress={() => bottomSheetRef.current?.present()}>
            <PlusCircle color={Colors.black} />
          </Pressable>
        </View>
        <Text className="text-[18px] font-medium mt-5 mx-5">
          {i18n.t('farmers.info.farmInformation.title')}
        </Text>
        <Card
          items={[
            {
              type: 'type',
              name: i18n.t('farmers.info.farmInformation.areaUnit') + '*',
              placeholder: i18n.t('input.type'),
              value: farmer?.farm?.areaUnit ?? '',
              setValue: (value: string) =>
                updateState(['farm', 'areaUnit'], value),
              error: errors.areaUnit,
            },
            {
              type: 'type',
              name:
                i18n.t('farmers.info.farmInformation.totalFarmSize') +
                ` (${farmer?.farm?.areaUnit ?? '/'})` +
                '*',
              placeholder: i18n.t('input.type'),
              value: farmer?.farm?.totalCultivatedArea?.toString() ?? '',
              setValue: (value: string) =>
                updateState(['farm', 'totalCultivatedArea'], value),
              isNumeric: true,
              error: errors.totalCultivatedArea,
            },
            ...(farmer?.farm?.farmPlantInformationList
              ?.map((item, index) => [
                {
                  type: 'view',
                  name:
                    i18n.t('farmers.info.farmInformation.productType') +
                    ` ${index + 1}`,
                  value: item.productType.name,
                } as ItemProps,
                {
                  type: 'type',
                  name:
                    i18n.t('farmers.info.farmInformation.area') +
                    ` (${farmer?.farm?.areaUnit ?? '/'})`,
                  value: item?.plantCultivatedArea?.toString(),
                  placeholder: i18n.t('input.type'),
                  setValue: (value: string) => {
                    setFarmer((currentFarmer: Farmer) => {
                      return {
                        ...currentFarmer,
                        farm: {
                          ...currentFarmer.farm,
                          farmPlantInformationList:
                            currentFarmer.farm?.farmPlantInformationList?.map(
                              (f, i) => {
                                if (i === index) {
                                  return {
                                    ...f,
                                    plantCultivatedArea: parseFloat(value) || 0,
                                  };
                                }
                                return f;
                              }
                            ),
                        },
                      };
                    });
                  },
                  isNumeric: true,
                } as ItemProps,
                {
                  type: 'type',
                  name: i18n.t('farmers.info.farmInformation.plants'),
                  value: item?.numberOfPlants?.toString(),
                  placeholder: i18n.t('input.type'),
                  setValue: (value: string) => {
                    setFarmer((currentFarmer: Farmer) => {
                      return {
                        ...currentFarmer,
                        farm: {
                          ...currentFarmer.farm,
                          farmPlantInformationList:
                            currentFarmer.farm?.farmPlantInformationList?.map(
                              (f, i) => {
                                if (i === index) {
                                  return {
                                    ...f,
                                    numberOfPlants: parseFloat(value) || 0,
                                  };
                                }
                                return f;
                              }
                            ),
                        },
                      };
                    });
                  },
                  isNumeric: true,
                } as ItemProps,
              ])
              .flat() || []),
            {
              type: 'checkbox',
              name: i18n.t('farmers.info.farmInformation.organicFarm'),
              value: farmer?.farm?.organic ? i18n.t('yes') : i18n.t('no'),
              setValue: (value: string) =>
                updateState(
                  ['farm', 'organic'],
                  value === i18n.t('yes') ? true : false
                ),
            },
            {
              type: 'date',
              name: i18n.t(
                'farmers.info.farmInformation.startedTransitionToOrganic'
              ),
              placeholder: i18n.t('input.select'),
              value: farmer?.farm?.startTransitionToOrganic ?? '',
              setValue: (value: string) =>
                updateState(['farm', 'startTransitionToOrganic'], value),
            },
          ]}
        />
        <Text className="text-[18px] font-medium mt-5 mx-5">
          {i18n.t('farmers.info.bankInformation.title')}
        </Text>
        <Card
          items={[
            {
              type: 'type',
              name: i18n.t('farmers.info.bankInformation.bankAccountHolder'),
              placeholder: i18n.t('input.type'),
              value: farmer?.bank?.accountHolderName ?? '',
              setValue: (value: string) =>
                updateState(['bank', 'accountHolderName'], value),
            },
            {
              type: 'type',
              name: i18n.t('farmers.info.bankInformation.bankAccountNumber'),
              placeholder: i18n.t('input.type'),
              value: farmer?.bank?.accountNumber ?? '',
              setValue: (value: string) =>
                updateState(['bank', 'accountNumber'], value),
            },
            {
              type: 'type',
              name: i18n.t('farmers.info.bankInformation.bankName'),
              placeholder: i18n.t('input.type'),
              value: farmer?.bank?.bankName ?? '',
              setValue: (value: string) =>
                updateState(['bank', 'bankName'], value),
            },
          ]}
        />

        <Pressable
          onPress={saveFarmer}
          className={cn(
            'flex flex-row justify-center items-center mx-5 mt-5 mb-10 h-12 rounded-md',
            isDisabled ? 'bg-LightOrange' : 'bg-Orange'
          )}
          style={ShadowButtonStyle}
          disabled={isDisabled}
        >
          <Text className="text-White text-[18px] font-medium">
            {i18n.t('farmers.newFarmerCreation.saveFarmer')}
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </>
  );
}
