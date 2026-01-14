/**
 * Unit conversion library for PantryPilot
 *
 * Provides normalization and conversion capabilities for cooking units.
 * Supports volume, weight, and count unit types.
 */

/**
 * Maps unit aliases to their canonical form.
 * Handles plurals, abbreviations, and common variations.
 */
export const UNIT_ALIASES: Record<string, string> = {
  // Teaspoon aliases
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  t: 'tsp',

  // Tablespoon aliases
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  T: 'tbsp',

  // Cup aliases
  cups: 'cup',
  c: 'cup',

  // Milliliter aliases
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  mL: 'ml',

  // Liter aliases
  liter: 'L',
  liters: 'L',
  litre: 'L',
  litres: 'L',
  l: 'L',

  // Gram aliases
  gram: 'g',
  grams: 'g',

  // Kilogram aliases
  kilogram: 'kg',
  kilograms: 'kg',
  kilo: 'kg',
  kilos: 'kg',

  // Ounce aliases
  ounce: 'oz',
  ounces: 'oz',

  // Pound aliases
  pound: 'lb',
  pounds: 'lb',
  lbs: 'lb',

  // Piece aliases
  pieces: 'piece',
  pc: 'piece',
  pcs: 'piece',
  each: 'piece',

  // Dozen aliases
  dozens: 'dozen',
  doz: 'dozen',
}

/**
 * Canonical units organized by category.
 */
export const CANONICAL_UNITS = {
  volume: ['tsp', 'tbsp', 'cup', 'ml', 'L'] as const,
  weight: ['g', 'kg', 'oz', 'lb'] as const,
  count: ['piece', 'dozen'] as const,
}

type VolumeUnit = (typeof CANONICAL_UNITS.volume)[number]
type WeightUnit = (typeof CANONICAL_UNITS.weight)[number]
type CountUnit = (typeof CANONICAL_UNITS.count)[number]
type UnitCategory = 'volume' | 'weight' | 'count'

interface SelectableUnit {
  value: string
  label: string
  category: UnitCategory
}

/**
 * Units formatted for UI pickers with human-readable labels.
 */
export const SELECTABLE_UNITS: SelectableUnit[] = [
  // Volume units
  { value: 'tsp', label: 'Teaspoon (tsp)', category: 'volume' },
  { value: 'tbsp', label: 'Tablespoon (tbsp)', category: 'volume' },
  { value: 'cup', label: 'Cup', category: 'volume' },
  { value: 'ml', label: 'Milliliter (ml)', category: 'volume' },
  { value: 'L', label: 'Liter (L)', category: 'volume' },

  // Weight units
  { value: 'g', label: 'Gram (g)', category: 'weight' },
  { value: 'kg', label: 'Kilogram (kg)', category: 'weight' },
  { value: 'oz', label: 'Ounce (oz)', category: 'weight' },
  { value: 'lb', label: 'Pound (lb)', category: 'weight' },

  // Count units
  { value: 'piece', label: 'Piece', category: 'count' },
  { value: 'dozen', label: 'Dozen', category: 'count' },
]

/**
 * Conversion factors to base units.
 * Volume: everything to ml
 * Weight: everything to g
 * Count: everything to pieces
 */
const VOLUME_TO_ML: Record<VolumeUnit, number> = {
  tsp: 4.929,
  tbsp: 14.787,
  cup: 236.588,
  ml: 1,
  L: 1000,
}

const WEIGHT_TO_G: Record<WeightUnit, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
}

const COUNT_TO_PIECES: Record<CountUnit, number> = {
  piece: 1,
  dozen: 12,
}

/**
 * Normalizes a unit string to its canonical form.
 * Handles case variations, plurals, and common abbreviations.
 *
 * @param unit - The unit string to normalize
 * @returns The canonical unit form, or the original string if unknown
 */
export function normalizeUnit(unit: string): string {
  const trimmed = unit.trim()
  const lower = trimmed.toLowerCase()

  // Check if already canonical (case-sensitive check for L)
  if (trimmed === 'L') return 'L'
  if (CANONICAL_UNITS.volume.includes(trimmed as VolumeUnit)) return trimmed
  if (CANONICAL_UNITS.weight.includes(trimmed as WeightUnit)) return trimmed
  if (CANONICAL_UNITS.count.includes(trimmed as CountUnit)) return trimmed

  // Check for exact case-sensitive alias match first (important for T vs t)
  if (trimmed in UNIT_ALIASES) {
    return UNIT_ALIASES[trimmed]
  }

  // Check aliases with case-insensitive matching
  for (const [alias, canonical] of Object.entries(UNIT_ALIASES)) {
    if (alias.toLowerCase() === lower) {
      return canonical
    }
  }

  // Return lowercase version for unknown units
  return lower
}

/**
 * Gets the category of a unit.
 *
 * @param unit - The unit to categorize (will be normalized)
 * @returns The category ('volume', 'weight', 'count') or null if unknown
 */
