import { v } from 'convex/values'
import { internal } from './_generated/api'
import { action, internalQuery, mutation, query } from './_generated/server'

const parsedIngredientValidator = v.object({
  originalText: v.string(),
  quantity: v.optional(v.number()),
  unit: v.optional(v.string()),
  ingredientId: v.optional(v.id('ingredients')),
})

const recipeValidator = v.object({
  _id: v.id('recipes'),
  _creationTime: v.number(),
  userId: v.string(),
  title: v.string(),
  source: v.optional(v.string()),
  cooklangSource: v.string(),
  parsedIngredients: v.array(parsedIngredientValidator),
  parsedSteps: v.array(v.string()),
  servings: v.optional(v.number()),
  image: v.optional(v.string()),
  category: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
})

export const list = query({
  args: {},
  returns: v.array(recipeValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    return await ctx.db
      .query('recipes')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect()
  },
})

export const get = query({
  args: { id: v.id('recipes') },
  returns: v.union(recipeValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const recipe = await ctx.db.get(args.id)
    if (!recipe || recipe.userId !== identity.subject) return null
    return recipe
  },
})

export const save = mutation({
  args: {
    title: v.string(),
    source: v.optional(v.string()),
    cooklangSource: v.string(),
    parsedIngredients: v.array(parsedIngredientValidator),
    parsedSteps: v.array(v.string()),
    servings: v.optional(v.number()),
    image: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  returns: v.id('recipes'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    return await ctx.db.insert('recipes', {
      userId: identity.subject,
      title: args.title,
      source: args.source,
      cooklangSource: args.cooklangSource,
      parsedIngredients: args.parsedIngredients,
      parsedSteps: args.parsedSteps,
      servings: args.servings,
      image: args.image,
      category: args.category,
      tags: args.tags,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('recipes'),
    title: v.optional(v.string()),
    cooklangSource: v.optional(v.string()),
    parsedIngredients: v.optional(v.array(parsedIngredientValidator)),
    parsedSteps: v.optional(v.array(v.string())),
    servings: v.optional(v.number()),
    image: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error('Recipe not found')
    }
    if (existing.userId !== identity.subject) throw new Error('Not authorized')
    const { id, ...updates } = args
    const patch: Record<string, unknown> = {}
    if (updates.title !== undefined) patch.title = updates.title
    if (updates.cooklangSource !== undefined)
      patch.cooklangSource = updates.cooklangSource
    if (updates.parsedIngredients !== undefined)
      patch.parsedIngredients = updates.parsedIngredients
    if (updates.parsedSteps !== undefined)
      patch.parsedSteps = updates.parsedSteps
    if (updates.servings !== undefined) patch.servings = updates.servings
    if (updates.image !== undefined) patch.image = updates.image
    if (updates.category !== undefined) patch.category = updates.category
    if (updates.tags !== undefined) patch.tags = updates.tags
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(id, patch)
    }
    return null
  },
})

export const remove = mutation({
  args: { id: v.id('recipes') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error('Recipe not found')
    }
    if (existing.userId !== identity.subject) throw new Error('Not authorized')
    await ctx.db.delete(args.id)
    return null
  },
})

interface RecipeSchema {
  '@type'?: string
  name: string
  recipeIngredient?: Array<string>
  recipeInstructions?: Array<string | { text: string; '@type'?: string }>
  recipeYield?: string | number
  prepTime?: string
  cookTime?: string
  totalTime?: string
  image?: string | Array<string>
  description?: string
}

function parseDuration(iso8601: string): string {
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (match) {
    const hours = match[1] ? parseInt(match[1]) : 0
    const minutes = match[2] ? parseInt(match[2]) : 0
    if (hours && minutes) return `${hours}h ${minutes}min`
    if (hours) return `${hours}h`
    if (minutes) return `${minutes}min`
  }
  return iso8601
}

function parseIngredientText(text: string): {
  name: string
  quantity?: string
  unit?: string
} {
  const match = text.match(
    /^([\d./\s]+)?\s*(cups?|tbsp?|tsp|teaspoons?|tablespoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|liters?|cloves?|cans?|packages?|pieces?)?\s*(.+)$/i,
  )
  if (match) {
    const quantity = match[1] ? match[1].trim() : undefined
    const unit = match[2] ? match[2].toLowerCase() : undefined
    const name = match[3] ? match[3].trim() : undefined
    if (name) return { name, quantity, unit }
  }
  return { name: text }
}

