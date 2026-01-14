import { query, mutation, action } from "./_generated/server"
import { v } from "convex/values"

const parsedIngredientValidator = v.object({
  name: v.string(),
  quantity: v.optional(v.number()),
  unit: v.optional(v.string()),
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

export const importFromUrl = action({
  args: { url: v.string() },
  returns: v.object({
    cooklangSource: v.string(),
    title: v.string(),
  }),
  handler: async (_ctx, args) => {
    const cookMdUrl = `https://cook.md/${args.url}`
    const response = await fetch(cookMdUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch recipe: ${response.statusText}`)
    }
    const cooklangSource = await response.text()

    const lines = cooklangSource.split("\n")
    const titleLine = lines.find((l) => l.startsWith(">>") || l.startsWith("#"))
    const title = titleLine
      ? titleLine.replace(/^[>#\s]+/, "").trim()
      : new URL(args.url).pathname.split("/").pop() || "Imported Recipe"

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
