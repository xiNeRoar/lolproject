import { useState, useEffect, useCallback } from "react";

export function useAuth() {
  const [playerId, setPlayerId] = useState<string | null>(() =>
    localStorage.getItem("vclol_player_id")
  );

  useEffect(() => {
    const sync = () => setPlayerId(localStorage.getItem("vclol_player_id"));
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("vclol_player_id");
    window.dispatchEvent(new Event("storage"));
  }, []);

  return {
    playerId,
    isLoggedIn: !!playerId,
    playerIdNum: playerId ? Number(playerId) : 0,
    logout,
  };
}
