import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import OfflineMapNotice from '@/components/home/OfflineMapNotice';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/locales/i18n', () => ({ t: (key) => key }));
jest.mock('lucide-react-native', () => ({
  ChevronRight: () => null,
  Download: () => null,
}));

global.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => jest.clearAllMocks());

function render(status, isConnected = true) {
  let tree;
  act(() => {
    tree = renderer.create(
      <OfflineMapNotice status={status} isConnected={isConnected} />
    );
  });
  return tree;
}

function texts(tree) {
  return tree.root.findAllByType(Text).map((node) => node.props.children);
}

test('shows nothing when a map is ready', () => {
  expect(render('ready').toJSON()).toBeNull();
});

test('shows nothing while the status is unknown', () => {
  expect(render('unknown').toJSON()).toBeNull();
});

test('explains how to download a map and does not navigate on render', () => {
  const tree = render('none');
  expect(texts(tree)).toContain('home.offlineMapNotice.none');
  expect(router.push).not.toHaveBeenCalled();
});

test('offers the download action when no map exists', async () => {
  const tree = render('none');
  const action = tree.root.find(
    (node) =>
      node.props?.accessibilityLabel === 'home.offlineMapNotice.download'
  );

  await act(async () => {
    action.props.onPress();
  });

  expect(router.push).toHaveBeenCalledWith('/map-download');
});

test('asks for a connection when the device is offline', () => {
  const tree = render('none', false);
  expect(texts(tree)).toContain('home.offlineMapNotice.noneOffline');
});

test('reports a download in progress and links to the map screen', async () => {
  const tree = render('downloading');
  expect(texts(tree)).toContain('home.offlineMapNotice.downloading');

  const action = tree.root.find(
    (node) => node.props?.accessibilityLabel === 'home.offlineMapNotice.view'
  );
  await act(async () => {
    action.props.onPress();
  });

  expect(router.push).toHaveBeenCalledWith('/map-download');
});

test('offers an update when the map expired', async () => {
  const tree = render('expired');
  expect(texts(tree)).toContain('home.offlineMapNotice.expired');

  const action = tree.root.find(
    (node) => node.props?.accessibilityLabel === 'home.offlineMapNotice.update'
  );
  await act(async () => {
    action.props.onPress();
  });

  expect(router.push).toHaveBeenCalledWith('/map-download');
});
