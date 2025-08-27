import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import ViewSwitcher, { ViewSwitcherProps } from './ViewSwitcher';
import Mapbox from '@rnmapbox/maps';
import { useContext, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import {
  LocateFixed,
  MapPin,
  MapPinned,
  Navigation,
  Plus,
  Redo2,
  Undo2,
} from 'lucide-react-native';
import i18n from '@/locales/i18n';
import { Position } from '@rnmapbox/maps/lib/typescript/src/types/Position';
import Colors from '@/constants/Colors';
import MarkerSvg from '../svg/MarkerSvg';
import { CameraRef } from '@rnmapbox/maps/lib/typescript/src/components/Camera';
import cn from '@/utils/cn';
import { router, useNavigation, useSegments } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { uuid } from 'expo-modules-core';
import { FeatureInfo, Plot } from '@/types/plot';
import realm from '@/realm/useRealm';
import { PlotSchema } from '@/realm/schemas';
import { ProductTypeWithCompanyId } from '@/types/farmer';
import { User } from '@/types/user';
import Card, { CardProps } from '../common/Card';
import * as turf from '@turf/turf';
import MarkerPlotSvg from '../svg/MarkerPlotSvg';
import { useSelectedFarmerState } from '@/state/state';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

export default function MapView({
  viewType,
  setViewType,
  type,
  seePlot,
  setSeePlot,
}: ViewSwitcherProps) {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [addingNewPlot, setAddingNewPlot] = useState<boolean>(false);
  const [locationsForFeature, setLocationsForFeature] = useState<Position[]>(
    []
  );
  const [locationsForFeatureCache, setLocationsForFeatureCache] = useState<
    Position[]
  >([]);
  const [featureCollection, setFeatureCollection] =
    useState<GeoJSON.FeatureCollection>({
      type: 'FeatureCollection',
      features: [],
    });
  const [centroidCollection, setCentroidCollection] =
    useState<GeoJSON.FeatureCollection | null>(null);

  const cameraRef = useRef<CameraRef>(null);
  const {
    newPlot,
    setNewPlot,
    user,
    selectedCompany,
    productTypes,
    guestAccess,
  } = useContext(AuthContext) as {
    newPlot: Plot | null;
    selectedCompany: number;
    setNewPlot: (plot: Plot) => void;
    user: User;
    productTypes: ProductTypeWithCompanyId[];
    guestAccess: boolean;
  };

  const { selectedFarmer } = useSelectedFarmerState();

  const [isMapLoading, setIsMapLoading] = useState<boolean>(true);
  const [cardInfoCollection, setCardInfoCollection] = useState<any[]>([]);
  const [cardInfo, setCardInfo] = useState<CardProps | null>(null);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [draggableMarkerCoordinate, setDraggableMarkerCoordinate] =
    useState<Position | null>(null);

  const navigation = useNavigation();

  const segments = useSegments();

  useEffect(() => {
    if (type === 'new') {
      setAddingNewPlot(true);
    } else if (
      seePlot &&
      !addingNewPlot &&
      centroidCollection?.features &&
      centroidCollection?.features?.length > 0 &&
      !isMapLoading
    ) {
      const centroid = centroidCollection.features.find(
        (c: any) => c.properties.id.toString() === seePlot
      ) as any;
      if (centroid) {
        focusOnLocation(
          centroid.geometry.coordinates[1],
          centroid.geometry.coordinates[0]
        );
        handleSettingCardInfo(seePlot);
      }
    }
  }, [type, seePlot, centroidCollection, isMapLoading]);

  useEffect(() => {
    navigation.setOptions({
      title: addingNewPlot
        ? i18n.t('plots.addPlot.newPlot')
        : i18n.t('plots.title'),
      gestureEnabled: !addingNewPlot,
    });

    const handleBeforeRemove = (e: any) => {
      e.preventDefault();
      if (
        (segments as string[]).includes('add-plot') ||
        (locationsForFeature.length === 0 &&
          locationsForFeatureCache.length === 0)
      ) {
        setAddingNewPlot(false);
        navigation.dispatch(e.data.action);
        return;
      }
      Alert.alert(
        i18n.t('plots.addPlot.discardChangesTitle'),
        i18n.t('plots.addPlot.discardChangesMessage'),
        [
          {
            text: i18n.t('plots.addPlot.cancel'),
            style: 'cancel',
          },
          {
            text: i18n.t('plots.addPlot.discardChangesButton'),
            onPress: () => {
              setAddingNewPlot(false);
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    };

    if (addingNewPlot) {
      navigation.addListener('beforeRemove', handleBeforeRemove);
    } else {
      navigation.removeListener('beforeRemove', handleBeforeRemove);
    }

    return () => {
      navigation.removeListener('beforeRemove', handleBeforeRemove);
    };
  }, [addingNewPlot, segments, locationsForFeature]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      let locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 1 },
        (newLocation) => {
          setLocation(newLocation);
        }
      );

      return () => {
        if (locationSubscription) {
          locationSubscription.remove();
        }
      };
    })();
  }, []);

  useEffect(() => {
    if (selectedFarmer) {
      loadExistingPlots();
    }
  }, [selectedFarmer]);

  useEffect(() => {
    if (manualMode && location) {
      setDraggableMarkerCoordinate([
        location.coords.longitude,
        location.coords.latitude,
      ]);
    } else {
      setDraggableMarkerCoordinate(null);
    }
  }, [manualMode, location]);

  const handleDragEnd = (e: any) => {
    const { geometry } = e;
    setDraggableMarkerCoordinate([
      geometry.coordinates[0],
      geometry.coordinates[1],
    ]);
  };

  const loadExistingPlots = async () => {
    try {
      if ((segments as string[]).includes('add-plot')) {
        return;
      }

      const offlinePlots = await realm.realmRead(
        PlotSchema,
        undefined,
        undefined,
        undefined,
        undefined,
        `farmerId == '${selectedFarmer?.id}' AND userId == '${guestAccess ? '0' : user.id}'`
      );

      let features: GeoJSON.Feature[] = [];
      let cardInfos = [];

      if (offlinePlots && offlinePlots.length !== 0) {
        for (let plot of offlinePlots) {
          const plotData = JSON.parse(plot.data as any) as Plot;

          const products = productTypes?.find(
            (product: ProductTypeWithCompanyId) => {
              return product.companyId === selectedCompany;
            }
          );
          const crop = products?.productTypes.find(
            (product) => product.id.toString() === plotData.crop
          );

          features.push(plotData.featureInfo);
          cardInfos.push({
            id: plotData.featureInfo.id,
            plotName: plotData.plotName,
            crop: crop,
            numberOfPlants: plotData.numberOfPlants,
            size: plotData.size,
            geoId: plotData.geoId,
            certification: plotData.certification,
            organicStartOfTransition: plotData.organicStartOfTransition,
            synced: false,
          });
        }
      }

      if (selectedFarmer?.plots && selectedFarmer.plots.length > 0) {
        for (let plot of selectedFarmer.plots as any) {
          if (!plot.coordinates || plot.coordinates.length === 0) {
            continue;
          }

          const featureInfo = {
            type: 'Feature',
            properties: {},
            id: plot.id,
            geometry: {
              type: 'Polygon',
              coordinates: [
                plot?.coordinates.map((c: any) => [c.longitude, c.latitude]),
              ],
            },
          };

          features.push(featureInfo as any);
          cardInfos.push({
            id: plot.id,
            plotName: plot.plotName,
            crop: plot.crop,
            numberOfPlants: plot.numberOfPlants,
            size: plot.size + ' ' + plot.unit,
            geoId: plot.geoId,
            certification: plot.certification,
            organicStartOfTransition: plot.organicStartOfTransition,
            synced: true,
          });
        }
      }

      const centroids = features.map((feature) => {
        const centroid = turf.centroid(feature as any);
        centroid.properties = { id: feature.id };
        return centroid;
      });

      setCardInfoCollection(cardInfos);

      setFeatureCollection({
        type: 'FeatureCollection',
        features,
      });

      setCentroidCollection({
        type: 'FeatureCollection',
        features: centroids,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const addLocationToLocations = async () => {
    if (location) {
      if (!location?.coords?.accuracy || location?.coords?.accuracy > 10) {
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setLocationsForFeatureCache([]);
      setLocationsForFeature([
        ...locationsForFeature,
        [location.coords.longitude, location.coords.latitude],
      ]);
    }
  };

  const addManualLocation = async () => {
    if (draggableMarkerCoordinate) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setLocationsForFeatureCache([]);
      setLocationsForFeature([
        ...locationsForFeature,
        [draggableMarkerCoordinate[0], draggableMarkerCoordinate[1]],
      ]);

      setManualMode(false);
    }
  };

  useEffect(() => {
    if (locationsForFeature.length > 0) {
      addPointToFeature();
    }
  }, [locationsForFeature, segments]);

  const addPointToFeature = () => {
    if (locationsForFeature.length < 3) {
      const filteredFeatures = featureCollection.features.filter(
        (f: GeoJSON.Feature) =>
          f.id !== 'NewFeature' && f.id !== newPlot?.featureInfo.id
      ) as GeoJSON.Feature[];

      setFeatureCollection({
        type: 'FeatureCollection',
        features: filteredFeatures,
      });
      return;
    }

    let feature = featureCollection.features.find((f: GeoJSON.Feature) => {
      return f.id === 'NewFeature';
    }) as GeoJSON.Feature;

    if (!feature) {
      feature = {
        type: 'Feature',
        properties: {},
        id: 'NewFeature',
        geometry: {
          type: 'Polygon',
          coordinates: [[...locationsForFeature, locationsForFeature[0]]],
        },
      };

      setFeatureCollection({
        type: 'FeatureCollection',
        features: [...featureCollection.features, feature],
      });
      return;
    }

    (feature.geometry as GeoJSON.Polygon).coordinates = [
      [...locationsForFeature, locationsForFeature[0]],
    ];

    const filteredFeatures = featureCollection.features.filter(
      (f: GeoJSON.Feature) =>
        f.id !== 'NewFeature' && f.id !== newPlot?.featureInfo.id
    ) as GeoJSON.Feature[];

    setFeatureCollection({
      type: 'FeatureCollection',
      features: [...filteredFeatures, feature],
    });
  };

  const savePlotShape = async () => {
    if (locationsForFeature.length < 3) {
      Alert.alert(
        i18n.t('plots.addPlot.notEnoughPointsTitle'),
        i18n.t('plots.addPlot.notEnoughPointsMessage')
      );
      return;
    }

    let featureInfo = featureCollection.features.find(
      (f: GeoJSON.Feature) => f.id === 'NewFeature'
    ) as FeatureInfo;

    if (!featureInfo || featureInfo.id !== 'NewFeature') {
      return;
    }

    const id = uuid.v4();

    featureInfo.id = id;

    setNewPlot({
      id,
      plotName: '',
      crop: '',
      numberOfPlants: 0,
      size: (turf.area(featureInfo.geometry) / 10000).toFixed(2) + ' ha',
      geoId: '',
      certification: '',
      organicStartOfTransition: '',
      featureInfo,
    });

    router.push('/(app)/(farmers)/view/add-plot');
  };

  const focusOnLocation = (lat?: number, lon?: number) => {
    if (location && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [
          lon ? lon : location.coords.longitude,
          lat ? lat : location.coords.latitude,
        ],
        zoomLevel: 16,
        animationDuration: 500,
      });
    }
  };

  const handlePolygonPress = (e: any) => {
    const cardInfoId = e.features[0].id;
    handleSettingCardInfo(cardInfoId);
  };

  const handleSettingCardInfo = (cardInfoId: string) => {
    const plot = cardInfoCollection.find((c) => c.id.toString() === cardInfoId);
    if (!plot) {
      return;
    }

    const products = productTypes?.find((product: ProductTypeWithCompanyId) => {
      return product.companyId === selectedCompany;
    });
    const crop = products?.productTypes.find(
      (product) => product.id === plot.crop.id
    );

    setCardInfo({
      limitScreen: true,
      canClose: true,
      onClose: () => setCardInfo(null),
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
          value: plot.numberOfPlants,
          editable: false,
        },
        {
          type: 'view',
          name: i18n.t('plots.addPlot.size'),
          value: plot.size,
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
          value: plot.certification,
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
      title: plot.plotName,
      synced: plot.synced,
    });
  };

  const undo = () => {
    if (locationsForFeature.length > 0) {
      const lastLocation = locationsForFeature[locationsForFeature.length - 1];
      setLocationsForFeature(locationsForFeature.slice(0, -1));
      setLocationsForFeatureCache([...locationsForFeatureCache, lastLocation]);
    }
  };

  const redo = () => {
    if (locationsForFeatureCache.length > 0) {
      const lastLocation =
        locationsForFeatureCache[locationsForFeatureCache.length - 1];
      setLocationsForFeatureCache(locationsForFeatureCache.slice(0, -1));
      setLocationsForFeature([...locationsForFeature, lastLocation]);
    }
  };

  const cancelNewPlot = () => {
    if (locationsForFeature.length > 0) {
      Alert.alert(
        i18n.t('plots.addPlot.discardChangesTitle'),
        i18n.t('plots.addPlot.discardChangesMessage'),
        [
          {
            text: i18n.t('plots.addPlot.cancel'),
            style: 'cancel',
          },
          {
            text: i18n.t('plots.addPlot.discardChangesButton'),
            onPress: () => {
              cancelNewPlotHandler();
            },
          },
        ]
      );
    } else {
      cancelNewPlotHandler();
    }
  };

  const cancelNewPlotHandler = () => {
    setAddingNewPlot(false);
    setLocationsForFeature([]);
    setLocationsForFeatureCache([]);

    const filteredFeatures = featureCollection.features.filter(
      (f: GeoJSON.Feature) =>
        f.id !== 'NewFeature' && f.id !== newPlot?.featureInfo.id
    ) as GeoJSON.Feature[];

    setFeatureCollection({
      type: 'FeatureCollection',
      features: [...filteredFeatures],
    });
  };

  const fitCameraToCentroids = () => {
    if (!centroidCollection || centroidCollection.features.length === 0) {
      return;
    }

    const coordinates = centroidCollection.features.map(
      (feature: any) => feature.geometry.coordinates
    );

    const longitudeCoordinates = coordinates.map((coord) => coord[0]);
    const latitudeCoordinates = coordinates.map((coord) => coord[1]);

    const minLongitude = Math.min(...longitudeCoordinates);
    const maxLongitude = Math.max(...longitudeCoordinates);
    const minLatitude = Math.min(...latitudeCoordinates);
    const maxLatitude = Math.max(...latitudeCoordinates);

    if (cameraRef.current) {
      cameraRef.current.fitBounds(
        [minLongitude, minLatitude],
        [maxLongitude, maxLatitude],
        [20, 20],
        1000
      );
    }
  };

  return (
    <View className="flex-1 h-full">
      <View className="flex-1 h-full">
        {isMapLoading && (
          <View
            style={{
              height: Dimensions.get('window').height - 200,
            }}
            className="flex absolute flex-col justify-center items-center w-full"
          >
            <ActivityIndicator size="large" animating={isMapLoading} />
            <Text className="mt-2">{i18n.t('plots.mapLoading')}</Text>
          </View>
        )}
        {location && (
          <Mapbox.MapView
            onDidFinishLoadingMap={() => {
              setIsMapLoading(false);
              focusOnLocation();
            }}
            styleURL={Mapbox.StyleURL.SatelliteStreet}
            style={{
              height: Dimensions.get('window').height,
            }}
          >
            <Mapbox.Camera
              defaultSettings={{
                centerCoordinate: [
                  location.coords.longitude,
                  location.coords.latitude,
                ],
                zoomLevel: 14,
              }}
              ref={cameraRef}
            />

            {manualMode ? (
              <>
                <Mapbox.PointAnnotation
                  id="draggableMarker"
                  coordinate={draggableMarkerCoordinate ?? [0, 0]}
                  draggable
                  onDragEnd={handleDragEnd}
                >
                  <View className="flex relative flex-row justify-center items-center w-12 h-12 rounded-full bg-White/50">
                    <LocateFixed
                      color={Colors.orange}
                      style={{ borderRadius: 999 }}
                      size={32}
                    />
                  </View>
                </Mapbox.PointAnnotation>

                <Mapbox.PointAnnotation
                  coordinate={[
                    location.coords.longitude,
                    location.coords.latitude,
                  ]}
                  id="current-location"
                  key={location.timestamp.toString()}
                >
                  <View className="flex relative flex-row justify-center items-center w-5 h-5 bg-white rounded-full">
                    <View className="w-4 h-4 bg-blue-500 rounded-full" />
                  </View>
                </Mapbox.PointAnnotation>
              </>
            ) : (
              <Mapbox.PointAnnotation
                coordinate={[
                  location.coords.longitude,
                  location.coords.latitude,
                ]}
                id="current-location"
                key={location.timestamp.toString()}
              >
                <View className="flex relative flex-row justify-center items-center w-5 h-5 bg-white rounded-full">
                  <View className="w-4 h-4 bg-blue-500 rounded-full" />
                </View>
              </Mapbox.PointAnnotation>
            )}

            {locationsForFeature.length > 0 &&
              locationsForFeature.map((location, index) => (
                <Mapbox.MarkerView
                  coordinate={[location[0], location[1]]}
                  key={index}
                  id={`location-${index}`}
                >
                  <View className="relative z-10 mb-3">
                    <Text className="absolute z-20 left-[8.5px] top-[3px] text-White">
                      {index + 1}
                    </Text>
                    <MarkerSvg />
                  </View>
                </Mapbox.MarkerView>
              ))}

            {centroidCollection &&
              centroidCollection.features.map(
                (centroid: any, index: number) => (
                  <Mapbox.MarkerView
                    coordinate={[
                      centroid.geometry.coordinates[0],
                      centroid.geometry.coordinates[1],
                    ]}
                    key={index}
                    id={`centroid-${index}`}
                  >
                    <Pressable
                      className="relative z-10 mb-3"
                      onPress={() =>
                        handleSettingCardInfo(centroid.properties.id.toString())
                      }
                    >
                      <MarkerPlotSvg />
                    </Pressable>
                  </Mapbox.MarkerView>
                )
              )}

            <Mapbox.ShapeSource
              id={'some-feature'}
              shape={featureCollection}
              onPress={handlePolygonPress}
            >
              <Mapbox.LineLayer
                sourceID="some-feature"
                id="some-feature-line"
                style={{
                  lineColor: Colors.green,
                  lineWidth: 1,
                }}
              />
              <Mapbox.FillLayer
                sourceID="some-feature"
                id="some-feature-fill"
                style={{
                  fillColor: Colors.green,
                  fillOpacity: 0.5,
                }}
              />
            </Mapbox.ShapeSource>
          </Mapbox.MapView>
        )}
      </View>

      {addingNewPlot ? (
        <View
          className="flex flex-col justify-between h-full"
          pointerEvents="box-none"
        >
          {location?.coords.accuracy && (
            <View
              className="flex flex-row self-start px-3 py-2 mx-5 mt-5 rounded-md bg-White"
              style={style.shadowMedium}
            >
              {location.coords.accuracy < 10 ? (
                <View
                  className="flex flex-row justify-start items-center self-start"
                  key={location.coords.accuracy}
                >
                  <LocateFixed
                    color={Colors.green}
                    style={{ marginRight: 8 }}
                    size={20}
                  />
                  <Text className="text-Green">
                    {i18n.t('plots.addPlot.highGPSAccuracy', {
                      accuracy: Math.round(location.coords.accuracy),
                    })}
                  </Text>
                </View>
              ) : location.coords.accuracy < 30 ? (
                <View
                  className="flex flex-row justify-start items-center"
                  key={location.coords.accuracy}
                >
                  <LocateFixed
                    color={Colors.orange}
                    style={{ marginRight: 8 }}
                    size={20}
                  />
                  <Text className="text-Orange">
                    {i18n.t('plots.addPlot.mediumGPSAccuracy', {
                      accuracy: Math.round(location.coords.accuracy),
                    })}
                  </Text>
                </View>
              ) : (
                <View
                  className="flex flex-row justify-start items-center"
                  key={location.coords.accuracy}
                >
                  <LocateFixed
                    color={Colors.red}
                    style={{ marginRight: 8 }}
                    size={20}
                  />
                  <Text className="text-red-500">
                    {i18n.t('plots.addPlot.lowGPSAccuracy', {
                      accuracy: Math.round(location.coords.accuracy),
                    })}
                  </Text>
                </View>
              )}
            </View>
          )}
          <View className="flex absolute bottom-0 flex-col w-full">
            <View className="flex flex-row justify-between items-center mx-5">
              <View className="flex flex-row items-center">
                {/* Undo */}
                <Pressable
                  className="flex flex-row justify-center items-center px-3 py-2 mr-2 rounded-md bg-White"
                  style={style.shadowMedium}
                  disabled={locationsForFeature.length === 0}
                  onPress={undo}
                >
                  <Undo2
                    color={
                      locationsForFeature.length === 0
                        ? Colors.darkGray
                        : Colors.black
                    }
                    style={{ marginRight: 8 }}
                    size={20}
                  />
                  <Text
                    className={cn(
                      'font-semibold text-[16px]',
                      locationsForFeature.length === 0
                        ? 'text-DarkGray'
                        : 'text-black'
                    )}
                  >
                    {i18n.t('plots.addPlot.undo')}
                  </Text>
                </Pressable>
                {/* Redo */}
                <Pressable
                  className="flex flex-row justify-center items-center px-3 py-2 rounded-md bg-White"
                  style={style.shadowMedium}
                  disabled={locationsForFeatureCache.length === 0}
                  onPress={redo}
                >
                  <Text
                    className={cn(
                      'font-semibold text-[16px]',
                      locationsForFeatureCache.length === 0
                        ? 'text-DarkGray'
                        : 'text-black'
                    )}
                  >
                    {i18n.t('plots.addPlot.redo')}
                  </Text>
                  <Redo2
                    color={
                      locationsForFeatureCache.length === 0
                        ? Colors.darkGray
                        : Colors.black
                    }
                    style={{ marginLeft: 8 }}
                    size={20}
                  />
                </Pressable>
              </View>
              {/* Location button */}
              <View className="flex flex-row items-center self-end">
                <Pressable
                  className="flex flex-row justify-center items-center mr-2 mb-5 w-16 h-16 rounded-full border-2 border-blue-500 bg-White"
                  onPress={() => fitCameraToCentroids()}
                  style={style.shadowMedium}
                >
                  <MapPinned color="#3b82f6" size={30} />
                </Pressable>
                <Pressable
                  className="flex flex-row justify-center items-center mb-5 w-16 h-16 rounded-full border-2 border-blue-500 bg-White"
                  onPress={() => focusOnLocation()}
                  style={style.shadowMedium}
                >
                  <Navigation color="#3b82f6" size={30} />
                </Pressable>
              </View>
            </View>
            <View className="p-5 pb-10 w-full rounded-t-md bg-White">
              {/* Add location button */}
              {manualMode ? (
                <View className="flex flex-row justify-center items-center mt-2">
                  <Pressable
                    onPress={() => setManualMode(!manualMode)}
                    className="flex flex-row flex-grow justify-center items-center px-5 py-3 mr-2 rounded-md border bg-White border-LightGray"
                  >
                    <Text className="text-black/60 font-semibold text-[16px]">
                      {i18n.t('plots.addPlot.cancel')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={addManualLocation}
                    className="flex flex-row flex-grow justify-center items-center px-5 py-3 rounded-md bg-Orange"
                  >
                    <Text className="text-White font-semibold text-[16px]">
                      {i18n.t('plots.addPlot.confirm')}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={addLocationToLocations}
                    className={cn(
                      'flex flex-row items-center justify-center px-5 py-3 rounded-md bg-Green',
                      !location?.coords.accuracy ||
                        location?.coords.accuracy > 10
                        ? 'bg-Green/70'
                        : ''
                    )}
                    disabled={
                      !location?.coords.accuracy ||
                      location?.coords.accuracy > 10
                    }
                  >
                    <MapPin
                      color={Colors.white}
                      style={{ marginRight: 8 }}
                      size={20}
                    />
                    <Text className="text-White font-semibold text-[16px]">
                      {i18n.t('plots.addPlot.addCurrentLocation')}
                    </Text>
                  </Pressable>

                  {location?.coords.accuracy &&
                  location?.coords.accuracy > 10 ? (
                    <Pressable
                      onPress={() => setManualMode(!manualMode)}
                      className="flex flex-row justify-center items-center px-5 py-3 mt-2 rounded-md bg-Orange"
                    >
                      <MapPin
                        color={Colors.white}
                        style={{ marginRight: 8 }}
                        size={20}
                      />
                      <Text className="text-White font-semibold text-[16px]">
                        {i18n.t('plots.addPlot.toggleManual')}
                      </Text>
                    </Pressable>
                  ) : null}

                  <View className="flex flex-row justify-center items-center mt-2">
                    <Pressable
                      onPress={cancelNewPlot}
                      className="flex flex-row flex-grow justify-center items-center px-5 py-3 mr-2 rounded-md border bg-White border-LightGray"
                    >
                      <Text className="text-black/60 font-semibold text-[16px]">
                        {i18n.t('plots.addPlot.cancel')}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={savePlotShape}
                      className={cn(
                        'flex flex-row items-center justify-center flex-grow px-5 py-3 rounded-md bg-Orange',
                        featureCollection.features.find(
                          (f: GeoJSON.Feature) => f.id === 'NewFeature'
                        ) === undefined
                          ? 'opacity-50'
                          : ''
                      )}
                      disabled={
                        featureCollection.features.find(
                          (f: GeoJSON.Feature) => f.id === 'NewFeature'
                        ) === undefined
                      }
                    >
                      <Text className="text-White font-semibold text-[16px]">
                        {i18n.t('plots.addPlot.savePlotShape')}
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      ) : (
        <View
          className="flex flex-col justify-between p-5 h-full"
          pointerEvents="box-none"
        >
          {type === 'new' ? (
            <View />
          ) : (
            <ViewSwitcher
              viewType={viewType}
              setViewType={setViewType}
              setSeePlot={setSeePlot}
            />
          )}
          <View className="flex flex-col">
            {cardInfo && <Card {...cardInfo} />}
            {/* Location button */}
            <View className="flex flex-row items-center self-end">
              <Pressable
                className="flex flex-row justify-center items-center mr-2 mb-5 w-16 h-16 rounded-full border-2 border-blue-500 bg-White"
                onPress={() => fitCameraToCentroids()}
                style={style.shadowMedium}
              >
                <MapPinned color="#3b82f6" size={30} />
              </Pressable>
              <Pressable
                className="flex flex-row justify-center items-center mb-5 w-16 h-16 rounded-full border-2 border-blue-500 bg-White"
                onPress={() => focusOnLocation()}
                style={style.shadowMedium}
              >
                <Navigation color="#3b82f6" size={30} />
              </Pressable>
            </View>

            {/* New plot button */}
            <Pressable
              onPress={() => {
                setAddingNewPlot(true);
                setCardInfo(null);
              }}
              className="flex flex-row justify-center items-center px-5 mb-10 w-full h-12 rounded-md bg-Orange"
              style={style.shadowLarge}
            >
              <Plus color={Colors.white} style={{ marginRight: 8 }} size={20} />
              <Text className="text-White font-semibold text-[16px]">
                {i18n.t('plots.addPlot.newPlot')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const style = StyleSheet.create({
  shadowLarge: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.45,
    shadowRadius: 3.84,
    elevation: 8,
  },
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
