import { Href, Link } from 'expo-router';
import { FC } from 'react';
import { Pressable, View, Text } from 'react-native';

import { IconProps } from '@/types/svg';
import cn from '@/utils/cn';

type HomeNavButtonProps = {
  title: string;
  icon: FC<IconProps>;
  link: string;
  disabled?: boolean;
};

export default function HomeNavButton(props: HomeNavButtonProps) {
  const content = (
    <Pressable disabled={props.disabled}>
      {({ pressed }) => (
        <View
          className={cn(
            props.disabled
              ? 'bg-Green/40'
              : pressed
                ? 'bg-Green/80'
                : 'bg-Green',
            'flex flex-row m-5 items-center justify-center rounded-md p-8'
          )}
        >
          <props.icon className="w-[20]" />
          <View className="w-2" />
          <Text className="text-[16px] text-White font-semibold">
            {props.title}
          </Text>
        </View>
      )}
    </Pressable>
  );

  if (props.disabled) return content;

  return (
    <Link href={props.link as Href} asChild>
      {content}
    </Link>
  );
}