function recipeSchemaTooCooklang(schema: RecipeSchema): string {
  const lines: Array<string> = []

  lines.push('---')
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
  lines.push('---')
  lines.push('')

  if (schema.recipeIngredient) {
    for (const ing of schema.recipeIngredient) {
      const parsed = parseIngredientText(ing)
      if (parsed.quantity && parsed.unit) {
        lines.push(`@${parsed.name}{${parsed.quantity}%${parsed.unit}}`)
      } else if (parsed.quantity) {
        lines.push(`@${parsed.name}{${parsed.quantity}}`)
      } else {
        lines.push(`@${parsed.name}{}`)
      }
    }
    lines.push('')
  }

  if (schema.recipeInstructions) {
    for (const instruction of schema.recipeInstructions) {
      if (typeof instruction === 'string') {
        lines.push(instruction)
      } else if (instruction.text) {
        lines.push(instruction.text)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

function extractJsonLdRecipe(html: string): RecipeSchema | null {
  // Find all JSON-LD scripts
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )

  for (const match of jsonLdMatches) {
    try {
      const json = JSON.parse(match[1])

      // Handle @graph arrays
      if (json['@graph']) {
        for (const item of json['@graph']) {
          const types = Array.isArray(item['@type'])
            ? item['@type']
            : [item['@type']]
          if (types.includes('Recipe')) {
            return item as RecipeSchema
          }
        }
      }

      // Handle direct Recipe type
      if (json['@type'] === 'Recipe') {
        return json as RecipeSchema
      }

      // Handle array of types
      if (Array.isArray(json['@type']) && json['@type'].includes('Recipe')) {
        return json as RecipeSchema
      }

      // Handle array at root level
      if (Array.isArray(json)) {
        for (const item of json) {
          if (
            item['@type'] === 'Recipe' ||
            (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))
          ) {
            return item as RecipeSchema
          }
        }
      }
    } catch {
      // Skip invalid JSON
      continue
    }
  }

  return null
}

const COOKLANG_PROMPT = `Convert this recipe to Cooklang format. Output ONLY raw Cooklang, no markdown code blocks.

Rules:
- Start with metadata block using --- delimiters (title, servings)
- Each step is a separate paragraph with inline ingredients
- Use @ingredient{quantity%unit} for ingredients (e.g., @flour{2%cups})
- Use @ingredient{quantity} if no unit (e.g., @eggs{3})
- Use @ingredient{} if no quantity
- Use #cookware{} for equipment
- Use ~{time%unit} for timers
- Do NOT list ingredients separately - they must be inline within steps
- Do NOT include: water, ice, pasta water, or non-purchasable items

Example format:
---
title: Pasta
servings: 4
---

Boil @pasta{400%g} in salted water for ~{10%minutes}.

Heat @olive oil{2%tbsp} in a #pan.

Recipe to convert:
`

const DEFAULT_CATEGORIES = [
  'Asian',
  'Breads',
  'Breakfast',
  'Desserts',
  'Italian',
  'Lunches',
  'Main',
  'Mexican',
  'Sides',
  'Soups & Stews',
  'Vegetarian',
]

const TAGGING_PROMPT = `Analyze this recipe and return JSON only.

Existing categories: {categories}

Rules:
- Pick the best category from existing, OR suggest a new one if none fit
- Add relevant dietary tags based on ingredients
- Add cuisine tag if the recipe has a clear cuisine origin
- Only include tags you're confident about

Return format (JSON only, no markdown):
{"category": "category name", "isNewCategory": false, "tags": ["tag1", "tag2"]}

Dietary tags to consider: vegetarian, vegan, gluten-free, dairy-free, keto, low-carb, nut-free
Cuisine tags to consider: Italian, Mexican, Asian, French, Mediterranean, American, Indian, Japanese, Greek, Thai

Recipe title: {title}
Ingredients:
{ingredients}
`

function stripMarkdownCodeBlocks(text: string): string {
  let result = text.trim()
  result = result.replace(/^```\w*\n?/, '')
  result = result.replace(/\n?```$/, '')
  return result.trim()
}

function extractImageFromHtml(html: string): string | undefined {
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )

  for (const match of jsonLdMatches) {
    try {
      const json = JSON.parse(match[1])
      const items = json['@graph'] || (Array.isArray(json) ? json : [json])
      for (const item of items) {
        const types = Array.isArray(item['@type'])
          ? item['@type']
          : [item['@type']]
        if (types.includes('Recipe') && item.image) {
          const img = Array.isArray(item.image) ? item.image[0] : item.image
          if (typeof img === 'string') return img
          if (img?.url) return img.url
          if (img?.contentUrl) return img.contentUrl
        }
      }
    } catch {
      continue
    }
  }

  const ogMatch =
    html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    ) ||
    html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    )
  if (ogMatch) return ogMatch[1]

  return undefined
}

