import {
  View,
  Text,
  Pressable,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  AlertCircle,
  Check,
  ChevronDown,
  MoveDiagonal,
  Search,
  Share2,
  X,
  Text as LucideText,
  QrCode,
} from 'lucide-react-native';
import { router } from 'expo-router';
import cn from '@/utils/cn';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Farmer } from '@/types/farmer';
import { InputCard, InputCardDate } from './Input';
import { FullWindowOverlay } from 'react-native-screens';
import * as Haptics from 'expo-haptics';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import Selector from './Selector';
import Colors from '@/constants/Colors';
import i18n from '@/locales/i18n';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import { useSelectedFarmerState } from '@/state/state';

export type CardProps = {
  id?: number;
  items: Array<ItemProps>;
  title?: string;
  navigationPath?: string;
  navigationParams?: {
    type: 'farmer';
    data: Farmer;
  };
  synced?: boolean;
  canClose?: boolean;
  limitScreen?: boolean;
  onClose?: () => void;
  switchView?: () => void;
};

export type ItemProps = {
  type: 'view' | 'type' | 'select' | 'checkbox' | 'date';
  name: string;
  value: string | null;
  placeholder?: string;
  editable?: boolean;
  selectItems?: Array<{ label: string; value: string }>;
  setValue?: (text: string) => void;
  isSelectScrollable?: boolean;
  selectWithSearch?: boolean;
  updateSearch?: (search: string) => void;
  snapPoints?: string;
  isNumeric?: boolean;
  error?: boolean;
  share?: boolean;
};

export default function Card({
  items,
  title,
  navigationPath,
  navigationParams,
  synced,
  canClose,
  onClose,
  switchView,
  limitScreen,
}: CardProps) {
  const { setSelectedFarmer } = useSelectedFarmerState();

  const navigateToDetails = () => {
    switch (navigationParams?.type) {
      case 'farmer':
        setSelectedFarmer(navigationParams.data);
        break;
      default:
        break;
    }

    router.push(navigationPath as any);
  };

  return (
    <ScrollView className={cn('flex flex-col m-5', limitScreen && 'h-[50%]')}>
      {synced === false && (
        <View className="flex flex-row justify-start items-center mb-1">
          <AlertCircle color="#d8b4fe" style={{ marginRight: 8 }} size={14} />
          <Text className="text-purple-300">
            {i18n.t('synced.itemNotSynced')}
          </Text>
        </View>
      )}
      {title && (
        <Pressable
          className="flex flex-row justify-between items-center p-4 rounded-t-md bg-Green"
          onPress={() =>
            navigationPath
              ? navigateToDetails()
              : switchView
                ? switchView()
                : null
          }
          disabled={!navigationPath && !switchView}
        >
          <Text className="text-White text-[18px] font-semibold">{title}</Text>
          {navigationPath && (
            <View>
              <MoveDiagonal color={Colors.white} />
            </View>
          )}
          {canClose && (
            <Pressable onPress={onClose}>
              <X color={Colors.white} />
            </Pressable>
          )}
        </Pressable>
      )}
      <View
        className={cn(
          title
            ? 'rounded-b-md border-b border-x border-x-LightGray border-b-LightGray'
            : 'rounded-md border border-LightGray',
          'bg-White'
        )}
      >
        {items?.map((item, index) => {
          switch (item.type) {
            case 'view':
              return (
                <ItemView
                  key={index}
                  item={item}
                  isLast={index === items.length - 1}
                />
              );
            case 'type':
              return (
                <ItemType
                  key={index}
                  item={item}
                  isLast={index === items.length - 1}
                />
              );
            case 'select':
              return (
                <ItemSelect
                  key={index}
                  item={item}
                  isLast={index === items.length - 1}
                />
              );
            case 'checkbox':
              return (
                <ItemCheckbox
                  key={index}
                  item={item}
                  isLast={index === items.length - 1}
                />
              );
            case 'date':
              return (
                <ItemDate
                  key={index}
                  item={item}
                  isLast={index === items.length - 1}
                />
              );
          }
        })}
      </View>
    </ScrollView>
  );
}

