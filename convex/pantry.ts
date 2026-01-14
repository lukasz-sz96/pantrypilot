import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("pantryItems"),
      _creationTime: v.number(),
      ingredientId: v.id("ingredients"),
      quantity: v.number(),
      unit: v.string(),
      ingredient: v.object({
        _id: v.id("ingredients"),
        name: v.string(),
        aliases: v.optional(v.array(v.string())),
        category: v.string(),
        isStaple: v.boolean(),
        defaultUnit: v.string(),
      }),
    })
  ),
  handler: async (ctx) => {
    const items = await ctx.db.query("pantryItems").collect()
    const ingredients = await Promise.all(
      items.map((item) => ctx.db.get(item.ingredientId))
    )
    const result = []
    for (let i = 0; i < items.length; i++) {
      const ingredient = ingredients[i]
      if (ingredient) {
        result.push({
          ...items[i],
          ingredient: {
            _id: ingredient._id,
            name: ingredient.name,
            aliases: ingredient.aliases,
            category: ingredient.category,
            isStaple: ingredient.isStaple,
            defaultUnit: ingredient.defaultUnit,
          },
        })
      }
    }
    return result
  },
})

export const upsert = mutation({
  args: {
    ingredientId: v.id("ingredients"),
    quantity: v.number(),
    unit: v.string(),
  },
  returns: v.id("pantryItems"),
  handler: async (ctx, args) => {
    if (args.quantity < 0) {
      throw new Error("Quantity cannot be negative")
    }
    if (!args.unit.trim()) {
      throw new Error("Unit cannot be empty")
    }
    const ingredient = await ctx.db.get(args.ingredientId)
    if (!ingredient) {
      throw new Error("Ingredient not found")
    }
    const existing = await ctx.db
      .query("pantryItems")
      .withIndex("by_ingredient", (q) => q.eq("ingredientId", args.ingredientId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity: args.quantity,
        unit: args.unit,
      })
      return existing._id
    }

    return await ctx.db.insert("pantryItems", {
      ingredientId: args.ingredientId,
      quantity: args.quantity,
      unit: args.unit,
    })
  },
})

export const adjustQuantity = mutation({
  args: {
    id: v.id("pantryItems"),
    delta: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id)
    if (!item) throw new Error("Pantry item not found")
    const newQuantity = Math.max(0, item.quantity + args.delta)
    await ctx.db.patch(args.id, { quantity: newQuantity })
    return null
  },
})

export const remove = mutation({
  args: { id: v.id("pantryItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error("Pantry item not found")
    }
    await ctx.db.delete(args.id)
    return null
  },
})
