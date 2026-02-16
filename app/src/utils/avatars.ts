const SEEDS = [
  "felix",
  "aneka",
  "jade",
  "leo",
  "mika",
  "nova",
  "riley",
  "sasha",
  "zara",
  "theo",
];

export const AVATAR_COUNT = SEEDS.length;

export function getAvatarUrl(index: number): string {
  const seed = SEEDS[index % SEEDS.length];
  return `https://api.dicebear.com/9.x/avataaars/png?seed=${seed}&size=128`;
}
