import Colors from '@/constants/Colors';
import {
  Pressable,
  TextInput,
  View,
  Text,
  type TextInputProps,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import cn from '@/utils/cn';
import DatePicker from 'react-native-date-picker';
import { useState } from 'react';
import i18n from '@/locales/i18n';

type InputProps = {
  keyboardType?: TextInputProps['keyboardType'];
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  editable?: boolean;
  error?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  textContentType?: TextInputProps['textContentType'];
  autoComplete?: TextInputProps['autoComplete'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  secureTextEntry?: boolean;
};

type InputPasswordProps = {
  isPasswordVisible: boolean;
  setIsPasswordVisible: (visible: boolean) => void;
} & InputProps;

export const Input = (props: InputProps) => {
  return (
    <TextInput
      placeholder={props.placeholder}
      value={props.value}
      onChangeText={props.onChangeText}
      autoCapitalize={props.autoCapitalize}
      autoCorrect={props.autoCorrect}
      keyboardType={props.keyboardType}
      textContentType={props.textContentType}
      autoComplete={props.autoComplete}
      returnKeyType={props.returnKeyType}
      onSubmitEditing={props.onSubmitEditing}
      secureTextEntry={props.secureTextEntry}
      className={cn(
        'border border-LightGray w-full h-12 mt-1 px-2 text-[16px] rounded-md',
        props.editable === false ? 'text-DarkGray' : '',
        props.error ? 'border-red-500' : ''
      )}
      placeholderTextColor={props.error ? Colors.red : Colors.darkGray}
      editable={props.editable}
    />
  );
};

export const InputPassword = (props: InputPasswordProps) => {
  const isVisible = props.isPasswordVisible;

  return (
    <View className="flex flex-row justify-between items-center mt-1 w-full h-12 rounded-md border border-LightGray">
      <TextInput
        placeholder={props.placeholder}
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={!isVisible}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        autoComplete="current-password"
        returnKeyType={props.returnKeyType}
        onSubmitEditing={props.onSubmitEditing}
        placeholderTextColor={Colors.darkGray}
        // A secure TextInput needs an explicit text colour on Android,
        // otherwise the masked characters are not drawn.
        style={{
          fontSize: 16,
          height: 48,
          paddingHorizontal: 8,
          width: '85%',
          color: Colors.black,
        }}
      />
      <View className="mr-2" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={i18n.t(
          isVisible ? 'login.hidePassword' : 'login.showPassword'
        )}
        onPress={() => props.setIsPasswordVisible(!isVisible)}
      >
        {isVisible ? (
          <EyeOff color={Colors.lightGray} style={{ marginRight: 12 }} />
        ) : (
          <Eye color={Colors.lightGray} style={{ marginRight: 12 }} />
        )}
      </Pressable>
    </View>
  );
};

export const InputCard = (props: InputProps) => {
  return (
    <TextInput
      placeholder={props.placeholder}
      value={props.value}
      onChangeText={props.onChangeText}
      className={cn(
        'border-b border-b-LightGray flex-grow flex-shrink pb-1 mt-1 px-2 text-[16px] rounded-md max-w-[50%]',
        props.editable === false ? 'text-DarkGray' : '',
        props.error ? 'border-b-red-500' : ''
      )}
      placeholderTextColor={props.error ? Colors.red : Colors.darkGray}
      editable={props.editable}
      multiline={true}
      keyboardType={props.keyboardType}
    />
  );
};

export const InputCardDate = (props: InputProps) => {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={cn(
          'border-b border-b-LightGray pb-1 mt-1 px-2  rounded-md max-w-[50%]',
          props.error ? 'border-b-red-500' : ''
        )}
      >
        <Text
          className={cn(
            'text-[16px]',
            props.editable === false || !props.value ? 'text-DarkGray' : '',
            props.error ? 'text-red-500' : ''
          )}
        >
          {props.value
            ? new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'long',
                day: '2-digit',
              }).format(new Date(props.value))
            : props.placeholder}
        </Text>
      </Pressable>
      <DatePicker
        modal
        open={open}
        date={props.value ? new Date(props.value) : new Date()}
        mode="date"
        onConfirm={(date) => {
          setOpen(false);
          props.onChangeText(date.toISOString());
        }}
        onCancel={() => {
          setOpen(false);
        }}
      />
    </>
  );
};
