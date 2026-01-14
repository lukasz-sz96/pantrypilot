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

export function parseCooklang(source: string): ParsedRecipe {
  const ingredients: ParsedIngredient[] = []
  const steps: string[] = []
  let title = ""

  let text = source

  text = text.replace(/\[-[\s\S]*?-\]/g, "")

  let inFrontMatter = false
  let frontMatterCount = 0

  const lines = text.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === "---") {
      if (i === 0 || (inFrontMatter && frontMatterCount === 1)) {
        inFrontMatter = !inFrontMatter
        frontMatterCount++
        continue
      }
    }
    if (inFrontMatter) continue

    if (!trimmed) continue

    if (trimmed.startsWith("--")) continue

    if (trimmed.startsWith(">>")) {
      const match = trimmed.match(/^>>\s*title:\s*(.+)/i)
      if (match) {
        title = match[1].trim()
      }
      continue
    }

    if (trimmed.startsWith(">")) continue

    if (/^=+\s/.test(trimmed) || /^=+$/.test(trimmed)) {
      continue
    }

    if (trimmed.startsWith("#")) {
      if (!title) {
        title = trimmed.replace(/^#+\s*/, "").trim()
      }
      continue
    }

    extractIngredients(trimmed, ingredients)

    const step = cleanStepText(trimmed)
    if (step) {
      steps.push(step)
    }
  }

  return { title, ingredients, steps }
}

function extractIngredients(text: string, ingredients: ParsedIngredient[]): void {
  const withBraces = /@([^@#~{}]+)\{([^}]*)\}/g
  let match

  while ((match = withBraces.exec(text)) !== null) {
    const name = match[1].trim()

    if (name.startsWith("./") || name.startsWith("../")) continue

    const specifier = match[2]
    const { quantity, unit } = parseSpecifier(specifier)

    addIngredient(ingredients, name, quantity, unit)
  }

  const processed = text.replace(/@[^@#~{}]+\{[^}]*\}/g, " ")

  const singleWord = /@(\w+)(?=\s|$|[.,;:!?'"])/g

  while ((match = singleWord.exec(processed)) !== null) {
    const name = match[1].trim()
    addIngredient(ingredients, name, undefined, undefined)
  }
}

function addIngredient(
  ingredients: ParsedIngredient[],
  name: string,
  quantity: number | undefined,
  unit: string | undefined
): void {
  const existing = ingredients.find(
    (i) => i.originalText.toLowerCase() === name.toLowerCase()
  )
  if (!existing) {
    ingredients.push({ originalText: name, quantity, unit })
  }
}

function parseSpecifier(specifier: string): { quantity?: number; unit?: string } {
  if (!specifier) return {}

  let spec = specifier.trim()

  if (spec.startsWith("=")) {
    spec = spec.slice(1).trim()
  }

  if (spec.includes("%")) {
    const [qtyStr, unitStr] = spec.split("%")
    return {
      quantity: parseQuantity(qtyStr),
      unit: unitStr.trim() || undefined,
    }
  }

  return { quantity: parseQuantity(spec) }
}

function parseQuantity(str: string): number | undefined {
  const trimmed = str.trim()
  if (!trimmed) return undefined

  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedMatch) {
    const whole = Number(mixedMatch[1])
    const num = Number(mixedMatch[2])
    const denom = Number(mixedMatch[3])
    if (!isNaN(whole) && !isNaN(num) && !isNaN(denom) && denom !== 0) {
      return whole + num / denom
    }
  }

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

function cleanStepText(text: string): string {
  return text
    .replace(/@([^@#~{}]+)\{[^}]*\}/g, "$1")
    .replace(/@(\w+)/g, "$1")
    .replace(/#([^#{}]+)\{[^}]*\}/g, "$1")
    .replace(/#(\w+)/g, "$1")
    .replace(/~([^~{}]*)\{[^}]*\}/g, "$1")
    .replace(/~\{[^}]*\}/g, "")
    .trim()
}

export function ingredientToText(ing: ParsedIngredient): string {
  if (!ing.quantity && !ing.unit) return ing.originalText
  if (!ing.unit) return `${ing.quantity} ${ing.originalText}`
  return `${ing.quantity} ${ing.unit} ${ing.originalText}`
}
