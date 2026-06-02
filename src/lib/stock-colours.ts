export interface ColourOption {
  key: string;
  label: string;
  classes: string;
  swatch: string;
}

export const COLOUR_OPTIONS: ColourOption[] = [
  { key: "green",  label: "Green",  classes: "bg-emerald-100 text-emerald-700", swatch: "#059669" },
  { key: "teal",   label: "Teal",   classes: "bg-teal-100 text-teal-700",       swatch: "#0f766e" },
  { key: "blue",   label: "Blue",   classes: "bg-blue-100 text-blue-700",       swatch: "#1d4ed8" },
  { key: "purple", label: "Purple", classes: "bg-purple-100 text-purple-700",   swatch: "#7e22ce" },
  { key: "amber",  label: "Amber",  classes: "bg-amber-100 text-amber-700",     swatch: "#b45309" },
  { key: "orange", label: "Orange", classes: "bg-orange-100 text-orange-700",   swatch: "#c2410c" },
  { key: "red",    label: "Red",    classes: "bg-rose-100 text-rose-700",       swatch: "#be123c" },
  { key: "grey",   label: "Grey",   classes: "bg-slate-100 text-slate-600",     swatch: "#475569" },
];

export interface StockColours {
  inStock: string;
  lowStock: string;
  outOfStock: string;
}

export const DEFAULT_STOCK_COLOURS: StockColours = {
  inStock:    "green",
  lowStock:   "amber",
  outOfStock: "red",
};

export function getClasses(colourKey: string): string {
  return COLOUR_OPTIONS.find((c) => c.key === colourKey)?.classes ?? "bg-slate-100 text-slate-600";
}
