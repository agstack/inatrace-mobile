import { createContext, useEffect, useState } from 'react';
import { useStorageState } from './useStorageState';
import { User } from '@/types/user';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import axios from 'axios';
import RNFetchBlob from 'rn-fetch-blob';

import { LogInResponse, RequestParams } from '@/types/auth';
import { Farmer, ProductType, ProductTypeWithCompanyId } from '@/types/farmer';
import { CompanyInfo } from '@/types/company';
import { Country } from '@/types/country';
import { uuid } from 'expo-modules-core';
import { Plot } from '@/types/plot';
import { decode } from 'base-64';
import realm from '@/realm/useRealm';
import { FarmerSchema } from '@/realm/schemas';

import guestCountries from '@/context/guestCountries.json';
import guestProductTypes from '@/context/guestProductTypes.json';
import { useSelectedFarmerState } from '@/state/state';
import { NativeModules } from 'react-native';
import { getItemAsync } from 'expo-secure-store';
import { clearOfflineContext, currentOfflinePath, selectOfflineContext } from '@/realm/context';
import { allowSessionRequests, cancelSessionRequests, isCurrentSession, sessionGeneration } from '@/utils/sessionRequests';

const imageDirectoryJobs = new Map<string, Promise<void>>();


export const AuthContext = createContext<{
  logIn: (username: string, password: string) => Promise<LogInResponse>;
  logOut: () => Promise<void>;
  logInGuest: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  selectCompany: (company: number | string | null) => void;
  setNewPlot: (plot: Plot) => void;
  setInstance: (instance: string) => void;
  setDocumentationModal: (value: boolean) => void;
  refreshFarmers: (user: User) => Promise<void>;
  instance: string;
  makeRequest: ({ url, method, body, headers }: RequestParams) => Promise<any>;
  accessToken: string | null;
  user: User | null;
  selectedCompany: number | string | null;
  companies: (CompanyInfo | undefined)[] | string | null;
  productTypes: ProductTypeWithCompanyId[] | ProductType[] | string | null;
  countries: Country[] | string | null;
  guestAccess: boolean;
  isConnected: boolean;
  newPlot: Plot | null;
  documentationModal: boolean;
}>({
  logIn: async () => ({ success: false, errorStatus: '' }),
  logOut: async () => undefined,
  logInGuest: async () => void 0,
  checkAuth: async () => false,
  makeRequest: async () => null,
  selectCompany: () => null,
  setNewPlot: () => null,
  setInstance: () => null,
  setDocumentationModal: () => null,
  refreshFarmers: async () => void 0,
  instance: process.env.EXPO_PUBLIC_API_URI ?? '',
  accessToken: null,
  user: null,
  companies: null,
  selectedCompany: null,
  productTypes: null,
  countries: null,
  guestAccess: false,
  isConnected: false,
  newPlot: null,
  documentationModal: false,
});

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(decode(token.split('.')[1]));
    const expirationDate = new Date(payload.exp * 1000);
    const currentDate = new Date();

    return expirationDate < currentDate;
  } catch (error) {
    console.error('Error decoding token:', error);
    return false;
  }
};

