import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  ingredients: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    aliases: v.optional(v.array(v.string())),
    category: v.string(),
    isStaple: v.boolean(),
    defaultUnit: v.string(),
  })
    .index('by_normalizedName', ['normalizedName'])
    .index('by_category', ['category']),

  pantryItems: defineTable({
    userId: v.string(),
    ingredientId: v.id('ingredients'),
    quantity: v.number(),
    unit: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_user_ingredient', ['userId', 'ingredientId']),

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    icon: v.optional(v.string()),
  }).index('by_slug', ['slug']),

  recipes: defineTable({
    userId: v.string(),
    title: v.string(),
    source: v.optional(v.string()),
    cooklangSource: v.string(),
    parsedIngredients: v.array(
      v.object({
        originalText: v.string(),
        quantity: v.optional(v.number()),
        unit: v.optional(v.string()),
        ingredientId: v.optional(v.id('ingredients')),
      }),
    ),
    parsedSteps: v.array(v.string()),
    servings: v.optional(v.number()),
    image: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  })
    .index('by_user', ['userId'])
    .index('by_user_category', ['userId', 'category'])
    .index('by_title', ['title']),

  templateRecipes: defineTable({
    title: v.string(),
    cooklangSource: v.string(),
    parsedIngredients: v.array(
      v.object({
        originalText: v.string(),
        quantity: v.optional(v.number()),
        unit: v.optional(v.string()),
      }),
    ),
    parsedSteps: v.array(v.string()),
    servings: v.optional(v.number()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    sourceUrl: v.optional(v.string()),
  }),

  shoppingLists: defineTable({
    userId: v.string(),
    name: v.string(),
    items: v.array(
      v.object({
        ingredientId: v.id('ingredients'),
        quantity: v.number(),
        unit: v.string(),
        checked: v.boolean(),
      }),
    ),
  }).index('by_user', ['userId']),
})
