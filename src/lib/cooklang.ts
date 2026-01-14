export interface ParsedIngredient {
  name: string
  quantity?: number
  unit?: string
}

export interface ParsedRecipe {
  title: string
  ingredients: ParsedIngredient[]
  steps: string[]
}

// Matches @ingredient, @ingredient{}, @ingredient{quantity}, @ingredient{quantity%unit}
const INGREDIENT_REGEX = /@([^@#~{}]+?)(?:\{([^}]*)\})?(?=\s|$|[.,;:!?])/g

export function parseCooklang(source: string): ParsedRecipe {
  const lines = source.split("\n")
  const ingredients: ParsedIngredient[] = []
  const steps: string[] = []
  let title = ""

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("--")) continue

    // Metadata line (>> title: ...)
    if (trimmed.startsWith(">>")) {
      const match = trimmed.match(/^>>\s*title:\s*(.+)/i)
      if (match) {
        title = match[1].trim()
      }
      continue
    }

    // Section headers
    if (trimmed.startsWith("#")) {
      if (!title) {
        title = trimmed.replace(/^#+\s*/, "").trim()
      }
      continue
    }

    // Parse step and extract ingredients
    let step = trimmed
    let match

    INGREDIENT_REGEX.lastIndex = 0
    while ((match = INGREDIENT_REGEX.exec(trimmed)) !== null) {
      const name = match[1].trim()
      const specifier = match[2]

      let quantity: number | undefined
      let unit: string | undefined

      if (specifier) {
        if (specifier.includes("%")) {
          const [qtyStr, unitStr] = specifier.split("%")
          quantity = parseQuantity(qtyStr)
          unit = unitStr.trim() || undefined
        } else {
          quantity = parseQuantity(specifier)
        }
      }

      // Check if ingredient already exists
      const existing = ingredients.find(
        (i) => i.name.toLowerCase() === name.toLowerCase()
      )
      if (!existing) {
        ingredients.push({ name, quantity, unit })
      }
    }

    // Clean step text for display (remove Cooklang syntax)
    step = step
      .replace(/@([^@#~{}]+?)(?:\{[^}]*\})?/g, "$1") // @ingredient{...} -> ingredient
      .replace(/#([^#{}]+?)(?:\{[^}]*\})?/g, "$1")   // #cookware{...} -> cookware
      .replace(/~\{([^}]*)\}/g, "$1")                 // ~{timer} -> timer
      .trim()

    if (step) {
      steps.push(step)
    }
  }

  return { title, ingredients, steps }
}

function parseQuantity(str: string): number | undefined {
  const trimmed = str.trim()
  if (!trimmed) return undefined

  // Handle mixed numbers like "1 1/2" (must check before simple fractions)
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedMatch) {
    const whole = Number(mixedMatch[1])
    const num = Number(mixedMatch[2])
    const denom = Number(mixedMatch[3])
    if (!isNaN(whole) && !isNaN(num) && !isNaN(denom) && denom !== 0) {
      return whole + num / denom
    }
  }

  // Handle simple fractions like "1/2"
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/)
  if (fractionMatch) {
    const num = Number(fractionMatch[1])
    const denom = Number(fractionMatch[2])
    if (!isNaN(num) && !isNaN(denom) && denom !== 0) {
      return num / denom
    }
  }

  const num = Number(trimmed)
  return isNaN(num) ? undefined : num
}

export function ingredientToText(ing: ParsedIngredient): string {
  if (!ing.quantity && !ing.unit) return ing.name
  if (!ing.unit) return `${ing.quantity} ${ing.name}`
  return `${ing.quantity} ${ing.unit} ${ing.name}`
}
