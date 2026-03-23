/**
 * Icon cache for Data Dragon champion/item assets.
 * Fetches once, caches in memory for the process lifetime.
 */

const DD_VERSION = "14.24.1";
const cache = new Map<string, Buffer>();

const CHAMP_IDS: Record<string, string> = {
  "Aurelion Sol": "AurelionSol", "Bel'Veth": "Belveth", "Cho'Gath": "Chogath",
  "Dr. Mundo": "DrMundo", "Jarvan IV": "JarvanIV", "Kai'Sa": "Kaisa",
  "Kha'Zix": "Khazix", "Kog'Maw": "KogMaw", "LeBlanc": "Leblanc",
  "Lee Sin": "LeeSin", "Master Yi": "MasterYi", "Miss Fortune": "MissFortune",
  "Nunu & Willump": "Nunu", "Rek'Sai": "RekSai", "Renata Glasc": "Renata",
  "Tahm Kench": "TahmKench", "Twisted Fate": "TwistedFate", "Vel'Koz": "Velkoz",
  "Wukong": "MonkeyKing", "Xin Zhao": "XinZhao", "K'Sante": "KSante",
};

function toChampId(name: string): string {
  return CHAMP_IDS[name] ?? name.replace(/[\s'.]/g, "");
}

async function fetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return Buffer.from(await resp.arrayBuffer());
  } catch {
    return null;
  }
}

export async function getChampionIcon(champName: string): Promise<Buffer | null> {
  const id = toChampId(champName);
  const key = `champ:${id}`;
  if (cache.has(key)) return cache.get(key)!;

  const url = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/${id}.png`;
  const buf = await fetchBuffer(url);
  if (buf) cache.set(key, buf);
  return buf;
}

export async function getItemIcon(itemId: number): Promise<Buffer | null> {
  if (itemId <= 0) return null;
  const key = `item:${itemId}`;
  if (cache.has(key)) return cache.get(key)!;

  const url = `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/item/${itemId}.png`;
  const buf = await fetchBuffer(url);
  if (buf) cache.set(key, buf);
  return buf;
}