export function getUnitCategory(unit: string): UnitCategory | null {
  const normalized = normalizeUnit(unit)

  if (CANONICAL_UNITS.volume.includes(normalized as VolumeUnit)) {
    return 'volume'
  }
  if (CANONICAL_UNITS.weight.includes(normalized as WeightUnit)) {
    return 'weight'
  }
  if (CANONICAL_UNITS.count.includes(normalized as CountUnit)) {
    return 'count'
  }

  return null
}

/**
 * Checks if conversion is possible between two units.
 * Conversion is only possible within the same category.
 *
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @returns True if conversion is possible
 */
export function canConvert(fromUnit: string, toUnit: string): boolean {
  const fromCategory = getUnitCategory(fromUnit)
  const toCategory = getUnitCategory(toUnit)

  if (fromCategory === null || toCategory === null) {
    return false
  }

  return fromCategory === toCategory
}

/**
 * Converts a value from one unit to another.
 *
 * @param value - The numeric value to convert
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @returns The converted value, or null if conversion is not possible
 */
export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const normalizedFrom = normalizeUnit(fromUnit)
  const normalizedTo = normalizeUnit(toUnit)

  // Same unit, no conversion needed
  if (normalizedFrom === normalizedTo) {
    return value
  }

  const category = getUnitCategory(normalizedFrom)
  const toCategory = getUnitCategory(normalizedTo)

  if (category === null || toCategory === null || category !== toCategory) {
    return null
  }

  // Convert through base unit
  switch (category) {
    case 'volume': {
      const fromFactor = VOLUME_TO_ML[normalizedFrom as VolumeUnit]
      const toFactor = VOLUME_TO_ML[normalizedTo as VolumeUnit]
      const baseValue = value * fromFactor
      return baseValue / toFactor
    }
    case 'weight': {
      const fromFactor = WEIGHT_TO_G[normalizedFrom as WeightUnit]
      const toFactor = WEIGHT_TO_G[normalizedTo as WeightUnit]
      const baseValue = value * fromFactor
      return baseValue / toFactor
    }
    case 'count': {
      const fromFactor = COUNT_TO_PIECES[normalizedFrom as CountUnit]
      const toFactor = COUNT_TO_PIECES[normalizedTo as CountUnit]
      const baseValue = value * fromFactor
      return baseValue / toFactor
    }
    default:
      return null
  }
}

/**
 * Common fractions mapped to their unicode characters.
 * Order matters: more precise fractions (1/8, 1/4, etc.) are checked before
 * less precise ones (1/3, 2/3) to avoid incorrect tolerance-based matches.
 * Thirds use tighter tolerances since 0.333 and 0.667 are approximations.
 */
const FRACTIONS: Array<{ value: number; char: string; tolerance: number }> = [
  // Eighths first (most precise)
  { value: 0.125, char: '\u215b', tolerance: 0.02 }, // 1/8
  { value: 0.375, char: '\u215c', tolerance: 0.02 }, // 3/8
  { value: 0.625, char: '\u215d', tolerance: 0.02 }, // 5/8
  { value: 0.875, char: '\u215e', tolerance: 0.02 }, // 7/8
  // Quarters
  { value: 0.25, char: '\u00bc', tolerance: 0.02 }, // 1/4
  { value: 0.75, char: '\u00be', tolerance: 0.02 }, // 3/4
  // Half
  { value: 0.5, char: '\u00bd', tolerance: 0.02 }, // 1/2
  // Thirds last with tighter tolerance to avoid false matches (e.g., 0.34 matching 1/3)
  { value: 1 / 3, char: '\u2153', tolerance: 0.01 }, // 1/3 (~0.333...)
  { value: 2 / 3, char: '\u2154', tolerance: 0.01 }, // 2/3 (~0.666...)
]

/**
 * Formats a numeric quantity for display, using unicode fractions
 * where appropriate.
 *
 * Note: Cooking quantities are always positive, so negative values
 * are converted to their absolute value before formatting.
 *
 * @param value - The numeric value to format
 * @returns A formatted string, potentially with unicode fractions
 */
export function formatQuantity(value: number): string {
  // Handle zero
  if (value === 0) {
    return '0'
  }

  // Cooking quantities are always positive, use absolute value
  const absValue = Math.abs(value)

  const wholePart = Math.floor(absValue)
  const fractionalPart = absValue - wholePart

  // Check if it's a whole number
  if (fractionalPart < 0.01) {
    return wholePart.toString()
  }

  // Try to match to a common fraction
  for (const fraction of FRACTIONS) {
    if (Math.abs(fractionalPart - fraction.value) < fraction.tolerance) {
      if (wholePart === 0) {
        return fraction.char
      }
      return `${wholePart}${fraction.char}`
    }
  }

  // Fall back to decimal representation
  // Round to 2 decimal places to avoid floating point artifacts
  const rounded = Math.round(absValue * 100) / 100
  return rounded.toString()
}
