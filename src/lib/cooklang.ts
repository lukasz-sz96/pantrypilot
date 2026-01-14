import { Parser } from "@cooklang/cooklang"

export interface ParsedIngredient {
  originalText: string
  quantity?: number
  unit?: string
  ingredientId?: string
}

export interface ParsedRecipe {
  title: string
  ingredients: ParsedIngredient[]
  steps: string[]
}

const parser = new Parser()

// Extract quantity value from the parser's structure
function extractQuantityValue(
  quantity: unknown
): { quantity?: number; unit?: string } {
  if (!quantity || typeof quantity !== 'object') return {}

  const q = quantity as Record<string, unknown>
  let qtyValue: number | undefined
  let unit: string | undefined

  // Handle various possible quantity structures from the parser
  // Structure could be: { value: number } or { value: { value: number } } or { value: { value: { value: number } } }
  if (q.value !== undefined) {
    if (typeof q.value === 'number') {
      qtyValue = q.value
    } else if (typeof q.value === 'string') {
      const parsed = parseFloat(q.value)
      if (!isNaN(parsed)) qtyValue = parsed
    } else if (typeof q.value === 'object' && q.value !== null) {
      const v = q.value as Record<string, unknown>
      if (typeof v.value === 'number') {
        qtyValue = v.value
      } else if (typeof v.value === 'object' && v.value !== null) {
        const vv = v.value as Record<string, unknown>
        if (typeof vv.value === 'number') {
          qtyValue = vv.value
        }
      }
    }
  }

  // Extract unit
  if (typeof q.unit === 'string') {
    unit = q.unit
  }

  return {
    quantity: qtyValue,
    unit: unit || undefined,
  }
}

export function parseCooklang(source: string): ParsedRecipe {
  const result = parser.parse(source)
  const recipe = result.recipe

  const title = result.metadata?.title || ""

  const ingredients: ParsedIngredient[] = []
  if (recipe.ingredients) {
    for (const ing of recipe.ingredients) {
      const extracted = extractQuantityValue(ing.quantity)
      // Clean up ingredient name - remove leading "/" or other artifacts
      let name = ing.name || ''
      if (name.startsWith('/')) {
        name = name.slice(1).trim()
      }
      // Ensure quantity is a number, not an object
      const quantity = typeof extracted.quantity === 'number' ? extracted.quantity : undefined
      const unit = typeof extracted.unit === 'string' ? extracted.unit : undefined
      ingredients.push({
        originalText: name,
        quantity,
        unit,
      })
    }
  }

  const steps: string[] = []
  if (recipe.sections) {
    for (const section of recipe.sections) {
      if (section.content) {
        for (const content of section.content) {
          if (content.type === "step" && content.value?.items) {
            const stepParts: string[] = []

            for (const item of content.value.items) {
              if (item.type === "text") {
                stepParts.push(item.value)
              } else if (item.type === "ingredient") {
                const ing = recipe.ingredients?.[item.index]
                if (ing) stepParts.push(ing.name)
              } else if (item.type === "cookware") {
                const cw = recipe.cookware?.[item.index]
                if (cw) stepParts.push(cw.name)
              } else if (item.type === "timer") {
                const timer = recipe.timers?.[item.index]
                if (timer?.quantity) {
                  const { quantity: value, unit } = extractQuantityValue(timer.quantity)
                  if (value && unit) {
                    stepParts.push(`${value} ${unit}`)
                  } else if (value) {
                    stepParts.push(String(value))
                  }
                }
              }
              // Skip inlineQuantity items - they're handled elsewhere
            }

            const stepText = stepParts.join("").trim()
            if (stepText) {
              steps.push(stepText)
            }
          }
        }
      }
    }
  }

  return { title, ingredients, steps }
}

export function ingredientToText(ing: ParsedIngredient): string {
  if (!ing.quantity && !ing.unit) return ing.originalText
  if (!ing.unit) return `${ing.quantity} ${ing.originalText}`
  return `${ing.quantity} ${ing.unit} ${ing.originalText}`
}

