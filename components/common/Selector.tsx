import Colors from '@/constants/Colors';
import cn from '@/utils/cn';
import { Check, LucideIcon } from 'lucide-react-native';
import { Pressable, View, Text } from 'react-native';

type SelectorProps<T extends string | number> = {
  selected: T;
  setSelected: (selected: T) => void;
  items: { label: string; value: T; icon?: LucideIcon }[];
};

export default function Selector<T extends string | number>(
  props: SelectorProps<T>
) {
  return (
    <View className="m-5 rounded-md border border-LightGray">
      {props.items.map((item, index) => {
        const IconComponent = item?.icon;
        return (
          <Pressable
            key={index}
            onPress={() => {
              props.setSelected(item.value);
            }}
            className={cn(
              'flex flex-row items-center justify-between py-4 ml-4 pr-4 ml border-b border-b-LightGray',
              index === props.items.length - 1 && 'border-b-0'
            )}
          >
            <View className="flex flex-row items-center mr-3">
              <Text className="text-[16px] text-black">{item.label}</Text>
              {IconComponent && (
                <IconComponent
                  color={Colors.black}
                  style={{ marginLeft: 8 }}
                  size={20}
                />
              )}
            </View>

            {props.selected === item.value && (
              <Check color={Colors.black} size={18} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
