// Category display stays derived from live database names. Unknown categories
// use a neutral icon; they must never inherit a misleading MiFi image.
const known = new Map<string, number>([
  ["mifi", 0], ["portable wifi", 0],
  ["routers", 1], ["router", 1],
  ["wifi cards", 2], ["wi-fi cards", 2], ["wifi card", 2],
  ["cctv", 3], ["cameras", 3],
  ["gadgets", 4], ["gadget", 4],
  ["power banks", 5], ["power bank", 5], ["powerbanks", 5],
]);

const images = [
  "/images/device-0.svg",
  "/images/device-1.svg",
  "/images/category-wifi-card.svg",
  "/images/device-3.svg",
  "/images/device-4.svg",
  "/images/category-power-bank.svg",
] as const;

export function categoryPresentationIndex(name: string): number {
  return known.get(name.trim().toLowerCase().replace(/\s+/g, " ")) ?? -1;
}

export function categoryIconPath(name: string): string {
  const index = categoryPresentationIndex(name);
  return index >= 0 ? images[index] : "/images/category-generic.svg";
}
