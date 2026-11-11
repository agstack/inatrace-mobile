import React from 'react';
import { TextInput } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import { Input, InputPassword } from '@/components/common/Input';

jest.mock('@/locales/i18n', () => ({ t: (key) => key }));
jest.mock('lucide-react-native', () => ({
  Eye: () => null,
  EyeOff: () => null,
}));
jest.mock('react-native-date-picker', () => () => null);

global.IS_REACT_ACT_ENVIRONMENT = true;

async function render(element) {
  let tree;
  await act(async () => {
    tree = renderer.create(element);
  });
  return tree;
}

test('the username field disables autocapitalisation and autocorrection', async () => {
  const tree = await render(
    <Input
      value=""
      onChangeText={jest.fn()}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="email-address"
    />
  );

  const input = tree.root.findByType(TextInput);
  expect(input.props.autoCapitalize).toBe('none');
  expect(input.props.autoCorrect).toBe(false);
  expect(input.props.keyboardType).toBe('email-address');
});

test('masks the password while keeping its value controlled', async () => {
  const tree = await render(
    <InputPassword
      value="secret"
      onChangeText={jest.fn()}
      isPasswordVisible={false}
      setIsPasswordVisible={jest.fn()}
    />
  );

  const input = tree.root.findByType(TextInput);
  expect(input.props.secureTextEntry).toBe(true);
  expect(input.props.value).toBe('secret');
  expect(input.props.autoCapitalize).toBe('none');
  expect(input.props.autoCorrect).toBe(false);
  expect(input.props.textContentType).toBe('password');
});

test('shows the password when it is visible', async () => {
  const tree = await render(
    <InputPassword
      value="secret"
      onChangeText={jest.fn()}
      isPasswordVisible
      setIsPasswordVisible={jest.fn()}
    />
  );

  const input = tree.root.findByType(TextInput);
  expect(input.props.secureTextEntry).toBe(false);
  expect(input.props.value).toBe('secret');
});

test('the eye offers to show and hide the password', async () => {
  const setIsPasswordVisible = jest.fn();
  const tree = await render(
    <InputPassword
      value="secret"
      onChangeText={jest.fn()}
      isPasswordVisible={false}
      setIsPasswordVisible={setIsPasswordVisible}
    />
  );

  const show = tree.root.find(
    (node) =>
      node.props?.accessibilityLabel === 'login.showPassword' &&
      typeof node.props?.onPress === 'function'
  );
  await act(async () => {
    show.props.onPress();
  });

  expect(setIsPasswordVisible).toHaveBeenCalledWith(true);
});

test('the visible eye offers to hide the password', async () => {
  const tree = await render(
    <InputPassword
      value="secret"
      onChangeText={jest.fn()}
      isPasswordVisible
      setIsPasswordVisible={jest.fn()}
    />
  );

  const hide = tree.root.find(
    (node) => node.props?.accessibilityLabel === 'login.hidePassword'
  );
  expect(hide).toBeTruthy();
});
