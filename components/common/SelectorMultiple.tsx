import Colors from '@/constants/Colors';
import cn from '@/utils/cn';
import { Check, LucideIcon } from 'lucide-react-native';
import { Pressable, View, Text } from 'react-native';

type SelectorProps = {
  selected: string[] | number[];
  setSelected: (selected: string | number) => void;
  items: { label: string; value: string | number; icon?: LucideIcon }[];
};

export default function SelectorMultiple(props: SelectorProps) {
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
                  style={{ marginLeft: 8 }}
                  color={Colors.black}
                  size={20}
                />
              )}
            </View>

            {(props?.selected as any)?.includes(item.value) && (
              <View>
                <Check color={Colors.black} size={18} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
