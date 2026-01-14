import { mutation } from "./_generated/server"
import { v } from "convex/values"

const DEFAULT_STAPLES = [
  { name: "Salt", category: "pantry", defaultUnit: "g" },
  { name: "Black Pepper", category: "pantry", defaultUnit: "g" },
  { name: "Olive Oil", category: "pantry", defaultUnit: "ml" },
  { name: "Vegetable Oil", category: "pantry", defaultUnit: "ml" },
  { name: "Butter", category: "dairy", defaultUnit: "g" },
  { name: "Water", category: "pantry", defaultUnit: "ml" },
  { name: "Garlic", category: "produce", defaultUnit: "cloves" },
]

export const seedStaples = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const existing = await ctx.db.query("ingredients").collect()
    if (existing.length > 0) {
      return 0 // Already seeded
    }

    for (const staple of DEFAULT_STAPLES) {
      await ctx.db.insert("ingredients", {
        name: staple.name,
        normalizedName: staple.name.toLowerCase().trim(),
        category: staple.category,
        isStaple: true,
        defaultUnit: staple.defaultUnit,
      })
    }

    return DEFAULT_STAPLES.length
  },
})
