export const categories = [
  "MiFi",
  "Routers",
  "WiFi Cards",
  "CCTV",
  "Gadgets",
] as const;
export type Category = (typeof categories)[number];
export const products = categories.map((category, index) => ({
  id: `sample-${index + 1}`,
  category,
  image: `/images/device-${index}.svg`,
}));