export function SessionProvider(props: React.PropsWithChildren<any>) {
  const [accessToken, setAccessToken] = useStorageState<string | null>(
    'access_token',
    null
  );
  const [user, setUser] = useStorageState<User | null>('user', null);
  const [selectedCompany, setSelectedCompany] = useStorageState<
    number | string | null
  >('selected_company', null, 'asyncStorage');
  const [companies, setCompanies] = useStorageState<
    (CompanyInfo | undefined)[] | string | null
  >('companies', null, 'asyncStorage');
  const [productTypes, setProductTypes] = useStorageState<
    ProductTypeWithCompanyId[] | ProductType[] | string | null
  >('product_type', null, 'asyncStorage');
  const [countries, setCountries] = useStorageState<Country[] | string | null>(
    'countries',
    null,
    'asyncStorage'
  );

  const [instance, setStoredInstance] = useStorageState<string>(
    'instance',
    process.env.EXPO_PUBLIC_API_URI ?? ''
  );

  const { setSelectedFarmer } = useSelectedFarmerState();

  const [documentationModal, setDocumentationModal] = useState<boolean>(false);

  const [guestAccess, setGuestAccess] = useState<boolean>(false);

  const setInstance = (value: string) => {
    if (guestAccess || (accessToken && accessToken !== 'none')) return;
    void setStoredInstance(value);
  };

  useEffect(() => {
    if (instance === 'none') void setStoredInstance(process.env.EXPO_PUBLIC_API_URI ?? '');
  }, [instance]);

  useEffect(() => {
    if (!guestAccess && (productTypes === null || productTypes === 'none')) {
      setProductTypes(guestProductTypes as ProductType[]);
    }

    if (!guestAccess && (countries === null || countries === 'none')) {
      setCountries(guestCountries as Country[]);
    }
  }, [productTypes, countries]);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [newPlot, setNewPlot] = useState<Plot | null>(null);
  const renderGeneration = sessionGeneration();

  const checkAuth = async (): Promise<boolean> => {
    let account = user && typeof user === 'object' ? user : null;
    let server = instance && instance !== 'none' ? instance : '';
    if (!account) {
      const stored = await getItemAsync('user');
      if (stored) account = JSON.parse(stored);
    }
    if (!server) {
      const stored = await getItemAsync('instance');
      if (stored) server = JSON.parse(stored);
    }
    if (account?.id != null && server) {
      await selectOfflineContext(server, account.id);
      allowSessionRequests(server);
    } else if (accessToken && accessToken !== 'none') {
      return false;
    }
    if (!(await NetInfo.fetch()).isConnected) {
      return true;
    }

    if (accessToken && !isTokenExpired(accessToken)) {
      return true;
    }

    return false;
  };

  const logIn = async (
    username: string,
    password: string
  ): Promise<LogInResponse> => {
    if (!NativeModules.ServerTransport) return { success: false, errorStatus: 'GENERIC_ERROR' };
    const generation = sessionGeneration();
    try {
      allowSessionRequests(instance);
      const responseLogin = await axios.post(`${instance}/api/user/login`, {
        username,
        password,
      });

      const setCookieHeader = responseLogin.headers['set-cookie'];

      if (setCookieHeader) {
        const accessToken = setCookieHeader[0]
          .split(',')[0]
          .split(';')[0]
          .split('=')[1];

        const responseUserData = await axios.get(
          `${instance}/api/user/profile`
        );

        if (responseUserData.data.status === 'OK') {
          if (!isCurrentSession(generation)) return { success: false, errorStatus: 'GENERIC_ERROR' };
          setGuestAccess(false);
          const user = responseUserData.data.data as User;
          await selectOfflineContext(instance, user.id);
          await setUser(user);
          await setSelectedCompany(user.companyIds[0]);

          await fetchProductTypes(user);
          await fetchCountries();
          await fetchFarmers(user);

          const companyDetailsPromises = user.companyIds.map((companyId) =>
            axios.get(`${instance}/api/company/profile/${companyId}`)
          );

          const companyDetailsResponses = await Promise.all(
            companyDetailsPromises
          );

          const companyDetails = companyDetailsResponses.map(
            async (response) => {
              if (response.data.status === 'OK' && response.data.data.logo) {
                const logoFilePath = await downloadImageToFileSystem(
                  `${instance}/api/common/image/${response.data.data.logo.storageKey}/SMALL`,
                  accessToken,
                  currentOfflinePath()
                );

                const companyInfo = {
                  id: response.data.data.id,
                  name: response.data.data.name,
                  logo: logoFilePath,
                } as CompanyInfo;
                return companyInfo;
              } else if (response.data.status === 'OK') {
                const companyInfo = {
                  id: response.data.data.id,
                  name: response.data.data.name,
                  logo: null,
                } as CompanyInfo;
                return companyInfo;
              }
            }
          );
          const companyDetailsResp = await Promise.all(companyDetails);

          if (!isCurrentSession(generation)) return { success: false, errorStatus: 'GENERIC_ERROR' };
          await setCompanies(companyDetailsResp);
          await setAccessToken(accessToken);

          return { success: true, errorStatus: '' };
        }
        throw new Error('Invalid user profile');
      }
      throw new Error('Missing authentication cookie');
    } catch (error: any) {
      if (isCurrentSession(generation)) {
        try {
          await cancelSessionRequests();
          await NativeModules.ServerTransport.clearCookies();
          await setAccessToken(null);
          await setUser(null);
          await setSelectedCompany(null);
          await setCompanies(null);
          clearOfflineContext();
        } catch (_) {
          // Keep requests blocked if session cleanup fails.
        }
      }
      if (error?.response?.data?.status === 'AUTH_ERROR') {
        return { success: false, errorStatus: 'AUTH_ERROR' };
      } else {
        return { success: false, errorStatus: 'GENERIC_ERROR' };
      }
    }

    return { success: false, errorStatus: 'GENERIC_ERROR' };
  };

  const logOut = async () => {
    if (!NativeModules.ServerTransport) throw new Error('Server transport is unavailable');
    await cancelSessionRequests();
    await NativeModules.ServerTransport.clearCookies();
    await setAccessToken(null);
    await setUser(null);
    await setSelectedCompany(null);
    await setCompanies(null);
    await setProductTypes(null);
    await setCountries(null);
    setSelectedFarmer(null);
    setNewPlot(null);
    setGuestAccess(false);

    clearOfflineContext();
  };

  const logInGuest = async () => {
    allowSessionRequests(instance);
    await selectOfflineContext(instance, 0);
    setGuestAccess(true);
    await setUser(null);
    await setSelectedCompany(null);
    await setCompanies(null);
    setSelectedFarmer(null);
    await setCountries(guestCountries as Country[]);
    await setProductTypes(guestProductTypes as any);

    const defaultFarmer = (await realm.realmRead(
      FarmerSchema,
      undefined,
      undefined,
      undefined,
      undefined,
      'id == "0"'
    )) as any;

    if (defaultFarmer.length === 0) {
      const farmerBody = {
        id: 0,
        companyId: 0,
        farmerCompanyInternalId: '0',
        type: 'FARMER',
        name: 'Guest',
        surname: 'Farmer',
        phone: '',
        email: '',
        hasSmartphone: false,
        gender: 'N_A',
        location: {
          address: {
            cell: '',
            sector: '',
            village: '',
            address: 'Address 123',
            city: 'City',
            state: 'State',
            zip: '1000',
            hondurasFarm: '',
            hondurasVillage: '',
            hondurasMunicipality: '',
            hondurasDepartment: '',
            country: {
              id: 83,
              code: 'DE',
              name: 'Germany',
            },
            otherAddress: '',
          },
        },
        bank: {
          accountHolderName: '',
          accountNumber: '',
          bankName: '',
          additionalInformation: '',
        },
        farm: {
          areaUnit: 'ha',
          totalCultivatedArea: 10,
          farmPlantInformationList: [],
          organic: false,
          areaOrganicCertified: 0,
          startTransitionToOrganic: '',
        },
        associations: [],
        cooperatives: [],
        certifications: [],
        productTypes: [],
        plots: [],
      };

      const farmerRealm = {
        id: '0',
        userId: '0',
        companyId: '0',
        data: JSON.stringify(farmerBody),
        name: 'Guest',
        surname: 'Farmer',
        synced: false,
      };

      await realm.realmWrite(FarmerSchema, farmerRealm);

      setSelectedFarmer(farmerBody);
    } else {
      setSelectedFarmer(JSON.parse(defaultFarmer[0].data));
    }
  };

  const makeRequest = async ({ url, method, body, headers }: RequestParams) => {
    if (!isCurrentSession(renderGeneration)) throw new Error('Session changed');
    if (isTokenExpired(accessToken ?? '')) {
      await logOut();
      return;
    }

    const generation = renderGeneration;
    const response = await axios.request({
      url: instance + url,
      method,
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
      data: body,
    });
    if (!isCurrentSession(generation)) throw new Error('Session changed');
    return response;
  };

  const fetchProductTypes = async (user: User) => {
    const generation = sessionGeneration();
    const productTypesPromises = user.companyIds.map((companyId) =>
      axios
        .get(
          `${instance}/api/company/${companyId}/product-types?limit=1000&offset=0`
        )
        .then((response) => ({ response, companyId }))
    );

    const productTypesResponses = await Promise.all(productTypesPromises);

    const productTypes = productTypesResponses.map(
      async ({ response, companyId }) => {
        if (response.data.status === 'OK') {
          return { companyId, productTypes: response.data.data.items };
        }
      }
    );

    const productTypesResp = await Promise.all(productTypes);

    if (isCurrentSession(generation)) await setProductTypes(productTypesResp as any);
  };

  const fetchCountries = async () => {
    const generation = sessionGeneration();
    const countriesResponse = await axios.get(
      `${instance}/api/common/countries?requestType=FETCH&limit=500&sort=ASC`
    );
    const countriesResp = countriesResponse.data.data.items as Country[];
    if (isCurrentSession(generation)) await setCountries(countriesResp);
  };

  const fetchFarmers = async (user: User) => {
    const generation = sessionGeneration();
    const path = currentOfflinePath();
    await realm.realmDeleteAll(FarmerSchema, 'synced == true');
    const farmersPromises = user.companyIds.map((companyId) =>
      axios
        .get(
          `${instance}/api/company/userCustomers/${companyId}/FARMER?limit=5000`
        )
        .then((response) => ({ response, companyId }))
    );
    const farmersResponses = await Promise.all(farmersPromises);

    const farmers = farmersResponses.map(async ({ response, companyId }) => {
      if (response.data.status === 'OK') {
        return {
          companyId,
          farmers: response.data.data.items as Farmer[],
        };
      }
    });

    const farmersResp = await Promise.all(farmers);
    const farmersRealm: any = [];

    farmersResp.forEach((company) => {
      company?.farmers?.forEach((farmer) => {
        const farmerRealm = {
          id: farmer.id ? farmer.id.toString() : '',
          userId: user.id ? user.id.toString() : '',
          companyId: company?.companyId ? company?.companyId.toString() : '',
          data: JSON.stringify(farmer),
          name: farmer.name ? farmer.name : '',
          surname: farmer.surname ? farmer.surname : '',
          synced: true,
        };

        farmersRealm.push(farmerRealm);
      });
    });

    if (isCurrentSession(generation) && currentOfflinePath() === path) {
      await realm.realmWriteMultiple(FarmerSchema, farmersRealm);
    }
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state?.isConnected ?? false);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        logIn,
        logOut,
        logInGuest,
        guestAccess,
        checkAuth,
        selectCompany: setSelectedCompany,
        makeRequest,
        accessToken,
        user,
        selectedCompany,
        companies,
        productTypes,
        countries,
        isConnected,
        newPlot,
        setNewPlot,
        instance,
        setInstance,
        setDocumentationModal,
        documentationModal,
        refreshFarmers: fetchFarmers,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}

const downloadImageToFileSystem = async (url: string, accessToken: string, contextPath: string) => {
  try {
    const { config, fs } = RNFetchBlob;
    const imageCacheDir = `${fs.dirs.CacheDir}/inatrace_images_${contextPath}`;
    let job = imageDirectoryJobs.get(imageCacheDir);
    if (!job) {
      job = (async () => { if (!await fs.exists(imageCacheDir)) await fs.mkdir(imageCacheDir); })();
      imageDirectoryJobs.set(imageCacheDir, job);
      job.finally(() => imageDirectoryJobs.delete(imageCacheDir)).catch(() => undefined);
    }
    await job;

    const options = {
      path: `${imageCacheDir}/${uuid.v4()}.png`,
      HTTPHeader: {
        Cookie: accessToken,
      },
    };

    const res = await config(options).fetch('GET', url);
    const filePath = res.path();
    return 'file://' + filePath;
  } catch (error) {
    console.error('Error downloading and saving image:', error);
    return null;
  }
};
