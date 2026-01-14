import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  ingredients: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    aliases: v.optional(v.array(v.string())),
    category: v.string(),
    isStaple: v.boolean(),
    defaultUnit: v.string(),
  })
    .index("by_normalizedName", ["normalizedName"])
    .index("by_category", ["category"]),

  pantryItems: defineTable({
    ingredientId: v.id("ingredients"),
    quantity: v.number(),
    unit: v.string(),
  }).index("by_ingredient", ["ingredientId"]),

  recipes: defineTable({
    title: v.string(),
    source: v.optional(v.string()),
    cooklangSource: v.string(),
    parsedIngredients: v.array(
      v.object({
        originalText: v.string(),
        quantity: v.optional(v.number()),
        unit: v.optional(v.string()),
        ingredientId: v.optional(v.id("ingredients")),
      })
    ),
    parsedSteps: v.array(v.string()),
  }).index("by_title", ["title"]),

  shoppingLists: defineTable({
    name: v.string(),
    items: v.array(
      v.object({
        ingredientId: v.id("ingredients"),
        quantity: v.number(),
        unit: v.string(),
        checked: v.boolean(),
      })
    ),
  }),
})
