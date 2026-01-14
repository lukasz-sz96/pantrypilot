import { describe, it, expect } from 'vitest'
import {
  UNIT_ALIASES,
  CANONICAL_UNITS,
  SELECTABLE_UNITS,
  normalizeUnit,
  getUnitCategory,
  canConvert,
  convertUnit,
  formatQuantity,
} from './units'

describe('UNIT_ALIASES', () => {
  it('should map plural forms to canonical names', () => {
    expect(UNIT_ALIASES['tablespoons']).toBe('tbsp')
    expect(UNIT_ALIASES['teaspoons']).toBe('tsp')
    expect(UNIT_ALIASES['cups']).toBe('cup')
    expect(UNIT_ALIASES['liters']).toBe('L')
    expect(UNIT_ALIASES['grams']).toBe('g')
    expect(UNIT_ALIASES['kilograms']).toBe('kg')
    expect(UNIT_ALIASES['ounces']).toBe('oz')
    expect(UNIT_ALIASES['pounds']).toBe('lb')
  })

  it('should map singular forms to canonical names', () => {
    expect(UNIT_ALIASES['tablespoon']).toBe('tbsp')
    expect(UNIT_ALIASES['teaspoon']).toBe('tsp')
    expect(UNIT_ALIASES['liter']).toBe('L')
    expect(UNIT_ALIASES['gram']).toBe('g')
    expect(UNIT_ALIASES['kilogram']).toBe('kg')
    expect(UNIT_ALIASES['ounce']).toBe('oz')
    expect(UNIT_ALIASES['pound']).toBe('lb')
  })

  it('should map abbreviations to canonical names', () => {
    expect(UNIT_ALIASES['T']).toBe('tbsp')
    expect(UNIT_ALIASES['t']).toBe('tsp')
    expect(UNIT_ALIASES['c']).toBe('cup')
    expect(UNIT_ALIASES['mL']).toBe('ml')
    expect(UNIT_ALIASES['l']).toBe('L')
    expect(UNIT_ALIASES['lbs']).toBe('lb')
  })
})

describe('CANONICAL_UNITS', () => {
  it('should have volume units', () => {
    expect(CANONICAL_UNITS.volume).toContain('tsp')
    expect(CANONICAL_UNITS.volume).toContain('tbsp')
    expect(CANONICAL_UNITS.volume).toContain('cup')
    expect(CANONICAL_UNITS.volume).toContain('ml')
    expect(CANONICAL_UNITS.volume).toContain('L')
  })

  it('should have weight units', () => {
    expect(CANONICAL_UNITS.weight).toContain('g')
    expect(CANONICAL_UNITS.weight).toContain('kg')
    expect(CANONICAL_UNITS.weight).toContain('oz')
    expect(CANONICAL_UNITS.weight).toContain('lb')
  })

  it('should have count units', () => {
    expect(CANONICAL_UNITS.count).toContain('piece')
    expect(CANONICAL_UNITS.count).toContain('dozen')
  })
})

describe('SELECTABLE_UNITS', () => {
  it('should be an array of objects with value, label, and category', () => {
    expect(Array.isArray(SELECTABLE_UNITS)).toBe(true)
    SELECTABLE_UNITS.forEach((unit) => {
      expect(unit).toHaveProperty('value')
      expect(unit).toHaveProperty('label')
      expect(unit).toHaveProperty('category')
      expect(['volume', 'weight', 'count']).toContain(unit.category)
    })
  })

  it('should include common units', () => {
    const values = SELECTABLE_UNITS.map((u) => u.value)
    expect(values).toContain('tsp')
    expect(values).toContain('tbsp')
    expect(values).toContain('cup')
    expect(values).toContain('g')
    expect(values).toContain('kg')
    expect(values).toContain('piece')
  })
})

