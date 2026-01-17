import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useState } from 'react'
import { UnitPicker } from '../components/UnitPicker'
import { DemoGuard } from '~/components/DemoGuard'

type PantryItem = {
  _id: Id<'pantryItems'>
  _creationTime: number
  ingredientId: Id<'ingredients'>
  quantity: number
  unit: string
  ingredient: {
    _id: Id<'ingredients'>
    name: string
    aliases?: string[]
    category: string
    isStaple: boolean
    defaultUnit: string
  }
}

const PantryItemCard = ({
  item,
  onAdjust,
  onRemove,
}: {
  item: PantryItem
  onAdjust: (id: Id<'pantryItems'>, delta: number) => void
  onRemove: (id: Id<'pantryItems'>) => void
}) => (
  <div className="card flex items-center justify-between">
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <span className="font-medium text-espresso">
          {item.ingredient.name}
        </span>
        {item.ingredient.isStaple && (
          <span className="badge badge-sage text-xs">staple</span>
        )}
      </div>
      <div className="text-sm text-warmgray">
        {item.quantity} {item.unit}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={() => onAdjust(item._id, -1)}
        className="w-8 h-8 rounded-full bg-cream hover:bg-terracotta/20 text-espresso flex items-center justify-center transition-colors"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <button
        onClick={() => onAdjust(item._id, 1)}
        className="w-8 h-8 rounded-full bg-cream hover:bg-sage/20 text-espresso flex items-center justify-center transition-colors"
        aria-label="Increase quantity"
      >
        +
      </button>
      <button
        onClick={() => onRemove(item._id)}
        className="w-8 h-8 rounded-full bg-cream hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors ml-2"
        aria-label="Remove item"
      >
        ×
      </button>
    </div>
  </div>
)

