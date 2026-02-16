const ADJECTIVES = [
  "swift", "bold", "clever", "bright", "calm",
  "daring", "eager", "fair", "keen", "noble",
  "brave", "witty", "vivid", "steady", "gentle",
  "fierce", "agile", "lucid", "merry", "rapid",
  "silent", "warm", "cosmic", "electric", "golden",
  "lunar", "polar", "stellar", "azure", "crimson",
];

const NOUNS = [
  "falcon", "aurora", "cosmos", "ember", "glacier",
  "horizon", "nebula", "phoenix", "summit", "tempest",
  "comet", "tundra", "canyon", "prism", "breeze",
  "circuit", "quasar", "ripple", "cedar", "flint",
  "atlas", "harbor", "marlin", "orbit", "spark",
  "coral", "drift", "echo", "maple", "river",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandomName(): string {
  return `${pick(ADJECTIVES)}_${pick(NOUNS)}`;
}
