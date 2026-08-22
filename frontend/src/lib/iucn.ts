// Shared IUCN Red List legend — used by both the species-list conservation
// badges and the IUCN Guidelines drawer, so the colors always match.

export interface IucnCategory {
  code: string;
  label: string;
  description: string;
  color: string; // tailwind-ish hex, used for badge bg/border/text
}

export const IUCN_CATEGORIES: IucnCategory[] = [
  { code: "EX", label: "Extinct", description: "No known individuals remaining in existence.", color: "#e11d48" },
  { code: "EW", label: "Extinct in the Wild", description: "Survives only in captivity or cultivation.", color: "#c026d3" },
  { code: "CR", label: "Critically Endangered", description: "Extremely high risk of extinction in the wild.", color: "#f43f5e" },
  { code: "EN", label: "Endangered", description: "Very high risk of extinction in the wild.", color: "#f97316" },
  { code: "VU", label: "Vulnerable", description: "High risk of extinction in the wild.", color: "#eab308" },
  { code: "NT", label: "Near Threatened", description: "Likely to qualify for a threatened category soon.", color: "#84cc16" },
  { code: "LC", label: "Least Concern", description: "Widespread and abundant; lowest extinction risk.", color: "#22c55e" },
  { code: "DD", label: "Data Deficient", description: "Inadequate information to assess extinction risk.", color: "#06b6d4" },
  { code: "NE", label: "Not Evaluated", description: "Has not yet been assessed against criteria.", color: "#94a3b8" },
];

const ALIASES: Record<string, string> = {
  extinct: "EX",
  "extinct in the wild": "EW",
  "critically endangered": "CR",
  critical: "CR",
  endangered: "EN",
  vulnerable: "VU",
  "near threatened": "NT",
  "least concern": "LC",
  "data deficient": "DD",
  "not evaluated": "NE",
  unknown: "NE",
};

export function resolveIucnCategory(flag: string | null | undefined): IucnCategory {
  if (!flag) {
    return { code: "—", label: "Unflagged", description: "No conservation concern on record.", color: "#7dd3fc" };
  }
  const normalized = flag.trim().toLowerCase();
  const code = ALIASES[normalized] ?? flag.trim().toUpperCase();
  return IUCN_CATEGORIES.find((c) => c.code === code) ?? {
    code: flag.toUpperCase(),
    label: flag,
    description: "Status reported by the backend.",
    color: "#7dd3fc",
  };
}
