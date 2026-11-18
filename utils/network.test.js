import { canReachNetwork, resolveNetworkState } from './network';

describe('network state', () => {
  it('reports online when the network is connected and reachable', () => {
    expect(
      resolveNetworkState({ isConnected: true, isInternetReachable: true })
    ).toBe('online');
  });

  it('reports offline when there is no connection', () => {
    expect(
      resolveNetworkState({ isConnected: false, isInternetReachable: null })
    ).toBe('offline');
  });

  it('reports offline when Wi-Fi is connected but the internet is unreachable', () => {
    expect(
      resolveNetworkState({ isConnected: true, isInternetReachable: false })
    ).toBe('offline');
  });

  it('stays unknown until the reachability probe answers', () => {
    expect(
      resolveNetworkState({ isConnected: true, isInternetReachable: null })
    ).toBe('unknown');
    expect(
      resolveNetworkState({ isConnected: true, isInternetReachable: undefined })
    ).toBe('unknown');
  });

  it('stays unknown when NetInfo has not answered yet', () => {
    expect(resolveNetworkState(null)).toBe('unknown');
    expect(resolveNetworkState(undefined)).toBe('unknown');
    expect(resolveNetworkState({})).toBe('unknown');
  });

  it('allows a request unless the network is known to be offline', () => {
    expect(canReachNetwork('online')).toBe(true);
    expect(canReachNetwork('unknown')).toBe(true);
    expect(canReachNetwork('offline')).toBe(false);
  });
});
