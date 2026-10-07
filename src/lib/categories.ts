// The one list of expense categories. Values match the Prisma
// `ExpenseCategory` enum; never show the raw value in the UI, use `label`.

export const CATEGORY_VALUES = [
  "FOOD_DRINK",
  "TRANSPORTATION",
  "ACCOMMODATION",
  "ENTERTAINMENT",
  "SHOPPING",
  "UTILITIES",
  "HEALTHCARE",
  "EDUCATION",
  "TRAVEL",
  "OTHER",
] as const;

export type CategoryValue = (typeof CATEGORY_VALUES)[number];

export const CATEGORIES: ReadonlyArray<{ value: CategoryValue; label: string }> = [
  { value: "FOOD_DRINK", label: "Food & drink" },
  { value: "TRANSPORTATION", label: "Transport" },
  { value: "ACCOMMODATION", label: "Accommodation" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "SHOPPING", label: "Shopping" },
  { value: "UTILITIES", label: "Utilities & bills" },
  { value: "HEALTHCARE", label: "Health" },
  { value: "EDUCATION", label: "Education" },
  { value: "TRAVEL", label: "Travel" },
  { value: "OTHER", label: "Other" },
];

export const DEFAULT_CATEGORY: CategoryValue = "OTHER";

export function isCategory(value: unknown): value is CategoryValue {
  return typeof value === "string" && (CATEGORY_VALUES as readonly string[]).includes(value);
}

export function categoryLabel(value: string | null | undefined): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}

// Keyword hints for a first guess from the description. Whole words only, so
// "bus" does not match "business". The user can always change it.
const KEYWORDS: Array<[CategoryValue, string[]]> = [
  ["FOOD_DRINK", ["dinner", "lunch", "breakfast", "brunch", "food", "restaurant", "cafe", "coffee", "pizza", "drinks", "beer", "bar", "snacks", "groceries", "grocery", "supper", "meal", "bakery", "sushi", "burger"]],
  ["TRANSPORTATION", ["taxi", "uber", "grab", "gojek", "lyft", "bus", "train", "metro", "fuel", "gas", "petrol", "parking", "toll", "ride", "car"]],
  ["ACCOMMODATION", ["hotel", "airbnb", "hostel", "rent", "villa", "lodging", "motel", "stay"]],
  ["ENTERTAINMENT", ["movie", "movies", "cinema", "concert", "tickets", "ticket", "museum", "karaoke", "netflix", "spotify", "game", "games", "show"]],
  ["SHOPPING", ["shopping", "clothes", "gift", "gifts", "supplies", "market", "mall"]],
  ["UTILITIES", ["electricity", "water", "internet", "wifi", "phone", "bill", "bills", "utilities", "power"]],
  ["HEALTHCARE", ["doctor", "pharmacy", "medicine", "hospital", "dentist", "clinic"]],
  ["EDUCATION", ["books", "course", "tuition", "class", "school", "workshop"]],
  ["TRAVEL", ["flight", "flights", "airfare", "visa", "tour", "trip", "luggage", "ferry"]],
];

/** Guess a category from an expense description; OTHER when nothing matches. */
export function guessCategory(description: string): CategoryValue {
  const words = new Set(description.toLowerCase().split(/[^a-z]+/).filter(Boolean));
  for (const [category, keys] of KEYWORDS) {
    if (keys.some((k) => words.has(k))) return category;
  }
  return DEFAULT_CATEGORY;
}
