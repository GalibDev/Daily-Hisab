const DEFAULT_CATEGORY_ICON_ENTRIES = [
  ["সকালের নাস্তা", "coffee"],
  ["দুপুরের খাবার", "food"],
  ["দুপুরের খরচ", "food"],
  ["যাতায়াত ভাড়া", "bus"],
  ["বিকালের নাস্তা", "coffee"],
  ["বিকেলের নাস্তা", "coffee"],
  ["মোবাইল / রিচার্জ", "mobile"],
  ["বাজার খরচ", "shopping"],
  ["রাতের খাবার", "food"],
  ["বাসা ভাড়া", "home"],
  ["তেল / গ্যাস", "fuel"],
  ["অন্যান্য খরচ", "folder"],
] as const;

export const DEFAULT_CATEGORY_ICON_MAP: Readonly<Record<string, string>> = Object.fromEntries(DEFAULT_CATEGORY_ICON_ENTRIES);

export function getDefaultCategoryIcon(category: string, fallback = "receipt") {
  return DEFAULT_CATEGORY_ICON_MAP[category.trim()] ?? fallback;
}
