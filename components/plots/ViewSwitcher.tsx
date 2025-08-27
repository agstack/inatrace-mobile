import Colors from '@/constants/Colors';
import i18n from '@/locales/i18n';
import cn from '@/utils/cn';
import { Map, Scroll } from 'lucide-react-native';
import { Pressable, View, Text } from 'react-native';

export type ViewSwitcherProps = {
  viewType: 'list' | 'map';
  setViewType: (viewType: 'list' | 'map') => void;
  type?: string | string[];
  padding?: boolean;
  seePlot?: string;
  setSeePlot?: (seePlot: string) => void;
};

export default function ViewSwitcher({
  viewType,
  setViewType,
  setSeePlot,
  padding,
}: ViewSwitcherProps) {
  const handleViewType = (viewType: 'list' | 'map') => {
    setViewType(viewType);
    if (setSeePlot) setSeePlot('');
  };

  return (
    <View
      className={cn(
        'flex flex-row items-center justify-between',
        padding && 'p-5'
      )}
    >
      <Pressable
        onPress={() => handleViewType('list')}
        className={cn(
          viewType === 'list'
            ? 'bg-Orange border-Orange'
            : 'bg-White border-DarkGray',
          'flex flex-row items-center justify-center w-[48%] rounded-md border py-2'
        )}
        style={{
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.45,
          shadowRadius: 3.84,
          elevation: 14,
        }}
      >
        <Scroll
          color={viewType === 'list' ? Colors.white : Colors.black}
          style={{ marginRight: 8 }}
        />
        <Text
          className={cn(
            viewType === 'list' ? 'text-White' : 'text-black',
            'font-semibold'
          )}
        >
          {i18n.t('plots.listView')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => handleViewType('map')}
        className={cn(
          viewType === 'map'
            ? 'bg-Orange border-Orange'
            : 'bg-White border-DarkGray',
          'flex flex-row items-center justify-center w-[48%] rounded-md border py-2'
        )}
        style={{
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.45,
          shadowRadius: 3.84,
          elevation: 14,
        }}
      >
        <Map
          color={viewType === 'map' ? Colors.white : Colors.black}
          style={{ marginRight: 8 }}
        />
        <Text
          className={cn(
            viewType === 'map' ? 'text-White' : 'text-black',
            'font-semibold'
          )}
        >
          {i18n.t('plots.mapView')}
        </Text>
      </Pressable>
    </View>
  );
}
