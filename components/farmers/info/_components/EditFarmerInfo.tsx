import { View, Text, Pressable } from 'react-native';
import i18n from '@/locales/i18n';
import { Pen } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSelectedFarmerState } from '@/state/state';
import Colors from '@/constants/Colors';

export default function EditFarmerInfo() {
  const { selectedFarmer } = useSelectedFarmerState();

  return (
    <>
      <Text className="text-[18px] font-medium mt-5 mx-5">
        {i18n.t('farmers.info.farmerInfo')}
      </Text>
      <View className="flex flex-row justify-between items-center px-5 py-3 mx-5 mt-3 rounded-md border border-LightGray">
        <Text className="text-[16px]">{`${selectedFarmer?.name}${selectedFarmer?.name && ' '}${selectedFarmer?.surname}`}</Text>
        <Pressable
          className="flex flex-row justify-center items-center"
          onPress={() => router.push('info/edit-guest' as any)}
        >
          <Pen color={Colors.orange} style={{ marginRight: 8 }} size={18} />
          <Text className="text-[16px] text-Orange font-semibold">
            {i18n.t('farmers.edit')}
          </Text>
        </Pressable>
      </View>
    </>
  );
}
