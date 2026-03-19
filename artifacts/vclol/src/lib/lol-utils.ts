export const CHAMP_IDS: Record<string, string> = {
  "Aurelion Sol": "AurelionSol", "Bel'Veth": "Belveth", "Cho'Gath": "Chogath",
  "Dr. Mundo": "DrMundo", "Jarvan IV": "JarvanIV", "Kai'Sa": "Kaisa",
  "Kha'Zix": "Khazix", "Kog'Maw": "KogMaw", "LeBlanc": "Leblanc",
  "Lee Sin": "LeeSin", "Master Yi": "MasterYi", "Miss Fortune": "MissFortune",
  "Nunu & Willump": "Nunu", "Rek'Sai": "RekSai", "Renata Glasc": "Renata",
  "Tahm Kench": "TahmKench", "Twisted Fate": "TwistedFate", "Vel'Koz": "Velkoz",
  "Wukong": "MonkeyKing", "Xin Zhao": "XinZhao", "K'Sante": "KSante",
};

export const toChampId = (name: string) => CHAMP_IDS[name] ?? name.replace(/[\s'.]/g, "");

export const champPortraitUrl = (name: string) =>
  `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${toChampId(name)}_0.jpg`;

export function eloBadgeColor(elo: number) {
  if (elo >= 1400) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  if (elo >= 1200) return "bg-purple-500/20 text-purple-400 border-purple-500/30";
  if (elo >= 1100) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  return "bg-muted text-muted-foreground";
}

export function rankLabel(elo: number) {
  if (elo >= 1400) return "Gold";
  if (elo >= 1200) return "Silver";
  if (elo >= 1100) return "Bronze";
  return "Unranked";
}

export function rankIcon(position: number) {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return null;
}

export const BADGE_META: Record<string, { emoji: string; label: string }> = {
  season_champion: { emoji: "🏆", label: "Season Champion" },
  first_blood: { emoji: "⚡", label: "First Blood" },
  win_streak: { emoji: "🔥", label: "Win Streak" },
  veteran: { emoji: "💪", label: "Veteran" },
  climber: { emoji: "📈", label: "Climber" },
};

export const ROLES = ["Top", "Jungle", "Mid", "Bot", "Support"] as const;
