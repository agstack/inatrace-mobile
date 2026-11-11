import ListView from '@/components/plots/ListView';
import MapView from '@/components/plots/MapView';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

export default function ViewPlots() {
  const { type } = useLocalSearchParams();

  const [viewType, setViewType] = useState<'list' | 'map'>('list');
  const [seePlot, setSeePlot] = useState<string>('');

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