describe('normalizeUnit', () => {
  it('should normalize plural forms to canonical names', () => {
    expect(normalizeUnit('tablespoons')).toBe('tbsp')
    expect(normalizeUnit('teaspoons')).toBe('tsp')
    expect(normalizeUnit('cups')).toBe('cup')
    expect(normalizeUnit('grams')).toBe('g')
    expect(normalizeUnit('ounces')).toBe('oz')
  })

  it('should normalize singular forms to canonical names', () => {
    expect(normalizeUnit('tablespoon')).toBe('tbsp')
    expect(normalizeUnit('teaspoon')).toBe('tsp')
    expect(normalizeUnit('gram')).toBe('g')
    expect(normalizeUnit('ounce')).toBe('oz')
  })

  it('should normalize abbreviations', () => {
    expect(normalizeUnit('T')).toBe('tbsp')
    expect(normalizeUnit('t')).toBe('tsp')
    expect(normalizeUnit('c')).toBe('cup')
    expect(normalizeUnit('lbs')).toBe('lb')
  })

  it('should be case insensitive', () => {
    expect(normalizeUnit('CUPS')).toBe('cup')
    expect(normalizeUnit('Tablespoon')).toBe('tbsp')
    expect(normalizeUnit('GRAMS')).toBe('g')
  })

  it('should return canonical units unchanged', () => {
    expect(normalizeUnit('tsp')).toBe('tsp')
    expect(normalizeUnit('tbsp')).toBe('tbsp')
    expect(normalizeUnit('cup')).toBe('cup')
    expect(normalizeUnit('g')).toBe('g')
  })

  it('should trim whitespace', () => {
    expect(normalizeUnit('  cups  ')).toBe('cup')
    expect(normalizeUnit(' tbsp ')).toBe('tbsp')
  })

  it('should return original for unknown units', () => {
    expect(normalizeUnit('pinch')).toBe('pinch')
    expect(normalizeUnit('bunch')).toBe('bunch')
  })
})

describe('getUnitCategory', () => {
  it('should return volume for volume units', () => {
    expect(getUnitCategory('tsp')).toBe('volume')
    expect(getUnitCategory('tbsp')).toBe('volume')
    expect(getUnitCategory('cup')).toBe('volume')
    expect(getUnitCategory('ml')).toBe('volume')
    expect(getUnitCategory('L')).toBe('volume')
  })

  it('should return weight for weight units', () => {
    expect(getUnitCategory('g')).toBe('weight')
    expect(getUnitCategory('kg')).toBe('weight')
    expect(getUnitCategory('oz')).toBe('weight')
    expect(getUnitCategory('lb')).toBe('weight')
  })

  it('should return count for count units', () => {
    expect(getUnitCategory('piece')).toBe('count')
    expect(getUnitCategory('dozen')).toBe('count')
  })

  it('should normalize unit before checking category', () => {
    expect(getUnitCategory('cups')).toBe('volume')
    expect(getUnitCategory('tablespoons')).toBe('volume')
    expect(getUnitCategory('grams')).toBe('weight')
    expect(getUnitCategory('ounces')).toBe('weight')
  })

  it('should return null for unknown units', () => {
    expect(getUnitCategory('pinch')).toBe(null)
    expect(getUnitCategory('bunch')).toBe(null)
    expect(getUnitCategory('')).toBe(null)
  })
})

describe('canConvert', () => {
  it('should return true for same category conversions', () => {
    expect(canConvert('tsp', 'tbsp')).toBe(true)
    expect(canConvert('cup', 'ml')).toBe(true)
    expect(canConvert('g', 'kg')).toBe(true)
    expect(canConvert('oz', 'lb')).toBe(true)
  })

  it('should return false for different category conversions', () => {
    expect(canConvert('cup', 'g')).toBe(false)
    expect(canConvert('tbsp', 'oz')).toBe(false)
    expect(canConvert('piece', 'cup')).toBe(false)
  })

  it('should return false for unknown units', () => {
    expect(canConvert('pinch', 'cup')).toBe(false)
    expect(canConvert('cup', 'pinch')).toBe(false)
    expect(canConvert('pinch', 'bunch')).toBe(false)
  })

  it('should normalize units before checking', () => {
    expect(canConvert('cups', 'tablespoons')).toBe(true)
    expect(canConvert('grams', 'kilograms')).toBe(true)
  })

  it('should return false for count unit conversions (no cross-count conversion)', () => {
    expect(canConvert('piece', 'dozen')).toBe(true)
    expect(canConvert('dozen', 'piece')).toBe(true)
  })
})

