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
  userId: v.string(),
  title: v.string(),
  source: v.optional(v.string()),
  cooklangSource: v.string(),
  parsedIngredients: v.array(parsedIngredientValidator),
  parsedSteps: v.array(v.string()),
  servings: v.optional(v.number()),
  image: v.optional(v.string()),
})

export const list = query({
  args: {},
  returns: v.array(recipeValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    return await ctx.db
      .query("recipes")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect()
  },
})

export const get = query({
  args: { id: v.id("recipes") },
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
  },
  returns: v.id("recipes"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    return await ctx.db.insert("recipes", {
      userId: identity.subject,
      title: args.title,
      source: args.source,
      cooklangSource: args.cooklangSource,
      parsedIngredients: args.parsedIngredients,
      parsedSteps: args.parsedSteps,
      servings: args.servings,
      image: args.image,
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
    servings: v.optional(v.number()),
    image: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error("Recipe not found")
    }
    if (existing.userId !== identity.subject) throw new Error("Not authorized")
    const { id, ...updates } = args
    const patch: Record<string, unknown> = {}
    if (updates.title !== undefined) patch.title = updates.title
    if (updates.cooklangSource !== undefined) patch.cooklangSource = updates.cooklangSource
    if (updates.parsedIngredients !== undefined) patch.parsedIngredients = updates.parsedIngredients
    if (updates.parsedSteps !== undefined) patch.parsedSteps = updates.parsedSteps
    if (updates.servings !== undefined) patch.servings = updates.servings
    if (updates.image !== undefined) patch.image = updates.image
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(id, patch)
    }
    return null
  },
})

export const remove = mutation({
  args: { id: v.id("recipes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error("Recipe not found")
    }
    if (existing.userId !== identity.subject) throw new Error("Not authorized")
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

function stripMarkdownCodeBlocks(text: string): string {
  let result = text.trim()
  result = result.replace(/^```\w*\n?/, '')
  result = result.replace(/\n?```$/, '')
  return result.trim()
}

function extractImageFromHtml(html: string): string | undefined {
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )

  for (const match of jsonLdMatches) {
    try {
      const json = JSON.parse(match[1])
      const items = json["@graph"] || (Array.isArray(json) ? json : [json])
      for (const item of items) {
        const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]]
        if (types.includes("Recipe") && item.image) {
          const img = Array.isArray(item.image) ? item.image[0] : item.image
          if (typeof img === "string") return img
          if (img?.url) return img.url
          if (img?.contentUrl) return img.contentUrl
        }
      }
    } catch {
      continue
    }
  }

  const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
  if (ogMatch) return ogMatch[1]

  return undefined
}

function extractTitleFromCooklang(cooklang: string): string | undefined {
  for (const line of cooklang.split("\n")) {
    if (line.toLowerCase().startsWith("title:")) {
      return line.substring(line.indexOf(":") + 1).trim()
    }
  }
  return undefined
}

export const importFromUrl = action({
  args: { url: v.string() },
  returns: v.object({
    cooklangSource: v.string(),
    title: v.string(),
    servings: v.optional(v.number()),
    image: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    let parsedUrl: URL
    try {
      parsedUrl = new URL(args.url)
    } catch {
      throw new Error("Invalid URL provided")
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("URL must use http or https protocol")
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    const response = await fetch(args.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PantryPilot/1.0)",
        Accept: "text/html",
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
        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
            messages: [{ role: "user", content: COOKLANG_PROMPT + html.slice(0, 50000) }],
            max_tokens: 4000,
          }),
        })

        if (aiResponse.ok) {
          const data = await aiResponse.json()
          const content = data.choices?.[0]?.message?.content
          if (content) {
            const cooklangSource = stripMarkdownCodeBlocks(content)
            const title = extractTitleFromCooklang(cooklangSource) || "Imported Recipe"
            const servingsMatch = cooklangSource.match(/servings:\s*(\d+)/)
            const servings = servingsMatch ? parseInt(servingsMatch[1]) : undefined
            return { cooklangSource, title, servings, image }
          }
        }
      } catch {
        // Fall back to JSON-LD extraction
      }
    }

    const recipeSchema = extractJsonLdRecipe(html)

    if (!recipeSchema) {
      throw new Error("No recipe data found. Set OPENROUTER_API_KEY in Convex for AI extraction.")
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
      schemaImage = Array.isArray(recipeSchema.image) ? recipeSchema.image[0] : recipeSchema.image
    }

    return { cooklangSource, title, servings, image: image || schemaImage }
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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    for (const deduction of args.deductions) {
      if (deduction.quantity < 0) {
        throw new Error("Deduction quantity cannot be negative")
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