const ItemView = ({ item, isLast }: { item: ItemProps; isLast: boolean }) => {
  const [qrView, setQrView] = useState<boolean>(false);
  const qrRef = useRef();

  const onShare = async (value: string) => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Share.open({
        message: value,
      });
    } catch (error: any) {
      console.log(error.message);
    }
  };

  const onShareQR = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const uri = await captureRef(qrRef, {
        format: 'png',
        quality: 0.7,
      });
      await Share.open({
        url: uri,
      });
    } catch (error: any) {
      console.log(error.message);
    }
  };

  return (
    <View
      className={cn(
        'flex flex-row justify-between py-4 ml-4 pr-4 border-b border-b-LightGray',
        isLast && 'border-b-0'
      )}
    >
      <Text className="text-[16px] max-w-[45%]">{item.name}</Text>
      <View className="max-w-[50%] flex flex-row items-center">
        {qrView ? (
          <Pressable
            className="mr-4"
            onLongPress={onShareQR}
            ref={qrRef as any}
          >
            <QRCode value={item.value ?? ''} size={70} />
          </Pressable>
        ) : (
          <Pressable onLongPress={() => onShare(item.value ?? '')}>
            <Text
              className={cn(
                'text-DarkGray text-[16px]',
                item.share && item?.value && 'mr-10'
              )}
            >
              {item.value}
            </Text>
          </Pressable>
        )}

        {item.share && item?.value && (
          <View className={cn('flex flex-col', !qrView && 'right-8')}>
            <Pressable
              className="flex flex-row justify-center items-center mb-2 w-8 h-8 rounded-md border border-LightGray"
              onPress={() => (qrView ? onShareQR() : onShare(item.value ?? ''))}
            >
              <Share2 color={Colors.black} size={18} />
            </Pressable>
            <Pressable
              className="flex flex-row justify-center items-center w-8 h-8 rounded-md border border-LightGray"
              onPress={() => setQrView(!qrView)}
            >
              {!qrView ? (
                <QrCode color={Colors.black} size={18} />
              ) : (
                <LucideText color={Colors.black} size={18} />
              )}
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

const ItemType = ({ item, isLast }: { item: ItemProps; isLast: boolean }) => {
  return (
    <View
      className={cn(
        'flex flex-row items-center justify-between py-2 ml-4 pr-4 border-b border-b-LightGray',
        isLast && 'border-b-0'
      )}
    >
      <Text className="text-[16px] mr-3 max-w-[45%]">{item.name}</Text>
      <InputCard
        value={item.value ?? ''}
        placeholder={item.placeholder}
        editable={item.editable}
        onChangeText={item.setValue ?? (() => {})}
        keyboardType={item.isNumeric ? 'numeric' : 'default'}
        error={item.error}
      />
    </View>
  );
};

const ItemSelect = ({ item, isLast }: { item: ItemProps; isLast: boolean }) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['75%'], []);
  const handlePresentModalPress = () => {
    bottomSheetRef.current?.present();
  };
  const containerComponent = useCallback(
    (props: any) => <FullWindowOverlay>{props.children}</FullWindowOverlay>,
    []
  );

  const [search, setSearch] = useState<string>('');

  const handleChangeSearch = (search: string) => {
    setSearch(search);
    item.updateSearch?.(search);
  };

  const selected = item.selectItems?.find(
    (selected) => selected.value === item.value
  );

  const setSelected = (selected: string) => {
    item.setValue ? item.setValue(selected) : () => {};
    bottomSheetRef.current?.close();
  };

  return (
    <View className="">
      <View
        className={cn(
          'flex flex-row items-center justify-between py-2 ml-4 pr-4 border-b border-b-LightGray',
          isLast && 'border-b-0'
        )}
      >
        <Text className="text-[16px] mr-3 max-w-[45%]">{item.name}</Text>
        <Pressable
          onPress={handlePresentModalPress}
          className={cn(
            'flex flex-row items-center flex-shrink px-2 py-1 border-b border-b-LightGray',
            item.error && 'border-b-red-500'
          )}
        >
          <Text
            className={cn(
              'text-[16px]',
              item.value ? '' : 'text-DarkGray',
              item.error && 'text-red-500'
            )}
          >
            {selected ? selected.label : item.placeholder}
          </Text>
          <ChevronDown
            color={item.error ? Colors.red : Colors.darkGray}
            style={{ marginLeft: 8 }}
          />
        </Pressable>
      </View>

      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
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
          {item.selectWithSearch && (
            <View className="flex relative flex-row justify-between items-center mx-5 mt-1 h-12 rounded-md border border-LightGray bg-White">
              <Search
                color={Colors.lightGray}
                style={{ position: 'absolute', left: 8 }}
              />
              <TextInput
                placeholder={i18n.t('farmers.search')}
                value={search}
                onChangeText={handleChangeSearch}
                placeholderTextColor={Colors.darkGray}
                className="text-[16px] h-12 px-2 pl-12 rounded-md w-full"
              />
            </View>
          )}
          <Selector
            items={item.selectItems ?? []}
            selected={item.value ?? ''}
            setSelected={setSelected}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
};

const ItemDate = ({ item, isLast }: { item: ItemProps; isLast: boolean }) => {
  return (
    <View
      className={cn(
        'flex flex-row items-center justify-between py-2 ml-4 pr-4 border-b border-b-LightGray',
        isLast && 'border-b-0'
      )}
    >
      <Text className="text-[16px] mr-3 max-w-[45%]">{item.name}</Text>
      <InputCardDate
        value={item.value ?? ''}
        placeholder={item.placeholder}
        editable={item.editable}
        onChangeText={item.setValue ?? (() => {})}
        error={item.error}
      />
    </View>
  );
};

const ItemCheckbox = ({
  item,
  isLast,
}: {
  item: ItemProps;
  isLast: boolean;
}) => {
  return (
    <View
      className={cn(
        'flex flex-row items-center justify-between py-3 ml-4 pr-4 border-b border-b-LightGray',
        isLast && 'border-b-0'
      )}
    >
      <Text className="text-[16px] mr-3 max-w-[45%]">{item.name}</Text>
      {item.value === i18n.t('yes') ? (
        <Pressable
          className="flex flex-row justify-center items-center w-6 h-6 rounded-md border border-LightGray"
          onPress={() => item.setValue!(i18n.t('no'))}
        >
          <Check color={Colors.black} size={18} />
        </Pressable>
      ) : (
        <Pressable
          className="flex flex-row justify-center items-center w-6 h-6 rounded-md border border-LightGray"
          onPress={() => item.setValue!(i18n.t('yes'))}
        ></Pressable>
      )}
    </View>
  );
};
