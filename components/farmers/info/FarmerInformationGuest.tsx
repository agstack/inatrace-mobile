import { View, Text, Pressable, ScrollView } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import i18n from '@/locales/i18n';
import { Plus } from 'lucide-react-native';
import EditFarmerInfo from './_components/EditFarmerInfo';
import ListView from '@/components/plots/ListView';
import MapView from '@/components/plots/MapView';
import Colors from '@/constants/Colors';

export default function FarmerInformationGuest() {
  const [viewType, setViewType] = useState<'list' | 'map'>('list');
  const [seePlot, setSeePlot] = useState<string>('');

  return (
    <>
      <View className="flex flex-row justify-center items-center w-full h-5 bg-black/50">
        <Text className="text-white">{i18n.t('guestAccess')}</Text>
      </View>
      {viewType === 'list' ? (
        <ScrollView className="h-full border-t bg-White border-t-LightGray">
          <View className="flex flex-col justify-center items-center pt-5 mx-5">
            <Pressable
              className="flex flex-row justify-center items-center px-5 py-3 w-full rounded-md bg-Orange"
              onPress={() => router.push('view/new' as any)}
            >
              <Plus color={Colors.white} style={{ marginRight: 8 }} />
              <Text className="text-[16px] text-White font-semibold">
                {i18n.t('farmers.info.addNewPlot')}
              </Text>
            </Pressable>
          </View>

          <EditFarmerInfo />

          <ListView
            viewType={'list'}
            setViewType={setViewType}
            setSeePlot={setSeePlot}
          />
        </ScrollView>
      ) : (
        <View className="h-full border-t bg-White border-t-LightGray">
          <MapView
            viewType={viewType}
            setViewType={setViewType}
            seePlot={seePlot}
            setSeePlot={setSeePlot}
          />
        </View>
      )}
    </>
  );
}
