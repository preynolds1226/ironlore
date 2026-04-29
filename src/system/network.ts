import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export type NetworkState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

export function toNetworkState(state: NetInfoState): NetworkState {
  return {
    isConnected: state.isConnected,
    isInternetReachable: state.isInternetReachable,
  };
}

export async function getNetworkStateOnce(): Promise<NetworkState> {
  return toNetworkState(await NetInfo.fetch());
}

/**
 * Conservative “online” signal:
 * - returns false only when we are confident there is no connectivity/reachability
 * - otherwise returns true (including unknown states) to avoid blocking users unnecessarily
 */
export function isOnlineFromState(state: NetworkState): boolean {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => {
      setOnline(isOnlineFromState(toNetworkState(s)));
    });
    return () => unsub();
  }, []);

  return online;
}