// Parse a user-entered ingredient line like "2 cans of tomatoes" into components
export function parseIngredientLine(text: string): {
  name: string
  quantity?: number
  unit?: string
} {
  const trimmed = text.trim()
  if (!trimmed) return { name: text }

  // Pattern: "2 cans of tomatoes", "200g feta cheese", "1/2 cup flour"
  // Match: quantity, optional unit, "of" (optional), ingredient name
  const match = trimmed.match(
    /^([\d./½¼¾⅓⅔⅛]+)\s*(cans?|cups?|tbsps?|tsps?|teaspoons?|tablespoons?|ounces?|oz|pounds?|lbs?|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|cloves?|packages?|pieces?|slices?|bunch(?:es)?|heads?|stalks?|sprigs?|pinch(?:es)?|large|medium|small)?\s*(?:of\s+)?(.+)$/i
  )

  if (match) {
    const quantityStr = match[1]
    const unit = match[2]?.toLowerCase()
    const name = match[3]?.trim()

    // Parse quantity - handle fractions
    let quantity: number | undefined
    if (quantityStr.includes('/')) {
      const parts = quantityStr.split('/')
      if (parts.length === 2) {
        const num = parseFloat(parts[0])
        const denom = parseFloat(parts[1])
        if (!isNaN(num) && !isNaN(denom) && denom !== 0) {
          quantity = num / denom
        }
      }
    } else {
      // Handle unicode fractions
      const fractionMap: Record<string, number> = {
        '½': 0.5, '¼': 0.25, '¾': 0.75,
        '⅓': 1/3, '⅔': 2/3, '⅛': 0.125
      }
      if (fractionMap[quantityStr]) {
        quantity = fractionMap[quantityStr]
      } else {
        quantity = parseFloat(quantityStr)
        if (isNaN(quantity)) quantity = undefined
      }
    }

    if (name) {
      return { name, quantity, unit }
    }
  }

  // No quantity found, return just the name
  return { name: trimmed }
}

// Generate cooklang source from parsed ingredients and steps
export function generateCooklang(
  title: string,
  ingredients: { name: string; quantity?: number; unit?: string }[],
  steps: string[]
): string {
  const lines: string[] = []

  // Metadata
  lines.push('---')
  lines.push(`title: ${title}`)
  lines.push('---')
  lines.push('')

  // Generate steps with inline ingredients
  // For manual entry, just put the steps as-is
  for (const step of steps) {
    lines.push(step)
    lines.push('')
  }

  return lines.join('\n')
}

