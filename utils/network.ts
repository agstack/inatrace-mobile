/**
 * Network state for the offline-first screens.
 *
 * `NetInfo.isConnected` alone reports a Wi-Fi network that has no internet as
 * online, so screens tried the API, failed, and showed an empty list. The
 * tri-state keeps "we do not know yet" separate from "offline", because NetInfo
 * answers `null` for reachability until it has probed the network.
 */

export type NetworkState = 'online' | 'offline' | 'unknown';

type NetInfoLike = {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
} | null | undefined;

/**
 * A network is online only when it is connected and not known to be
 * unreachable. `isInternetReachable === null` means the probe has not finished,
 * so the result stays `unknown` instead of failing the request eagerly.
 */
export function resolveNetworkState(state: NetInfoLike): NetworkState {
  if (!state) return 'unknown';

  const connected = state.isConnected;
  const reachable = state.isInternetReachable;

  if (connected === false || reachable === false) return 'offline';
  if (connected === true && reachable === true) return 'online';
  if (connected === true && reachable == null) return 'unknown';

  return 'unknown';
}

/** True when the app may try a request. Unknown counts as yes. */
export function canReachNetwork(state: NetworkState): boolean {
  return state !== 'offline';
}
