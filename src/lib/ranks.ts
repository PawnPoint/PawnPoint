export const rankBands = [
  {
    key: "gold",
    label: "Gold",
    min: 1,
    max: 50,
  },
  {
    key: "diamond",
    label: "Diamond",
    min: 51,
    max: 100,
  },
  {
    key: "ascendant",
    label: "Ascendant",
    min: 101,
    max: 200,
  },
  {
    key: "immortal",
    label: "Immortal",
    min: 201,
    max: 400,
  },
  {
    key: "radiant",
    label: "Radiant",
    min: 401,
    max: undefined,
  },
] as const;

export type RankBand = (typeof rankBands)[number];
export type RankBandKey = RankBand["key"];

export function resolveRankBand(level: number): RankBand {
  return (
    rankBands.find((band) => level >= band.min && (band.max === undefined || level <= band.max)) ||
    rankBands[0]
  );
}

export function formatRankBandRange(band: Pick<RankBand, "min" | "max">) {
  return band.max === undefined ? `Levels ${band.min}+` : `Levels ${band.min} - ${band.max}`;
}