const AddIngredientModal = ({ onClose }: { onClose: () => void }) => {
  const [search, setSearch] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('piece')
  const [selectedIngredient, setSelectedIngredient] = useState<{
    _id: Id<'ingredients'>
    name: string
    defaultUnit: string
  } | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('Produce')
  const [newIsStaple, setNewIsStaple] = useState(false)
  const [newDefaultUnit, setNewDefaultUnit] = useState('unit')

  const searchResults = useQuery(api.ingredients.search, { query: search })
  const createIngredient = useMutation(api.ingredients.create)
  const upsertPantry = useMutation(api.pantry.upsert)

  const handleSelectIngredient = (ing: typeof selectedIngredient) => {
    setSelectedIngredient(ing)
    setUnit(ing?.defaultUnit || '')
    setSearch('')
  }

  const handleAdd = async () => {
    let ingredientId: Id<'ingredients'>

    if (isCreatingNew) {
      ingredientId = await createIngredient({
        name: newName,
        category: newCategory,
        isStaple: newIsStaple,
        defaultUnit: newDefaultUnit,
      })
    } else if (selectedIngredient) {
      ingredientId = selectedIngredient._id
    } else {
      return
    }

    await upsertPantry({
      ingredientId,
      quantity: parseFloat(quantity) || 1,
      unit: unit || 'unit',
    })

    onClose()
  }

  const categories = [
    'Produce',
    'Meat',
    'Dairy',
    'Grains',
    'Spices',
    'Condiments',
    'Frozen',
    'Canned',
    'Other',
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60]">
      <div className="bg-cream w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom)+5rem)] sm:pb-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display text-espresso">Add to Pantry</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-warmgray/20 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {!selectedIngredient && !isCreatingNew ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Search ingredients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-warmgray/30 bg-white focus:outline-none focus:ring-2 focus:ring-sage"
              autoFocus
            />
            {search && searchResults && searchResults.length > 0 && (
              <div className="space-y-1">
                {searchResults.map((ing) => (
                  <button
                    key={ing._id}
                    onClick={() => handleSelectIngredient(ing)}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-sage/10 transition-colors"
                  >
                    <span className="font-medium">{ing.name}</span>
                    <span className="text-sm text-warmgray ml-2">
                      {ing.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {search && searchResults && searchResults.length === 0 && (
              <div className="text-center py-4">
                <p className="text-warmgray mb-3">No ingredients found</p>
                <DemoGuard action="Creating ingredients">
                  <button
                    onClick={() => {
                      setIsCreatingNew(true)
                      setNewName(search)
                    }}
                    className="btn-primary"
                  >
                    Create "{search}"
                  </button>
                </DemoGuard>
              </div>
            )}
          </div>
        ) : isCreatingNew ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-espresso mb-1">
                Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-warmgray/30 bg-white focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso mb-1">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-warmgray/30 bg-white focus:outline-none focus:ring-2 focus:ring-sage"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso mb-1">
                Default Unit
              </label>
              <input
                type="text"
                value={newDefaultUnit}
                onChange={(e) => setNewDefaultUnit(e.target.value)}
                placeholder="e.g., lb, oz, cups"
                className="w-full px-4 py-3 rounded-xl border border-warmgray/30 bg-white focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newIsStaple}
                onChange={(e) => setNewIsStaple(e.target.checked)}
                className="w-5 h-5 rounded border-warmgray/30 text-sage focus:ring-sage"
              />
              <span className="text-espresso">This is a staple ingredient</span>
            </label>
            <div className="flex gap-3">
              <label className="flex-1">
                <span className="block text-sm font-medium text-espresso mb-1">
                  Quantity
                </span>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="0"
                  step="0.5"
                  className="w-full px-4 py-3 rounded-xl border border-warmgray/30 bg-white focus:outline-none focus:ring-2 focus:ring-sage"
                />
              </label>
              <label className="flex-1">
                <span className="block text-sm font-medium text-espresso mb-1">
                  Unit
                </span>
                <UnitPicker
                  value={unit || newDefaultUnit}
                  onChange={setUnit}
                  className="w-full px-4 py-3 rounded-xl"
                />
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setIsCreatingNew(false)
                  setNewName('')
                }}
                className="flex-1 py-3 rounded-xl border border-warmgray/30 text-espresso hover:bg-warmgray/10 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleAdd}
                disabled={!newName}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                Add to Pantry
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-sage/10 rounded-xl p-4">
              <div className="font-medium text-espresso">
                {selectedIngredient?.name}
              </div>
            </div>
            <div className="flex gap-3">
              <label className="flex-1">
                <span className="block text-sm font-medium text-espresso mb-1">
                  Quantity
                </span>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="0"
                  step="0.5"
                  className="w-full px-4 py-3 rounded-xl border border-warmgray/30 bg-white focus:outline-none focus:ring-2 focus:ring-sage"
                  autoFocus
                />
              </label>
              <label className="flex-1">
                <span className="block text-sm font-medium text-espresso mb-1">
                  Unit
                </span>
                <UnitPicker
                  value={unit}
                  onChange={setUnit}
                  className="w-full px-4 py-3 rounded-xl"
                />
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedIngredient(null)
                  setUnit('piece')
                }}
                className="flex-1 py-3 rounded-xl border border-warmgray/30 text-espresso hover:bg-warmgray/10 transition-colors"
              >
                Back
              </button>
              <button onClick={handleAdd} className="flex-1 btn-primary">
                Add to Pantry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const Pantry = () => {
  const pantryItems = useQuery(api.pantry.list)
  const adjustQuantity = useMutation(api.pantry.adjustQuantity)
  const removeItem = useMutation(api.pantry.remove)
  const [showAddModal, setShowAddModal] = useState(false)

  const handleAdjust = (id: Id<'pantryItems'>, delta: number) => {
    adjustQuantity({ id, delta })
  }

  const handleRemove = (id: Id<'pantryItems'>) => {
    removeItem({ id })
  }

  const groupedItems = pantryItems?.reduce(
    (acc, item) => {
      const category = item.ingredient.category
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    },
    {} as Record<string, PantryItem[]>,
  )

  const sortedCategories = groupedItems ? Object.keys(groupedItems).sort() : []

  return (
    <>
      <header className="page-header">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Pantry</h1>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            + Add
          </button>
        </div>
      </header>
      <div className="px-4 py-4 space-y-6">
        {pantryItems === undefined ? (
          <div className="text-center py-8">
            <div className="animate-pulse text-warmgray">Loading pantry...</div>
          </div>
        ) : pantryItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-warmgray mb-4">Your pantry is empty.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              Add your first ingredient
            </button>
          </div>
        ) : (
          sortedCategories.map((category) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-warmgray uppercase tracking-wide mb-3">
                {category}
              </h2>
              <div className="space-y-2">
                {groupedItems![category].map((item) => (
                  <PantryItemCard
                    key={item._id}
                    item={item}
                    onAdjust={handleAdjust}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      {showAddModal && (
        <AddIngredientModal onClose={() => setShowAddModal(false)} />
      )}
    </>
  )
}

export const Route = createFileRoute('/pantry')({
  component: Pantry,
})
