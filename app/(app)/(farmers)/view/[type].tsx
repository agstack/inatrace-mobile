import ListView from '@/components/plots/ListView';
import MapView from '@/components/plots/MapView';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Colors from '@/constants/Colors';

export default function ViewPlots() {
  const navigation = useNavigation();
  const { type } = useLocalSearchParams();

  const [viewType, setViewType] = useState<'list' | 'map'>('list');
  const [seePlot, setSeePlot] = useState<string>('');

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

  return (
    <View className="h-full border-t bg-White border-t-LightGray">
      {viewType === 'list' && type !== 'new' ? (
        <ListView
          viewType={viewType}
          setViewType={setViewType}
          setSeePlot={setSeePlot}
        />
      ) : (
        <MapView
          viewType={viewType}
          setViewType={setViewType}
          type={type}
          seePlot={seePlot}
          setSeePlot={setSeePlot}
        />
      )}
    </View>
  );
}
