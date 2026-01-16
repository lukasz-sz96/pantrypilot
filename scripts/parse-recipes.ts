import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface ParsedRecipe {
  title: string
  category: string
  cooklangSource: string
  parsedIngredients: Array<{
    originalText: string
    quantity?: number
    unit?: string
  }>
  parsedSteps: Array<string>
  servings?: number
  image?: string
  sourceUrl?: string
}

const categoryMap: Record<string, string> = {
  'asian': 'Asian',
  'breads': 'Breads',
  'breakfast': 'Breakfast',
  'desserts': 'Desserts',
  'italian': 'Italian',
  'lunches': 'Lunches',
  'main': 'Main',
  'mexican': 'Mexican',
  'sides': 'Sides',
  'soups-and-stews': 'Soups & Stews',
  'vegetarian': 'Vegetarian',
}

function parseCooklangFile(content: string, filename: string): Omit<ParsedRecipe, 'category'> {
  const lines = content.split('\n')
  let title = filename.replace('.cook', '')
  let servings: number | undefined
  let image: string | undefined
  let sourceUrl: string | undefined
  const ingredients: ParsedRecipe['parsedIngredients'] = []
  const steps: Array<string> = []
  const seenIngredients = new Set<string>()

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('>> source:')) {
      sourceUrl = trimmed.substring('>> source:'.length).trim()
      continue
    }
    if (trimmed.startsWith('>> image:')) {
      image = trimmed.substring('>> image:'.length).trim()
      continue
    }
    if (trimmed.startsWith('>> servings:')) {
      const val = parseInt(trimmed.substring('>> servings:'.length).trim())
      if (!isNaN(val)) servings = val
      continue
    }
    if (trimmed.startsWith('>>')) {
      continue
    }

    if (trimmed.length === 0) continue

    const ingredientRegex = /@([^{@]+)\{([^}]*)\}/g
    let match
    while ((match = ingredientRegex.exec(trimmed)) !== null) {
      const name = match[1].trim()
      const spec = match[2]

      const key = name.toLowerCase()
      if (seenIngredients.has(key)) continue
      seenIngredients.add(key)

      let quantity: number | undefined
      let unit: string | undefined
      if (spec) {
        if (spec.includes('%')) {
          const [q, u] = spec.split('%')
          const parsed = parseFloat(q.replace(/[^\d.\/]/g, ''))
          if (q.includes('/')) {
            const [num, denom] = q.split('/')
            quantity = parseFloat(num) / parseFloat(denom)
          } else {
            quantity = parsed || undefined
          }
          unit = u || undefined
        } else {
          const parsed = parseFloat(spec.replace(/[^\d.\/]/g, ''))
          if (spec.includes('/')) {
            const [num, denom] = spec.split('/')
            quantity = parseFloat(num) / parseFloat(denom)
          } else {
            quantity = parsed || undefined
          }
        }
      }
      ingredients.push({ originalText: name, quantity, unit })
    }

    const stepText = trimmed
      .replace(/@([^{@]+)\{([^}]*)\}/g, '$1')
      .replace(/#([^{]+)\{([^}]*)\}/g, '$1')
      .replace(/~\{([^}]*)\}/g, (_, c) => c.replace('%', ' '))
    if (stepText.trim().length > 0 && !stepText.startsWith('--')) {
      steps.push(stepText.trim())
    }
  }

  return {
    title,
    cooklangSource: content,
    parsedIngredients: ingredients,
    parsedSteps: steps,
    servings,
    image,
    sourceUrl
  }
}

function main() {
  const recipesDir = path.join(__dirname, '..', 'recipes')
  const categories = fs.readdirSync(recipesDir).filter(f =>
    fs.statSync(path.join(recipesDir, f)).isDirectory()
  )

  const allRecipes: ParsedRecipe[] = []

  for (const categoryDir of categories) {
    const category = categoryMap[categoryDir] || categoryDir
    const fullPath = path.join(recipesDir, categoryDir)
    const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.cook'))

    for (const file of files) {
      const content = fs.readFileSync(path.join(fullPath, file), 'utf-8')
      const parsed = parseCooklangFile(content, file)
      allRecipes.push({
        ...parsed,
        category,
      })
    }
  }

  const output = {
    recipes: allRecipes,
    generatedAt: new Date().toISOString()
  }

  fs.writeFileSync(
    path.join(__dirname, '..', 'convex', 'seedData.json'),
    JSON.stringify(output, null, 2)
  )

  console.log(`Parsed ${allRecipes.length} recipes from ${categories.length} categories`)
  console.log('Categories:', categories.map(c => categoryMap[c] || c).join(', '))

  const withImages = allRecipes.filter(r => r.image).length
  console.log(`Recipes with images: ${withImages}`)

  console.log('\nOutput written to convex/seedData.json')
}

main()
