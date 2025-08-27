import { Pressable, TextInput, View, Text, Keyboard } from 'react-native';
import { ArrowDownUp, Filter, LucideIcon, Search } from 'lucide-react-native';
import i18n from '@/locales/i18n';
import Colors from '@/constants/Colors';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useCallback, useMemo, useRef } from 'react';
import Selector from './Selector';

type SearchInputProps = {
  input: string;
  setInput: (input: string) => void;
  selectedSort: string;
  setSelectedSort: (selectedSort: string) => void;
  selectedFilter: string;
  setSelectedFilter: (selectedFilter: string) => void;
  sortItems: { label: string; value: string; icon?: LucideIcon }[];
  filterItems: { label: string; value: string }[];
};

export default function SearchInput(props: SearchInputProps) {
  const bottomSheetSortModalRef = useRef<BottomSheetModal>(null);
  const bottomSheetFilterModalRef = useRef<BottomSheetModal>(null);

  const snapPointsSort = useMemo(() => ['55%'], []);
  const snapPointsFilter = useMemo(() => ['30%'], []);

  const handlePresentSortModalPress = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetSortModalRef.current?.present();
  }, []);

  const handlePresentFilterModalPress = useCallback(() => {
    Keyboard.dismiss();
    bottomSheetFilterModalRef.current?.present();
  }, []);

  const setSelectedSort = (selectedSort: string) => {
    props.setSelectedSort(selectedSort);
    bottomSheetSortModalRef.current?.close();
  };

  const setSelectedFilter = (selectedFilter: string) => {
    props.setSelectedFilter(selectedFilter);
    bottomSheetFilterModalRef.current?.close();
  };

  return (
    <View className="flex flex-row justify-between items-center px-5">
      <View className="relative flex flex-row items-center justify-between h-12 mt-1 border rounded-md border-LightGray bg-White w-[70%]">
        <Search
          color={Colors.lightGray}
          style={{ position: 'absolute', left: 8 }}
        />
        <TextInput
          placeholder={i18n.t('farmers.search')}
          value={props.input}
          onChangeText={props.setInput}
          placeholderTextColor={Colors.darkGray}
          className="text-[16px] h-12 px-2 pl-12 rounded-md w-full"
        />
      </View>
      <Pressable
        onPress={handlePresentSortModalPress}
        className="flex flex-row justify-center items-center mt-1 w-12 h-12 rounded-md border border-LightGray bg-White"
      >
        <ArrowDownUp color={Colors.lightGray} />
      </Pressable>
      <BottomSheetModal
        ref={bottomSheetSortModalRef}
        index={0}
        snapPoints={snapPointsSort}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            onPress={() => bottomSheetSortModalRef.current?.close()}
            disappearsOnIndex={-1}
          />
        )}
        enableDismissOnClose={true}
      >
        <BottomSheetView className="rounded-t-md">
          <Text className="px-5 font-medium text-[16px]">
            {i18n.t('farmers.sort.sortBy')}
          </Text>
          <Selector
            items={props.sortItems}
            selected={props.selectedSort}
            setSelected={setSelectedSort}
          />
        </BottomSheetView>
      </BottomSheetModal>

      <Pressable
        onPress={handlePresentFilterModalPress}
        className="flex flex-row justify-center items-center mt-1 w-12 h-12 rounded-md border border-LightGray bg-White"
      >
        <Filter color={Colors.lightGray} />
      </Pressable>
      <BottomSheetModal
        ref={bottomSheetFilterModalRef}
        index={0}
        snapPoints={snapPointsFilter}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            onPress={() => bottomSheetFilterModalRef.current?.close()}
            disappearsOnIndex={-1}
          />
        )}
        enableDismissOnClose={true}
      >
        <BottomSheetView className="rounded-t-md">
          <Text className="px-5 font-medium text-[16px]">
            {i18n.t('farmers.filter.filterBy')}
          </Text>
          <Selector
            items={props.filterItems}
            selected={props.selectedFilter}
            setSelected={setSelectedFilter}
          />
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}
