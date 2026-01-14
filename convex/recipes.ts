import { query, mutation, action } from "./_generated/server"
import { v } from "convex/values"

const parsedIngredientValidator = v.object({
  originalText: v.string(),
  quantity: v.optional(v.number()),
  unit: v.optional(v.string()),
  ingredientId: v.optional(v.id("ingredients")),
})

const recipeValidator = v.object({
  _id: v.id("recipes"),
  _creationTime: v.number(),
  title: v.string(),
  source: v.optional(v.string()),
  cooklangSource: v.string(),
  parsedIngredients: v.array(parsedIngredientValidator),
  parsedSteps: v.array(v.string()),
})

export const list = query({
  args: {},
  returns: v.array(recipeValidator),
  handler: async (ctx) => {
    return await ctx.db.query("recipes").collect()
  },
})

export const get = query({
  args: { id: v.id("recipes") },
  returns: v.union(recipeValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const save = mutation({
  args: {
    title: v.string(),
    source: v.optional(v.string()),
    cooklangSource: v.string(),
    parsedIngredients: v.array(parsedIngredientValidator),
    parsedSteps: v.array(v.string()),
  },
  returns: v.id("recipes"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("recipes", {
      title: args.title,
      source: args.source,
      cooklangSource: args.cooklangSource,
      parsedIngredients: args.parsedIngredients,
      parsedSteps: args.parsedSteps,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("recipes"),
    title: v.optional(v.string()),
    cooklangSource: v.optional(v.string()),
    parsedIngredients: v.optional(v.array(parsedIngredientValidator)),
    parsedSteps: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const patch: Record<string, unknown> = {}
    if (updates.title !== undefined) patch.title = updates.title
    if (updates.cooklangSource !== undefined) patch.cooklangSource = updates.cooklangSource
    if (updates.parsedIngredients !== undefined) patch.parsedIngredients = updates.parsedIngredients
    if (updates.parsedSteps !== undefined) patch.parsedSteps = updates.parsedSteps
    await ctx.db.patch(id, patch)
    return null
  },
})

export const remove = mutation({
  args: { id: v.id("recipes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  },
})

interface RecipeSchema {
  "@type"?: string
  name: string
  recipeIngredient?: string[]
  recipeInstructions?: (string | { text: string; "@type"?: string })[]
  recipeYield?: string | number
  prepTime?: string
  cookTime?: string
  totalTime?: string
  image?: string | string[]
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
    /^([\d./\s]+)?\s*(cups?|tbsp?|tsp|teaspoons?|tablespoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|liters?|cloves?|cans?|packages?|pieces?)?\s*(.+)$/i
  )
  if (match) {
    const quantity = match[1]?.trim()
    const unit = match[2]?.toLowerCase()
    const name = match[3]?.trim()
    if (name) return { name, quantity, unit }
  }
  return { name: text }
}

function recipeSchemaTooCooklang(schema: RecipeSchema): string {
  const lines: string[] = []

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
    lines.push("")
  }

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

function extractJsonLdRecipe(html: string): RecipeSchema | null {
  // Find all JSON-LD scripts
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )

  for (const match of jsonLdMatches) {
    try {
      const json = JSON.parse(match[1])

      // Handle @graph arrays
      if (json["@graph"]) {
        for (const item of json["@graph"]) {
          const types = Array.isArray(item["@type"])
            ? item["@type"]
            : [item["@type"]]
          if (types.includes("Recipe")) {
            return item as RecipeSchema
          }
        }
      }

      // Handle direct Recipe type
      if (json["@type"] === "Recipe") {
        return json as RecipeSchema
      }

      // Handle array of types
      if (Array.isArray(json["@type"]) && json["@type"].includes("Recipe")) {
        return json as RecipeSchema
      }

      // Handle array at root level
      if (Array.isArray(json)) {
        for (const item of json) {
          if (
            item["@type"] === "Recipe" ||
            (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))
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

const COOKLANG_IMPORT_URL = "http://localhost:8090"

export const importFromUrl = action({
  args: { url: v.string() },
  returns: v.object({
    cooklangSource: v.string(),
    title: v.string(),
  }),
  handler: async (_ctx, args) => {
    try {
      const response = await fetch(`${COOKLANG_IMPORT_URL}/import/url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: args.url }),
      })

      if (response.ok) {
        const result = await response.json()
        return {
          cooklangSource: result.cooklang,
          title: result.title || "Imported Recipe",
        }
      }
    } catch {
      // Fall back to JSON-LD extraction
    }

    const response = await fetch(args.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PantryPilot/1.0)",
        Accept: "text/html",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch recipe: ${response.statusText}`)
    }

    const html = await response.text()
    const recipeSchema = extractJsonLdRecipe(html)

    if (!recipeSchema) {
      throw new Error("No recipe data found on this page.")
    }

    const cooklangSource = recipeSchemaTooCooklang(recipeSchema)
    const title = recipeSchema.name

    return { cooklangSource, title }
  },
})

export const markCooked = mutation({
  args: {
    recipeId: v.id("recipes"),
    deductions: v.array(
      v.object({
        pantryItemId: v.id("pantryItems"),
        quantity: v.number(),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const deduction of args.deductions) {
      const item = await ctx.db.get(deduction.pantryItemId)
      if (item) {
        const newQuantity = Math.max(0, item.quantity - deduction.quantity)
        await ctx.db.patch(deduction.pantryItemId, { quantity: newQuantity })
      }
    }
    return null
  },
})