// Convert JSON-LD Recipe schema to Cooklang format
export function recipeSchemaTooCooklang(schema: RecipeSchema): string {
  const lines: string[] = []

  // YAML front matter
  lines.push("---")
  lines.push(`title: ${schema.name}`)
  if (schema.recipeYield) {
    lines.push(`servings: ${schema.recipeYield}`)
  }
  if (schema.prepTime) {
    lines.push(`prep: ${parseDuration(schema.prepTime)}`)
  }
  if (schema.cookTime) {
    lines.push(`cook: ${parseDuration(schema.cookTime)}`)
  }
  lines.push("---")
  lines.push("")

  // Ingredients as cooklang
  if (schema.recipeIngredient) {
    for (const ing of schema.recipeIngredient) {
      const parsed = parseIngredientText(ing)
      // Escape ingredient name if it contains special characters
      const needsQuotes = /[(){}@#~]/.test(parsed.name)
      const escapedName = needsQuotes ? `"${parsed.name}"` : parsed.name
      if (parsed.quantity && parsed.unit) {
        lines.push(`@${escapedName}{${parsed.quantity}%${parsed.unit}}`)
      } else if (parsed.quantity) {
        lines.push(`@${escapedName}{${parsed.quantity}}`)
      } else {
        lines.push(`@${escapedName}{}`)
      }
    }
    lines.push("")
  }

  // Instructions as steps
  if (schema.recipeInstructions) {
    for (const instruction of schema.recipeInstructions) {
      if (typeof instruction === "string") {
        lines.push(instruction)
      } else if (instruction.text) {
        lines.push(instruction.text)
      }
      lines.push("")
    }
  }

  return lines.join("\n")
}

export interface RecipeSchema {
  "@type"?: string
  name: string
  recipeIngredient?: string[]
  recipeInstructions?: (string | { text: string })[]
  recipeYield?: string | number
  prepTime?: string
  cookTime?: string
  totalTime?: string
  image?: string | string[]
  description?: string
}

function parseDuration(iso8601: string): string {
  // Parse ISO 8601 duration like PT30M, PT1H30M
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (match) {
    const hours = match[1] ? parseInt(match[1]) : 0
    const minutes = match[2] ? parseInt(match[2]) : 0
    if (hours && minutes) {
      return `${hours}h ${minutes}min`
    } else if (hours) {
      return `${hours}h`
    } else if (minutes) {
      return `${minutes}min`
    }
  }
  return iso8601
}

function parseIngredientText(text: string): {
  name: string
  quantity?: string
  unit?: string
} {
  // Clean up common patterns first
  let cleaned = text
    .replace(/\s*,?\s*\([^)]*note[^)]*\)/gi, '') // Remove (Note X) references
    .replace(/\s*,?\s*\([^)]*weight[^)]*\)/gi, '') // Remove weight notes
    .replace(/\s*\(optional\)/gi, '') // Remove (optional)
    .trim()

  // Try to parse "6 oz guanciale" or "2 cups flour" etc.
  const match = cleaned.match(
    /^([\d./½¼¾⅓⅔⅛]+)\s*(cups?|tbsps?|tsps?|teaspoons?|tablespoons?|ounces?|oz|pounds?|lbs?|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|cloves?|cans?|packages?|pieces?|large|medium|small)\s+(.+)$/i
  )

  if (match) {
    const quantity = match[1]?.trim()
    const unit = match[2]?.toLowerCase()
    let name = match[3]?.trim() || ''

    // Extract main ingredient from alternatives like "guanciale (pancetta or block bacon)"
    // Keep just the first/main ingredient name
    const altMatch = name.match(/^([^(]+?)(?:\s*\([^)]*(?:or|substitute)[^)]*\))?/i)
    if (altMatch && altMatch[1]) {
      name = altMatch[1].trim()
    }

    // Clean up any remaining issues
    name = name
      .replace(/\s*,\s*$/, '') // Remove trailing comma
      .replace(/\s*,\s*finely.*$/i, '') // Remove ", finely chopped" etc
      .replace(/\s*,\s*freshly.*$/i, '') // Remove ", freshly ground" etc
      .trim()

    if (name) {
      return { name, quantity, unit }
    }
  }

  // Fallback: try without unit (e.g., "2 eggs")
  const simpleMatch = cleaned.match(/^([\d./½¼¾⅓⅔⅛]+)\s+(.+)$/i)
  if (simpleMatch) {
    let name = simpleMatch[2].trim()
    const altMatch = name.match(/^([^(]+?)(?:\s*\([^)]*(?:or|substitute)[^)]*\))?/i)
    if (altMatch && altMatch[1]) {
      name = altMatch[1].trim()
    }
    name = name.replace(/\s*,\s*$/, '').trim()
    if (name) {
      return { name, quantity: simpleMatch[1].trim() }
    }
  }

  // Final fallback: just clean the name
  let name = cleaned
    .replace(/\s*,\s*$/, '')
    .trim()

  // Try to extract main ingredient from alternatives
  const altMatch = name.match(/^([^(]+?)(?:\s*\([^)]*(?:or|substitute)[^)]*\))?/i)
  if (altMatch && altMatch[1]) {
    name = altMatch[1].trim()
  }

  return { name: name || text }
}
