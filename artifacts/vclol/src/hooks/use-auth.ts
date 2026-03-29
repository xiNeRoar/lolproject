import { useCallback, useSyncExternalStore } from "react";
import { useGetAuthMe, getGetAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_URL || "";

function subscribeToStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function getLocalPlayerId() {
  return localStorage.getItem("vclol_player_id");
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetAuthMe({
    query: {
      staleTime: 30_000,
      retry: false,
    },
  });

  const localPlayerId = useSyncExternalStore(subscribeToStorage, getLocalPlayerId);

  const logout = useCallback(async () => {
    localStorage.removeItem("vclol_player_id");
    window.dispatchEvent(new Event("storage"));
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
  }, [queryClient]);

  const sessionAuth = data?.authenticated ?? false;
  const sessionPlayerId = data?.playerId ?? null;
  const localIdNum = localPlayerId ? parseInt(localPlayerId, 10) || 0 : 0;

  const isLoggedIn = !!localPlayerId || sessionAuth;
  const playerIdNum = localPlayerId ? localIdNum : (sessionPlayerId ?? 0);
  const playerId = isLoggedIn ? String(playerIdNum) : null;

  return {
    playerId,
    isLoggedIn,
    playerIdNum,
    riotId: data?.riotId ?? null,
    discordUsername: data?.discordUsername ?? null,
    hasPuuid: data?.hasPuuid ?? false,
    rsoOptIn: data?.rsoOptIn ?? false,
    isLoading,
    logout,
  };
}
