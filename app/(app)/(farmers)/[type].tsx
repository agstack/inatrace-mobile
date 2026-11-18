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
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '@/context/AuthContext';
import Card, { CardProps, ItemProps } from '@/components/common/Card';
import { Farmer } from '@/types/farmer';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import NewFarmerButton, {
  ButtonWrapper,
} from '@/components/farmers/NewFarmerButton';
import { useLocalSearchParams, useSegments } from 'expo-router';
import { emptyComponent } from '@/components/common/FlashListComponents';
import {
  farmersListBannerKey,
  farmersListMessageKey,
  resolveFarmersListState,
  type FarmerEntry,
} from '@/utils/farmersList';
import { loadFarmersPage, type FarmerPageArgs } from '@/utils/farmersLoader';
import { canReachNetwork } from '@/utils/network';
import FarmersListBanner from '@/components/farmers/FarmersListBanner';
import { farmerDisplayName, farmerGender, farmerVillageAndCell } from '@/utils/farmerCard';
import {
  readLastFarmerCacheRefresh,
  shouldRefreshFarmerCache,
  writeLastFarmerCacheRefresh,
} from '@/utils/farmerCache';
import realm from '@/realm/useRealm';
import { FarmerSchema } from '@/realm/schemas';

export default function Farmers() {
  const { type } = useLocalSearchParams();
  const [search, setSearch] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('BY_NAME_ASC');
  const [selectedFilter, setSelectedFilter] = useState<string>('BY_NAME');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);
  const [entries, setEntries] = useState<FarmerEntry[]>([]);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [cacheMode, setCacheMode] = useState<boolean>(false);
  const entriesRef = useRef<FarmerEntry[]>([]);
  const requestId = useRef(0);
  const wasOffline = useRef(false);
  const [preventOnEndReached, setPreventOnEndReached] =
    useState<boolean>(false);

  const [offset, setOffset] = useState<number>(0);
  const limit = 10;

  const {
    networkState,
    makeRequest,
    selectedCompany,
    user,
    guestAccess,
    refreshFarmers,
  } = useContext(AuthContext);

  const segments = useSegments();
  const segmentsKey = segments.join('/');
  const inDetailView = segmentsKey
    .split('/')
    .some((segment) => segment === 'info' || segment === 'view');

  const updateEntries = (next: FarmerEntry[]) => {
    entriesRef.current = next;
    setEntries(next);
  };

  const toCard = useCallback(
    (entry: FarmerEntry): CardProps => {
      const farmer = entry.data;

      return {
        title: farmerDisplayName(farmer),
        synced: entry.synced,
        items: [
          {
            type: 'view',
            name: i18n.t('farmers.card.villageAndCell'),
            value: farmerVillageAndCell(farmer),
          },
          {
            type: 'view',
            name: i18n.t('farmers.card.gender'),
            value: farmerGender(farmer),
          },
        ] as ItemProps[],
        navigationPath: type === 'farmers' ? `info/${farmer.id}` : 'view/new',
        navigationParams: {
          type: 'farmer',
          data: farmer,
        },
      };
    },
    [type]
  );

  const data = useMemo(() => entries.map(toCard), [entries, toCard]);

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
    if (inDetailView) {
      setOffset(0);
      return;
    }
    // Wait for the stored session to hydrate: a query with an undefined
    // `userId` returns nothing and used to leave the list empty until a
    // manual refresh.
    if (!guestAccess && !user) return;

    setIsLoading(true);
    void handleFarmers(limit, 0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedSort,
    selectedFilter,
    search,
    selectedCompany,
    segmentsKey,
    user?.id,
    guestAccess,
  ]);

  useEffect(() => {
    if (offset > 0 && !isLoading) {
      void handleFarmers(limit, offset, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  // When the network comes back, replace the cached rows without waiting for
  // a manual refresh. `wasOffline` keeps a state change while already online
  // from reloading the list again.
  useEffect(() => {
    if (networkState === 'offline') {
      wasOffline.current = true;
      return;
    }
    if (networkState !== 'online' || !wasOffline.current) return;
    wasOffline.current = false;
    if (inDetailView || (!guestAccess && !user)) return;

    void handleFarmers(limit, 0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkState]);

  // The cache is only filled after login and on a manual refresh, so a device
  // that stays signed in keeps a stale list. Refresh it when the list opens,
  // but not on every navigation and never while offline.
  useEffect(() => {
    if (!user || guestAccess) return;

    const run = async () => {
      const cachedCount = await countCachedFarmers();
      const refresh = shouldRefreshFarmerCache({
        online: networkState === 'online',
        cachedCount,
        lastRefreshAt: await readLastFarmerCacheRefresh(),
      });
      if (!refresh) return;

      await writeLastFarmerCacheRefresh(Date.now());
      await refreshFarmers(user).catch(async () => {
        // A failed refresh keeps the cache the screen already shows.
        await writeLastFarmerCacheRefresh(null);
      });
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkState, selectedCompany, user?.id, guestAccess]);

  const buildArgs = (limitHF: number, offsetHF: number): FarmerPageArgs => ({
    limit: limitHF,
    offset: offsetHF,
    sort: selectedSort.split('_'),
    search,
    searchBy: selectedFilter,
    companyId: String(guestAccess ? 0 : selectedCompany ?? ''),
    userId: String(guestAccess ? 0 : user?.id ?? ''),
  });

  const readCache = async (args: FarmerPageArgs): Promise<FarmerEntry[]> => {
    const searchString = `companyId == '${args.companyId}' AND userId == '${args.userId}' AND (${args.searchBy === 'BY_NAME' ? 'name' : 'surname'} CONTAINS[c] '${args.search}')`;

    const rows = await realm.realmRead(
      FarmerSchema,
      args.limit,
      args.offset,
      args.sort[1].toLowerCase(),
      args.sort[2] as 'ASC' | 'DESC',
      searchString
    );

    return rows.map((row: any) => ({
      data: JSON.parse(row.data) as Farmer,
      synced: row.synced,
    }));
  };

  const fetchApi = async (args: FarmerPageArgs) => {
    const response = await makeRequest({
      url: `/api/company/userCustomers/${args.companyId}/FARMER?limit=${args.limit}&offset=${args.offset}&sortBy=${args.sort[0]}_${args.sort[1]}&sort=${args.sort[2]}&query=${args.search}&searchBy=${args.searchBy}`,
      method: 'GET',
      // Without a timeout an unreachable server keeps the request open for
      // minutes and the cache warning never appears.
      timeout: 15000,
    });

    if (response?.data?.status !== 'OK') {
      throw new Error('Farmer request failed');
    }

    const items = (response.data.data.items ?? []) as Farmer[];
    return {
      entries: items.map((farmer) => ({ data: farmer, synced: true })),
    };
  };

  const handleFarmers = async (
    limitHF: number,
    offsetHF: number,
    resetData: boolean
  ) => {
    const generation = ++requestId.current;
    // A reset always tries the API when the network allows it, so pull-to-refresh
    // and "Try again" recover from the cache fallback. Pagination stays on the
    // cache after a failure, so a page does not mix both sources.
    const online =
      canReachNetwork(networkState) &&
      !guestAccess &&
      (!cacheMode || resetData);

    setIsLoading(true);

    const page = await loadFarmersPage(
      { online, readCache, fetchApi },
      buildArgs(limitHF, offsetHF),
      {
        reset: resetData,
        onCache: (cached) => {
          if (generation !== requestId.current) return;
          // Show the saved rows while the request is still in flight, but
          // never replace rows the user is already reading.
          if (entriesRef.current.length === 0 && cached.length > 0) {
            setFromCache(true);
            updateEntries(cached);
          }
        },
      }
    ).catch(() => ({
      entries: [] as FarmerEntry[],
      fromCache: false,
      failed: true,
    }));

    if (generation !== requestId.current) return;

    const hadEntries = entriesRef.current.length > 0;
    // A failed refresh keeps the rows already on screen: replacing them with
    // the cache would hide the API page the user is reading.
    const keepPrevious = resetData && page.failed && hadEntries;

    setFailed(page.failed);

    if (!keepPrevious) {
      setFromCache(page.fromCache);
      updateEntries(
        resetData ? page.entries : [...entriesRef.current, ...page.entries]
      );
    }

    if (resetData && !page.failed) {
      setCacheMode(!canReachNetwork(networkState));
      setOffset(0);
    } else if (resetData && !keepPrevious && page.entries.length > 0) {
      setCacheMode(true);
    }

    setPreventOnEndReached(true);
    setIsRefreshing(false);
    setIsLoading(false);
  };

  // Counts what the list would show offline, using the same filter as the read
  // below so the two never disagree.
  const countCachedFarmers = async (): Promise<number> => {
    try {
      const rows = await realm.realmRead(
        FarmerSchema,
        undefined,
        undefined,
        undefined,
        'ASC',
        `companyId == '${guestAccess ? '0' : selectedCompany}' AND userId == '${guestAccess ? '0' : user?.id}'`
      );
      return rows.length;
    } catch {
      return 0;
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setOffset(0);
    void handleFarmers(limit, 0, true);
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

  const listState = resolveFarmersListState({
    loading: isLoading,
    failed,
    offline: networkState === 'offline',
    itemCount: entries.length,
    fromCache,
  });

  const bannerKey = farmersListBannerKey({
    itemCount: entries.length,
    offline: networkState === 'offline',
    failed,
    fromCache,
  });

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
          keyExtractor={(item, index) =>
            String(item.navigationParams?.data?.id ?? item.id ?? `row-${index}`)
          }
          style={{ flex: 1 }}
          ListHeaderComponent={
            bannerKey ? (
              <FarmersListBanner
                messageKey={bannerKey}
                onRetry={
                  bannerKey === 'farmers.staleCached' ? onRefresh : undefined
                }
              />
            ) : undefined
          }
          ListEmptyComponent={emptyComponent(
            i18n.t(farmersListMessageKey(listState) ?? 'farmers.noData')
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
