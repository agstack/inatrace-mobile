import { Href, Link } from 'expo-router';
import { FC } from 'react';
import { Lock } from 'lucide-react-native';
import { Pressable, View, Text } from 'react-native';

import { IconProps } from '@/types/svg';
import cn from '@/utils/cn';

type HomeNavButtonProps = {
  title: string;
  icon: FC<IconProps>;
  link: string;
  disabled?: boolean;
  hint?: string;
};

export default function HomeNavButton(props: HomeNavButtonProps) {
  const content = (
    <Pressable
      disabled={props.disabled}
      accessibilityState={{ disabled: Boolean(props.disabled) }}
    >
      {({ pressed }) => (
        <View
          className={cn(
            props.disabled
              ? 'bg-[#6B7280]'
              : pressed
                ? 'bg-Green/80'
                : 'bg-Green',
            'flex flex-row m-5 items-center justify-center rounded-md p-8'
          )}
        >
          <props.icon className="w-[20]" />
          <View className="w-2" />
          <View className="flex flex-col">
            <Text className="text-[16px] text-White font-semibold">
              {props.title}
            </Text>
            {props.disabled && props.hint ? (
              <Text className="text-[12px] text-White/80 mt-1">
                {props.hint}
              </Text>
            ) : null}
          </View>
          {props.disabled ? (
            <Lock
              color="rgba(255,255,255,0.8)"
              size={16}
              style={{ marginLeft: 8 }}
            />
          ) : null}
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