function extractTitleFromCooklang(cooklang: string): string | undefined {
  for (const line of cooklang.split('\n')) {
    if (line.toLowerCase().startsWith('title:')) {
      return line.substring(line.indexOf(':') + 1).trim()
    }
  }
  return undefined
}

async function generateTags(
  openrouterKey: string,
  title: string,
  ingredients: Array<string>,
  existingCategories: Array<string>,
): Promise<{
  category?: string
  isNewCategory?: boolean
  tags?: Array<string>
}> {
  const categories =
    existingCategories.length > 0 ? existingCategories : DEFAULT_CATEGORIES
  const prompt = TAGGING_PROMPT.replace('{categories}', categories.join(', '))
    .replace('{title}', title)
    .replace('{ingredients}', ingredients.join('\n'))

  try {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
        }),
      },
    )

    if (response.ok) {
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (content) {
        const cleaned = content.replace(/```json\n?|\n?```/g, '').trim()
        const parsed = JSON.parse(cleaned)
        return {
          category: parsed.category,
          isNewCategory: parsed.isNewCategory,
          tags: parsed.tags,
        }
      }
    }
  } catch {
    // Tagging failed, return empty
  }
  return {}
}

function extractIngredientsFromCooklang(cooklang: string): Array<string> {
  const ingredients: Array<string> = []
  const regex = /@([^{@]+)\{([^}]*)\}/g
  let match
  while ((match = regex.exec(cooklang)) !== null) {
    ingredients.push(match[1].trim())
  }
  return ingredients
}

export const importFromUrl = action({
  args: { url: v.string() },
  returns: v.object({
    cooklangSource: v.string(),
    title: v.string(),
    servings: v.optional(v.number()),
    image: v.optional(v.string()),
    suggestedCategory: v.optional(v.string()),
    isNewCategory: v.optional(v.boolean()),
    suggestedTags: v.optional(v.array(v.string())),
  }),
  handler: async (ctx, args) => {
    let parsedUrl: URL
    try {
      parsedUrl = new URL(args.url)
    } catch {
      throw new Error('Invalid URL provided')
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('URL must use http or https protocol')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    const response = await fetch(args.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PantryPilot/1.0)',
        Accept: 'text/html',
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`Failed to fetch recipe: ${response.statusText}`)
    }

    const html = await response.text()
    const image = extractImageFromHtml(html)

    const openrouterKey = process.env.OPENROUTER_API_KEY
    if (openrouterKey) {
      try {
        const aiResponse = await fetch(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openrouterKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model:
                process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
              messages: [
                {
                  role: 'user',
                  content: COOKLANG_PROMPT + html.slice(0, 50000),
                },
              ],
              max_tokens: 4000,
            }),
          },
        )

        if (aiResponse.ok) {
          const data = await aiResponse.json()
          const content = data.choices?.[0]?.message?.content
          if (content) {
            const cooklangSource = stripMarkdownCodeBlocks(content)
            const title =
              extractTitleFromCooklang(cooklangSource) || 'Imported Recipe'
            const servingsMatch = cooklangSource.match(/servings:\s*(\d+)/)
            const servings = servingsMatch
              ? parseInt(servingsMatch[1])
              : undefined

            const existingCategories = await ctx.runQuery(
              internal.recipes.listCategoryNames,
            )
            const ingredients = extractIngredientsFromCooklang(cooklangSource)
            const tagResult = await generateTags(
              openrouterKey,
              title,
              ingredients,
              existingCategories,
            )

            return {
              cooklangSource,
              title,
              servings,
              image,
              suggestedCategory: tagResult.category,
              isNewCategory: tagResult.isNewCategory,
              suggestedTags: tagResult.tags,
            }
          }
        }
      } catch {
        // Fall back to JSON-LD extraction
      }
    }

    const recipeSchema = extractJsonLdRecipe(html)

    if (!recipeSchema) {
      throw new Error(
        'No recipe data found. Set OPENROUTER_API_KEY in Convex for AI extraction.',
      )
    }

    const cooklangSource = recipeSchemaTooCooklang(recipeSchema)
    const title = recipeSchema.name

    let servings: number | undefined
    if (recipeSchema.recipeYield) {
      const yieldStr = String(recipeSchema.recipeYield)
      const parsed = parseInt(yieldStr)
      if (!isNaN(parsed) && parsed > 0) {
        servings = parsed
      }
    }

    let schemaImage: string | undefined
    if (recipeSchema.image) {
      schemaImage = Array.isArray(recipeSchema.image)
        ? recipeSchema.image[0]
        : recipeSchema.image
    }

    return { cooklangSource, title, servings, image: image || schemaImage }
  },
})