describe('convertUnit', () => {
  describe('volume conversions', () => {
    it('should convert teaspoons to tablespoons', () => {
      const result = convertUnit(3, 'tsp', 'tbsp')
      expect(result).toBeCloseTo(1, 1)
    })

    it('should convert tablespoons to teaspoons', () => {
      const result = convertUnit(1, 'tbsp', 'tsp')
      expect(result).toBeCloseTo(3, 1)
    })

    it('should convert cups to ml', () => {
      const result = convertUnit(1, 'cup', 'ml')
      expect(result).toBeCloseTo(236.588, 2)
    })

    it('should convert ml to cups', () => {
      const result = convertUnit(236.588, 'ml', 'cup')
      expect(result).toBeCloseTo(1, 2)
    })

    it('should convert liters to ml', () => {
      const result = convertUnit(1, 'L', 'ml')
      expect(result).toBeCloseTo(1000, 1)
    })

    it('should convert ml to liters', () => {
      const result = convertUnit(1000, 'ml', 'L')
      expect(result).toBeCloseTo(1, 2)
    })

    it('should convert cups to tablespoons', () => {
      const result = convertUnit(1, 'cup', 'tbsp')
      expect(result).toBeCloseTo(16, 1)
    })

    it('should convert tablespoons to cups', () => {
      const result = convertUnit(16, 'tbsp', 'cup')
      expect(result).toBeCloseTo(1, 1)
    })
  })

  describe('weight conversions', () => {
    it('should convert grams to kilograms', () => {
      const result = convertUnit(1000, 'g', 'kg')
      expect(result).toBeCloseTo(1, 2)
    })

    it('should convert kilograms to grams', () => {
      const result = convertUnit(1, 'kg', 'g')
      expect(result).toBeCloseTo(1000, 1)
    })

    it('should convert ounces to grams', () => {
      const result = convertUnit(1, 'oz', 'g')
      expect(result).toBeCloseTo(28.3495, 2)
    })

    it('should convert grams to ounces', () => {
      const result = convertUnit(28.3495, 'g', 'oz')
      expect(result).toBeCloseTo(1, 2)
    })

    it('should convert pounds to grams', () => {
      const result = convertUnit(1, 'lb', 'g')
      expect(result).toBeCloseTo(453.592, 2)
    })

    it('should convert grams to pounds', () => {
      const result = convertUnit(453.592, 'g', 'lb')
      expect(result).toBeCloseTo(1, 2)
    })

    it('should convert pounds to ounces', () => {
      const result = convertUnit(1, 'lb', 'oz')
      expect(result).toBeCloseTo(16, 1)
    })

    it('should convert ounces to pounds', () => {
      const result = convertUnit(16, 'oz', 'lb')
      expect(result).toBeCloseTo(1, 1)
    })
  })

  describe('count conversions', () => {
    it('should convert pieces to dozen', () => {
      const result = convertUnit(12, 'piece', 'dozen')
      expect(result).toBeCloseTo(1, 2)
    })

    it('should convert dozen to pieces', () => {
      const result = convertUnit(1, 'dozen', 'piece')
      expect(result).toBeCloseTo(12, 1)
    })
  })

  it('should return null for cross-category conversions', () => {
    expect(convertUnit(1, 'cup', 'g')).toBe(null)
    expect(convertUnit(1, 'tbsp', 'oz')).toBe(null)
    expect(convertUnit(1, 'piece', 'cup')).toBe(null)
  })

  it('should return null for unknown units', () => {
    expect(convertUnit(1, 'pinch', 'cup')).toBe(null)
    expect(convertUnit(1, 'cup', 'pinch')).toBe(null)
  })

  it('should normalize units before converting', () => {
    const result = convertUnit(1, 'cups', 'tablespoons')
    expect(result).toBeCloseTo(16, 1)
  })

  it('should return same value when converting to same unit', () => {
    expect(convertUnit(5, 'cup', 'cup')).toBe(5)
    expect(convertUnit(100, 'g', 'g')).toBe(100)
  })
})

describe('formatQuantity', () => {
  it('should format whole numbers without decimals', () => {
    expect(formatQuantity(1)).toBe('1')
    expect(formatQuantity(5)).toBe('5')
    expect(formatQuantity(100)).toBe('100')
  })

  it('should format common fractions with unicode characters', () => {
    expect(formatQuantity(0.5)).toBe('\u00bd')
    expect(formatQuantity(0.25)).toBe('\u00bc')
    expect(formatQuantity(0.75)).toBe('\u00be')
    expect(formatQuantity(0.333)).toBe('\u2153')
    expect(formatQuantity(0.667)).toBe('\u2154')
  })

  it('should format mixed numbers with fractions', () => {
    expect(formatQuantity(1.5)).toBe('1\u00bd')
    expect(formatQuantity(2.25)).toBe('2\u00bc')
    expect(formatQuantity(3.75)).toBe('3\u00be')
  })

  it('should format decimal numbers when not matching common fractions', () => {
    const result = formatQuantity(1.43)
    expect(result).toMatch(/1\.43/)
  })

  it('should handle zero', () => {
    expect(formatQuantity(0)).toBe('0')
  })

  it('should handle very small fractions', () => {
    expect(formatQuantity(0.125)).toBe('\u215b')
    expect(formatQuantity(0.375)).toBe('\u215c')
    expect(formatQuantity(0.625)).toBe('\u215d')
    expect(formatQuantity(0.875)).toBe('\u215e')
  })

  it('should return absolute value for negative numbers (cooking quantities are positive)', () => {
    expect(formatQuantity(-1)).toBe('1')
    expect(formatQuantity(-1.5)).toBe('1\u00bd')
    expect(formatQuantity(-0.5)).toBe('\u00bd')
    expect(formatQuantity(-2.25)).toBe('2\u00bc')
  })
})
