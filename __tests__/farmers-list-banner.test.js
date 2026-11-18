import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import FarmersListBanner from '@/components/farmers/FarmersListBanner';

jest.mock('@/locales/i18n', () => ({ t: (key) => key }));
jest.mock('lucide-react-native', () => ({
  AlertCircle: () => null,
  WifiOff: () => null,
}));

global.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => jest.clearAllMocks());

async function render(props) {
  let tree;
  await act(async () => {
    tree = renderer.create(<FarmersListBanner {...props} />);
  });
  return tree;
}

function texts(tree) {
  return tree.root.findAllByType(Text).map((node) => node.props.children);
}

function buttons(tree) {
  return tree.root.findAll((node) => typeof node.props?.onPress === 'function');
}

test('explains that the rows came from the cache', async () => {
  const tree = await render({ messageKey: 'farmers.offlineCached' });

  expect(texts(tree)).toContain('farmers.offlineCached');
  expect(buttons(tree)).toHaveLength(0);
});

test('warns that the update failed', async () => {
  const tree = await render({ messageKey: 'farmers.staleCached' });

  expect(texts(tree)).toContain('farmers.staleCached');
});

test('offers a retry action when the update failed', async () => {
  const onRetry = jest.fn();
  const tree = await render({ messageKey: 'farmers.staleCached', onRetry });

  const [button] = buttons(tree);
  act(() => button.props.onPress());

  expect(texts(tree)).toContain('farmers.retry');
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('does not offer a retry action for the cache notice', async () => {
  const tree = await render({
    messageKey: 'farmers.offlineCached',
    onRetry: jest.fn(),
  });

  expect(texts(tree)).not.toContain('farmers.retry');
  expect(buttons(tree)).toHaveLength(0);
});