export const listCategoryNames = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const categories = await ctx.db.query('categories').collect()
    if (categories.length === 0) {
      return DEFAULT_CATEGORIES
    }
    return categories.map((c) => c.name)
  },
})

export const listCategories = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('categories'),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      icon: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query('categories').collect()
  },
})

export const getDefaultCategories = query({
  args: {},
  returns: v.array(v.string()),
  handler: () => {
    return DEFAULT_CATEGORIES
  },
})

export const createCategory = mutation({
  args: { name: v.string() },
  returns: v.id('categories'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const slug = args.name.toLowerCase().replace(/\s+/g, '-')
    const existing = await ctx.db
      .query('categories')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first()
    if (existing) return existing._id
    return await ctx.db.insert('categories', { name: args.name, slug })
  },
})

export const markCooked = mutation({
  args: {
    recipeId: v.id('recipes'),
    deductions: v.array(
      v.object({
        pantryItemId: v.id('pantryItems'),
        quantity: v.number(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    for (const deduction of args.deductions) {
      if (deduction.quantity < 0) {
        throw new Error('Deduction quantity cannot be negative')
      }
    }
    for (const deduction of args.deductions) {
      const item = await ctx.db.get(deduction.pantryItemId)
      if (item && item.userId === identity.subject) {
        const newQuantity = Math.max(0, item.quantity - deduction.quantity)
        await ctx.db.patch(deduction.pantryItemId, { quantity: newQuantity })
      }
    }
    return null
  },
})

export const generateTagsForRecipe = action({
  args: { recipeId: v.id('recipes') },
  returns: v.object({
    category: v.optional(v.string()),
    isNewCategory: v.boolean(),
    tags: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const recipe = await ctx.runQuery(internal.recipes.getRecipeInternal, {
      id: args.recipeId,
    })
    if (!recipe) throw new Error('Recipe not found')
    if (recipe.userId !== identity.subject) throw new Error('Not authorized')

    const openrouterKey = process.env.OPENROUTER_API_KEY
    if (!openrouterKey) {
      throw new Error('AI tagging requires OPENROUTER_API_KEY')
    }

    const existingCategories = await ctx.runQuery(internal.recipes.listCategoryNames)
    const ingredients = recipe.parsedIngredients.map((i) => i.originalText)

    const result = await generateTags(
      openrouterKey,
      recipe.title,
      ingredients,
      existingCategories,
    )

    return {
      category: result.category,
      isNewCategory: result.isNewCategory ?? false,
      tags: result.tags ?? [],
    }
  },
})

export const getRecipeInternal = internalQuery({
  args: { id: v.id('recipes') },
  returns: v.union(
    v.object({
      _id: v.id('recipes'),
      userId: v.string(),
      title: v.string(),
      parsedIngredients: v.array(
        v.object({
          originalText: v.string(),
          quantity: v.optional(v.number()),
          unit: v.optional(v.string()),
          ingredientId: v.optional(v.id('ingredients')),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.id)
    if (!recipe) return null
    return {
      _id: recipe._id,
      userId: recipe.userId,
      title: recipe.title,
      parsedIngredients: recipe.parsedIngredients,
    }
  },
})
