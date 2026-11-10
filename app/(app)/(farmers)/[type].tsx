import Topbar from '@/components/common/Topbar';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  RefreshControl,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n from '@/locales/i18n';
import SearchInput from '@/components/common/SearchInput';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/context/AuthContext';
import Card, { CardProps, ItemProps } from '@/components/common/Card';
import { Farmer } from '@/types/farmer';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import NewFarmerButton, {
  ButtonWrapper,
} from '@/components/farmers/NewFarmerButton';
import { useLocalSearchParams, useSegments } from 'expo-router';
import { emptyComponent } from '@/components/common/FlashListComponents';
import realm from '@/realm/useRealm';
import { FarmerSchema } from '@/realm/schemas';

export default function Farmers() {
  const { type } = useLocalSearchParams();
  const [search, setSearch] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('BY_NAME_ASC');
  const [selectedFilter, setSelectedFilter] = useState<string>('BY_NAME');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [data, setData] = useState<CardProps[]>([]);
  const [dataCount, setDataCount] = useState<number>(100);
  const [preventOnEndReached, setPreventOnEndReached] =
    useState<boolean>(false);

  const [offset, setOffset] = useState<number>(0);
  const limit = 10;

  const { isConnected, makeRequest, selectedCompany, user, guestAccess } =
    useContext(AuthContext);

  const segments = useSegments();

  const sortItems = [
    {
      label: i18n.t('farmers.sort.name'),
      value: 'BY_NAME_ASC',
      icon: ChevronUp,
    },
    {
      label: i18n.t('farmers.sort.name'),
      value: 'BY_NAME_DESC',
      icon: ChevronDown,
    },
    {
      label: i18n.t('farmers.sort.surname'),
      value: 'BY_SURNAME_ASC',
      icon: ChevronUp,
    },
    {
      label: i18n.t('farmers.sort.surname'),
      value: 'BY_SURNAME_DESC',
      icon: ChevronDown,
    },
    { label: i18n.t('farmers.sort.id'), value: 'BY_ID_ASC', icon: ChevronUp },
    {
      label: i18n.t('farmers.sort.id'),
      value: 'BY_ID_DESC',
      icon: ChevronDown,
    },
  ];

  const filterItems = [
    { label: i18n.t('farmers.filter.name'), value: 'BY_NAME' },
    { label: i18n.t('farmers.filter.surname'), value: 'BY_SURNAME' },
  ];

  useEffect(() => {
    if (
      segments.find((segment) => segment === 'info' || segment === 'view') ===
      undefined
    ) {
      handleFarmers(limit, offset, true);
    } else {
      setOffset(0);
    }
  }, [selectedSort, selectedFilter, search, selectedCompany, segments]);

  useEffect(() => {
    if (!isLoading) {
      handleFarmers(limit, offset, false);
    }
  }, [offset]);

  const handleFarmers = async (
    limitHF: number,
    offsetHF: number,
    resetData: boolean
  ) => {
    if (isConnected && !guestAccess) {
      await fetchFarmers(limitHF, offsetHF, resetData);
    } else {
      await loadFarmers(limitHF, offsetHF, resetData);
    }
  };

  const fetchFarmers = async (
    limit: number,
    offset: number,
    resetData: boolean
  ) => {
    setIsLoading(true);

    try {
      const sort = selectedSort.split('_');
      const sortBy = sort[0] + '_' + sort[1];
      const sortType = sort[2];

      const response = await makeRequest({
        url: `/api/company/userCustomers/${selectedCompany}/FARMER?limit=${limit}&offset=${offset}&sortBy=${sortBy}&sort=${sortType}&query=${search}&searchBy=${selectedFilter}`,
        method: 'GET',
      });

      if (response.data.status === 'OK') {
        const farmers = response.data.data.items.map((farmer: Farmer) => {
          return {
            title: `${farmer.name ?? ''} ${farmer.surname ?? ''}`,
            items: [
              {
                type: 'view',
                name: i18n.t('farmers.card.villageAndCell'),
                value: `${farmer.location.address.village ? farmer.location.address.village : '/'}, ${farmer.location.address.cell ? farmer.location.address.cell : '/'}`,
              },
              {
                type: 'view',
                name: i18n.t('farmers.card.gender'),
                value: farmer.gender,
              },
            ] as ItemProps[],
            navigationPath:
              type === 'farmers' ? `info/${farmer.id}` : `view/new`,
            navigationParams: {
              type: 'farmer',
              data: farmer,
            },
          } as CardProps;
        });

        const searchString = `companyId == '${selectedCompany}' AND userId == '${user?.id}' AND (${selectedFilter === 'BY_NAME' ? 'name' : 'surname'} CONTAINS[c] '${search}') AND synced == false`;

        const farmersRealm = await realm.realmRead(
          FarmerSchema,
          limit,
          offset,
          sort[1].toLowerCase(),
          sort[2] as 'ASC' | 'DESC',
          searchString
        );
        const farmersRealmData = farmersRealm.map((farmer: any) => ({
          data: JSON.parse(farmer.data) as Farmer,
          synced: farmer.synced,
        }));

        const offlineData = farmersRealmData.map(
          (farmer: { data: Farmer; synced: boolean }) => {
            return {
              title: `${farmer.data.name ?? ''} ${farmer.data.surname ?? ''}`,
              synced: farmer.synced,
              items: [
                {
                  type: 'view',
                  name: i18n.t('farmers.card.villageAndCell'),
                  value: `${farmer.data.location.address.village}, ${farmer.data.location.address.cell}`,
                },
                {
                  type: 'view',
                  name: i18n.t('farmers.card.gender'),
                  value: farmer.data.gender,
                },
              ] as ItemProps[],
              navigationPath:
                type === 'farmers' ? `info/${farmer.data.id}` : `view/new`,
              navigationParams: {
                type: 'farmer',
                data: farmer.data,
              },
            } as CardProps;
          }
        );

        setDataCount(
          response.data.data.count === 0 || offlineData.length === 0
            ? 1
            : response.data.data.count + offlineData.length
        );

        if (resetData) {
          setData([...offlineData, ...farmers]);
          setOffset(0);
        } else {
          setData([...data, ...offlineData, ...farmers]);
        }
      }
    } catch (error) {
      setError(i18n.t('farmers.errorFetch'));
    } finally {
      setPreventOnEndReached(true);
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  const loadFarmers = async (
    limit: number,
    offset: number,
    resetData: boolean
  ) => {
    setIsLoading(true);
    try {
      const sort = selectedSort.split('_');
      const searchString = `companyId == '${guestAccess ? '0' : selectedCompany}' AND userId == '${guestAccess ? '0' : user?.id}' AND (${selectedFilter === 'BY_NAME' ? 'name' : 'surname'} CONTAINS[c] '${search}')`;

      const farmersRealm = await realm.realmRead(
        FarmerSchema,
        limit,
        offset,
        sort[1].toLowerCase(),
        sort[2] as 'ASC' | 'DESC',
        searchString
      );
      const farmersRealmData = farmersRealm.map((farmer: any) => ({
        data: JSON.parse(farmer.data) as Farmer,
        synced: farmer.synced,
      }));

      const offlineData = farmersRealmData.map(
        (farmer: { data: Farmer; synced: boolean }) => {
          return {
            title: `${farmer.data.name ?? ''} ${farmer.data.surname ?? ''}`,
            synced: farmer.synced,
            items: [
              {
                type: 'view',
                name: i18n.t('farmers.card.villageAndCell'),
                value: `${farmer.data.location.address.village}, ${farmer.data.location.address.cell}`,
              },
              {
                type: 'view',
                name: i18n.t('farmers.card.gender'),
                value: farmer.data.gender,
              },
            ] as ItemProps[],
            navigationPath:
              type === 'farmers' ? `info/${farmer.data.id}` : `view/new`,
            navigationParams: {
              type: 'farmer',
              data: farmer.data,
            },
          } as CardProps;
        }
      );

      setDataCount(offlineData.length === 0 ? 1 : offlineData.length);

      if (resetData) {
        setData(offlineData);
        setOffset(0);
      } else {
        setData([...data, ...offlineData]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setPreventOnEndReached(true);
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setOffset(0);
    handleFarmers(10, 0, true);
  };

  const onEndReached = () => {
    if (!isLoading && !preventOnEndReached) {
      setOffset((prevOffset) => prevOffset + 10);
    }
  };

  const renderFooter = () => {
    if (!isLoading) return null;
    return <ActivityIndicator style={{ margin: 20 }} />;
  };

  return (
    <SafeAreaView
      edges={['top']}
      className="flex flex-col h-full bg-Background"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="mb-3">
          <Topbar
            title={
              type === 'farmers'
                ? i18n.t('farmers.title')
                : i18n.t('farmers.titleNewPlot')
            }
            goBack
          />
          <SearchInput
            input={search}
            setInput={setSearch}
            selectedSort={selectedSort}
            setSelectedSort={setSelectedSort}
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
            sortItems={sortItems}
            filterItems={filterItems}
          />
        </View>
      </TouchableWithoutFeedback>

      <View style={{ flex: 1 }}>
        <FlatList
          data={data}
          renderItem={({ item }) => <Card {...item} />}
          keyExtractor={(_, index) => index.toString()}
          style={{ flex: 1 }}
          ListEmptyComponent={emptyComponent(
            isLoading ? i18n.t('loading') : i18n.t('farmers.noData')
          )}
          ListFooterComponent={renderFooter}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{
            paddingBottom: Platform.OS === 'ios' ? 50 : 100,
          }}
          onMomentumScrollBegin={() => setPreventOnEndReached(false)}
        />
      </View>
      {type === 'farmers' && (
        <ButtonWrapper>
          <NewFarmerButton />
        </ButtonWrapper>
      )}
    </SafeAreaView>
  );
}
