import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useState, useEffect, useRef } from 'react'
import { convertUnit, canConvert, formatQuantity } from '../lib/units'

const RecipeDetail = () => {
  const { recipeId } = Route.useParams()
  const navigate = useNavigate()
  const recipe = useQuery(api.recipes.get, {
    id: recipeId as Id<'recipes'>,
  })
  const pantryItems = useQuery(api.pantry.list)
  const allIngredients = useQuery(api.ingredients.list)
  const removeRecipe = useMutation(api.recipes.remove)
  const updateRecipe = useMutation(api.recipes.update)
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl)
  const getImageUrl = useMutation(api.storage.getImageUrl)
  const [currentStep, setCurrentStep] = useState(0)
  const [showCookMode, setShowCookMode] = useState(false)
  const [showMarkCooked, setShowMarkCooked] = useState(false)
  const [showAddToList, setShowAddToList] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditImage, setShowEditImage] = useState(false)
  const [editImageUrl, setEditImageUrl] = useState('')
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url')
  const [uploading, setUploading] = useState(false)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentServings, setCurrentServings] = useState<number | null>(null)

  useEffect(() => {
    if (recipe && currentServings === null) {
      setCurrentServings(recipe.servings || 4)
    }
  }, [recipe])

  if (recipe === undefined) {
    return (
      <>
        <header className="page-header">
          <h1 className="page-title">Loading...</h1>
        </header>
        <div className="px-4 py-8 text-center">
          <div className="animate-pulse text-warmgray">Loading recipe...</div>
        </div>
      </>
    )
  }

  if (recipe === null) {
    return (
      <>
        <header className="page-header">
          <h1 className="page-title">Recipe Not Found</h1>
        </header>
        <div className="px-4 py-8 text-center">
          <p className="text-warmgray mb-4">This recipe doesn't exist.</p>
          <Link to="/recipes" className="btn-primary">
            Back to Recipes
          </Link>
        </div>
      </>
    )
  }

  // Check ingredient availability
  const getIngredientStatus = (ingredientId?: Id<'ingredients'>) => {
    if (!ingredientId || !pantryItems) return 'unknown'
    const pantryItem = pantryItems.find((p) => p.ingredientId === ingredientId)
    if (!pantryItem) return 'missing'
    if (pantryItem.quantity <= 0) return 'empty'
    return 'available'
  }

  const getIngredientName = (ingredientId?: Id<'ingredients'>) => {
    if (!ingredientId || !allIngredients) return null
    return allIngredients.find((i) => i._id === ingredientId)?.name
  }

  const ingredientsWithStatus = recipe.parsedIngredients.map((ing) => ({
    ...ing,
    status: getIngredientStatus(ing.ingredientId as Id<'ingredients'> | undefined),
    linkedName: getIngredientName(ing.ingredientId as Id<'ingredients'> | undefined),
  }))

  const availableCount = ingredientsWithStatus.filter(
    (i) => i.status === 'available'
  ).length
  const totalLinked = ingredientsWithStatus.filter((i) => i.ingredientId).length

  // Calculate scale factor for servings adjustment
  const baseServings = Math.max(1, recipe?.servings || 4)
  const scaleFactor = currentServings ? currentServings / baseServings : 1

  if (showAddToList && pantryItems) {
    const missingIngredients = ingredientsWithStatus.filter(
      (i) => i.ingredientId && (i.status === 'missing' || i.status === 'empty')
    )
    return (
      <AddToShoppingListModal
        recipeTitle={recipe.title}
        missingIngredients={missingIngredients}
        onClose={() => setShowAddToList(false)}
      />
    )
  }

  if (showMarkCooked && pantryItems) {
    return (
      <MarkAsCookedModal
        recipe={recipe}
        pantryItems={pantryItems}
        onClose={() => {
          setShowMarkCooked(false)
          setShowCookMode(false)
          setCurrentStep(0)
        }}
        onSkip={() => {
          setShowMarkCooked(false)
          setShowCookMode(false)
          setCurrentStep(0)
        }}
      />
    )
  }

  if (showCookMode) {
    return (
      <CookModeView
        recipe={recipe}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        onExit={() => setShowCookMode(false)}
        onFinish={() => setShowMarkCooked(true)}
      />
    )
  }

  return (
    <>
      <header className="page-header">
        <div className="flex items-center gap-3">
          <Link
            to="/recipes"
            className="w-10 h-10 rounded-full bg-cream flex items-center justify-center hover:bg-sage/20 transition-colors"
          >
            ←
          </Link>
          <h1 className="page-title flex-1">{recipe.title}</h1>
        </div>
      </header>

      <div className="relative w-full h-48 sm:h-64 overflow-hidden bg-warmgray/10">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-warmgray">
            No image
          </div>
        )}
        <button
          onClick={() => {
            setEditImageUrl(recipe.image || '')
            setShowEditImage(true)
          }}
          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/50 text-white text-sm hover:bg-black/70 transition-colors"
        >
          {recipe.image ? 'Change' : 'Add'} Image
        </button>
      </div>

      <div className="px-4 py-4 space-y-6">
        {recipe.source && (
          <a
            href={recipe.source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-sage hover:underline flex items-center gap-1"
          >
            View original recipe →
          </a>
        )}

        {/* Servings control */}
        <div className="servings-control">
          <span>Servings:</span>
          <button
            onClick={() => setCurrentServings(Math.max(1, (currentServings || baseServings) - 1))}
            disabled={currentServings === 1}
            className="servings-btn"
            aria-label="Decrease servings"
            title="Decrease servings"
          >
            −
          </button>
          <span className="servings-value">{currentServings}</span>
          <button
            onClick={() => setCurrentServings((currentServings || baseServings) + 1)}
            className="servings-btn"
            aria-label="Increase servings"
            title="Increase servings"
          >
            +
          </button>
        </div>

        {/* Ingredient availability summary */}
        {totalLinked > 0 && (
          <div className="bg-cream rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-espresso">Ingredient Check</span>
              <span
                className={`text-sm font-medium ${
                  availableCount === totalLinked
                    ? 'text-sage'
                    : availableCount >= totalLinked * 0.7
                      ? 'text-yellow-600'
                      : 'text-terracotta'
                }`}
              >
                {availableCount}/{totalLinked} in pantry
              </span>
            </div>
            <div className="w-full bg-warmgray/20 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  availableCount === totalLinked
                    ? 'bg-sage'
                    : availableCount >= totalLinked * 0.7
                      ? 'bg-yellow-500'
                      : 'bg-terracotta'
                }`}
                style={{ width: `${(availableCount / totalLinked) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Ingredients */}
        <section>
          <h2 className="text-lg font-display text-espresso mb-3">Ingredients</h2>
          <div className="space-y-2">
            {ingredientsWithStatus.map((ing, idx) => {
              const scaledQuantity = ing.quantity ? ing.quantity * scaleFactor : undefined
              const displayQuantity = scaledQuantity ? formatQuantity(scaledQuantity) : ''
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-cream rounded-xl"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                      ing.status === 'available'
                        ? 'bg-sage/20 text-sage'
                        : ing.status === 'missing' || ing.status === 'empty'
                          ? 'bg-terracotta/20 text-terracotta'
                          : 'bg-warmgray/20 text-warmgray'
                    }`}
                  >
                    {ing.status === 'available' ? '✓' : ing.status === 'unknown' ? '?' : '✕'}
                  </div>
                  <div className="flex-1">
                    <span className="text-espresso">
                      {displayQuantity && `${displayQuantity} `}
                      {ing.unit && `${ing.unit} `}
                      {ing.linkedName || ing.originalText}
                    </span>
                    {ing.linkedName && ing.linkedName !== ing.originalText && (
                      <span className="text-xs text-warmgray ml-2">
                        ({ing.originalText})
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Steps */}
        <section>
          <h2 className="text-lg font-display text-espresso mb-3">Instructions</h2>
          <div className="space-y-3">
            {recipe.parsedSteps.map((step, idx) => (
              <div key={idx} className="flex gap-3 p-3 bg-cream rounded-xl">
                <div className="w-8 h-8 rounded-full bg-sage/20 text-sage flex items-center justify-center font-medium shrink-0">
                  {idx + 1}
                </div>
                <p className="text-espresso flex-1 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-3 pt-4">
          {ingredientsWithStatus.some(
            (i) => i.ingredientId && (i.status === 'missing' || i.status === 'empty')
          ) && (
            <button
              onClick={() => setShowAddToList(true)}
              className="w-full py-4 rounded-xl bg-terracotta text-white font-medium hover:bg-terracotta/90 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-lg">🛒</span>
              Add Missing to Shopping List
            </button>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setShowCookMode(true)}
              className="flex-1 btn-primary"
            >
              Start Cooking
            </button>
            <Link
              to="/recipes"
              className="px-6 py-3 rounded-xl border border-warmgray/30 text-espresso hover:bg-warmgray/10 transition-colors"
            >
              Back
            </Link>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 rounded-xl text-terracotta hover:bg-terracotta/10 transition-colors text-sm"
          >
            Delete Recipe
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-cream rounded-2xl p-6 max-w-sm w-full">
            <h2 className="font-display text-xl text-espresso mb-2">Delete Recipe?</h2>
            <p className="text-warmgray mb-6">
              Are you sure you want to delete "{recipe.title}"? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-warmgray/30 text-espresso hover:bg-warmgray/10"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await removeRecipe({ id: recipe._id })
                  navigate({ to: '/recipes' })
                }}
                className="flex-1 py-3 rounded-xl bg-terracotta text-white font-medium hover:bg-terracotta/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-cream rounded-2xl p-6 max-w-md w-full">
            <h2 className="font-display text-xl text-espresso mb-4">Recipe Image</h2>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setImageMode('url')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  imageMode === 'url'
                    ? 'bg-sage text-white'
                    : 'bg-warmgray/10 text-espresso hover:bg-warmgray/20'
                }`}
              >
                Paste URL
              </button>
              <button
                onClick={() => setImageMode('upload')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  imageMode === 'upload'
                    ? 'bg-sage text-white'
                    : 'bg-warmgray/10 text-espresso hover:bg-warmgray/20'
                }`}
              >
                Upload File
              </button>
            </div>

            {imageMode === 'url' ? (
              <>
                <input
                  type="url"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="Paste image URL..."
                  className="w-full px-4 py-3 rounded-xl border border-warmgray/30 bg-white focus:outline-none focus:ring-2 focus:ring-sage mb-4"
                  autoFocus
                />
                {editImageUrl && (
                  <div className="mb-4 rounded-xl overflow-hidden bg-warmgray/10 h-40">
                    <img
                      src={editImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = () => setUploadPreview(reader.result as string)
                      reader.readAsDataURL(file)
                    }
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 rounded-xl border-2 border-dashed border-warmgray/30 text-warmgray hover:border-sage hover:text-sage transition-colors mb-4"
                >
                  {uploadPreview ? 'Choose different file' : 'Click to select image'}
                </button>
                {uploadPreview && (
                  <div className="mb-4 rounded-xl overflow-hidden bg-warmgray/10 h-40">
                    <img
                      src={uploadPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditImage(false)
                  setUploadPreview(null)
                  setEditImageUrl('')
                }}
                className="flex-1 py-3 rounded-xl border border-warmgray/30 text-espresso hover:bg-warmgray/10"
              >
                Cancel
              </button>
              <button
                disabled={uploading}
                onClick={async () => {
                  if (imageMode === 'url') {
                    await updateRecipe({
                      id: recipe._id,
                      image: editImageUrl || undefined,
                    })
                  } else if (fileInputRef.current?.files?.[0]) {
                    setUploading(true)
                    try {
                      const uploadUrl = await generateUploadUrl()
                      const file = fileInputRef.current.files[0]
                      const response = await fetch(uploadUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': file.type },
                        body: file,
                      })
                      const { storageId } = await response.json()
                      const imageUrl = await getImageUrl({ storageId })
                      if (imageUrl) {
                        await updateRecipe({
                          id: recipe._id,
                          image: imageUrl,
                        })
                      }
                    } finally {
                      setUploading(false)
                    }
                  }
                  setShowEditImage(false)
                  setUploadPreview(null)
                  setEditImageUrl('')
                }}
                className="flex-1 py-3 rounded-xl bg-sage text-white font-medium hover:bg-sage/90 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Cook mode - step-by-step view
const CookModeView = ({
  recipe,
  currentStep,
  setCurrentStep,
  onExit,
  onFinish,
}: {
  recipe: {
    title: string
    parsedSteps: string[]
    parsedIngredients: { originalText: string; quantity?: number; unit?: string }[]
  }
  currentStep: number
  setCurrentStep: (step: number) => void
  onExit: () => void
  onFinish: () => void
}) => {
  const totalSteps = recipe.parsedSteps.length
  const isLastStep = currentStep === totalSteps - 1

  return (
    <div className="min-h-screen bg-espresso text-cream flex flex-col">
      <header className="px-4 py-4 flex items-center justify-between border-b border-cream/10">
        <button
          onClick={onExit}
          className="text-cream/70 hover:text-cream transition-colors"
        >
          ← Exit
        </button>
        <span className="text-cream/70">
          Step {currentStep + 1} of {totalSteps}
        </span>
        <div className="w-12" />
      </header>

      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        <div className="text-center">
          <div className="text-6xl font-display text-sage mb-6">
            {currentStep + 1}
          </div>
          <p className="text-xl leading-relaxed">{recipe.parsedSteps[currentStep]}</p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        <div className="flex gap-1">
          {recipe.parsedSteps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                idx === currentStep
                  ? 'bg-sage'
                  : idx < currentStep
                    ? 'bg-cream/50'
                    : 'bg-cream/20'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex-1 py-4 rounded-xl border border-cream/30 text-cream disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cream/10 transition-colors"
          >
            Previous
          </button>
          {isLastStep ? (
            <button
              onClick={onFinish}
              className="flex-1 py-4 rounded-xl bg-sage text-espresso font-medium hover:bg-sage/90 transition-colors"
            >
              Done!
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
              className="flex-1 py-4 rounded-xl bg-sage text-espresso font-medium hover:bg-sage/90 transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

type PantryItem = {
  _id: Id<'pantryItems'>
  ingredientId: Id<'ingredients'>
  quantity: number
  unit: string
  ingredient: { _id: Id<'ingredients'>; name: string }
}

type MissingIngredient = {
  ingredientId?: Id<'ingredients'>
  originalText: string
  quantity?: number
  unit?: string
  status: string
  linkedName?: string | null
}

const AddToShoppingListModal = ({
  recipeTitle,
  missingIngredients,
  onClose,
}: {
  recipeTitle: string
  missingIngredients: MissingIngredient[]
  onClose: () => void
}) => {
  const lists = useQuery(api.shoppingLists.list)
  const createList = useMutation(api.shoppingLists.create)
  const addItems = useMutation(api.shoppingLists.addItems)
  const allIngredients = useQuery(api.ingredients.list)

  const [selectedListId, setSelectedListId] = useState<Id<'shoppingLists'> | 'new' | null>(null)
  const [newListName, setNewListName] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => {
    return new Set(missingIngredients.map((_, idx) => String(idx)))
  })
  const [saving, setSaving] = useState(false)

  const getIngredientName = (ingredientId?: Id<'ingredients'>) => {
    if (!ingredientId || !allIngredients) return null
    return allIngredients.find((i) => i._id === ingredientId)?.name
  }

  const toggleItem = (idx: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(String(idx))) {
        next.delete(String(idx))
      } else {
        next.add(String(idx))
      }
      return next
    })
  }

  const handleAdd = async () => {
    if (selectedItems.size === 0) return
    setSaving(true)

    try {
      let listId: Id<'shoppingLists'>

      if (selectedListId === 'new') {
        const name = newListName.trim() || `${recipeTitle} Shopping`
        listId = await createList({ name })
      } else if (selectedListId) {
        listId = selectedListId
      } else {
        return
      }

      const items = missingIngredients
        .filter((_, idx) => selectedItems.has(String(idx)))
        .filter((ing) => ing.ingredientId)
        .map((ing) => ({
          ingredientId: ing.ingredientId as Id<'ingredients'>,
          quantity: ing.quantity || 1,
          unit: ing.unit || 'item',
        }))

      if (items.length > 0) {
        await addItems({ id: listId, items })
      }
      onClose()
    } catch (e) {
      console.error('Failed to add to shopping list:', e)
    } finally {
      setSaving(false)
    }
  }

  if (lists === undefined) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <header className="page-header">
          <h1 className="page-title">Add to Shopping List</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-warmgray">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-cream flex items-center justify-center hover:bg-sage/20 transition-colors"
          >
            ←
          </button>
          <h1 className="page-title flex-1">Add to Shopping List</h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-6">
        <section>
          <h2 className="text-lg font-display text-espresso mb-3">Select List</h2>
          <div className="space-y-2">
            {lists.map((list) => (
              <button
                key={list._id}
                onClick={() => setSelectedListId(list._id)}
                className={`w-full p-4 rounded-xl border text-left transition-colors ${
                  selectedListId === list._id
                    ? 'border-sage bg-sage/10'
                    : 'border-warmgray/30 bg-white hover:border-sage/50'
                }`}
              >
                <span className="font-medium text-espresso">{list.name}</span>
                <span className="text-sm text-warmgray ml-2">
                  ({list.items.length} items)
                </span>
              </button>
            ))}
            <button
              onClick={() => setSelectedListId('new')}
              className={`w-full p-4 rounded-xl border text-left transition-colors ${
                selectedListId === 'new'
                  ? 'border-sage bg-sage/10'
                  : 'border-warmgray/30 bg-white hover:border-sage/50'
              }`}
            >
              <span className="font-medium text-espresso">+ Create New List</span>
            </button>
          </div>
          {selectedListId === 'new' && (
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder={`${recipeTitle} Shopping`}
              className="mt-3 w-full px-4 py-3 rounded-xl border border-warmgray/30 bg-white focus:outline-none focus:ring-2 focus:ring-sage"
              autoFocus
            />
          )}
        </section>

        <section>
          <h2 className="text-lg font-display text-espresso mb-3">
            Missing Ingredients ({selectedItems.size} selected)
          </h2>
          <div className="space-y-2">
            {missingIngredients.map((ing, idx) => (
              <button
                key={idx}
                onClick={() => toggleItem(idx)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  selectedItems.has(String(idx))
                    ? 'border-sage bg-sage/10'
                    : 'border-warmgray/30 bg-white'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedItems.has(String(idx))
                      ? 'bg-sage border-sage text-white'
                      : 'border-warmgray/30'
                  }`}
                >
                  {selectedItems.has(String(idx)) && '✓'}
                </div>
                <span className="text-espresso text-left flex-1">
                  {ing.quantity && `${ing.quantity} `}
                  {ing.unit && `${ing.unit} `}
                  {getIngredientName(ing.ingredientId as Id<'ingredients'>) || ing.originalText}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="px-4 py-4 border-t border-warmgray/20">
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-warmgray/30 text-espresso hover:bg-warmgray/10"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={saving || !selectedListId || selectedItems.size === 0}
            className="flex-1 btn-primary disabled:opacity-50"
          >
            {saving ? 'Adding...' : `Add ${selectedItems.size} Items`}
          </button>
        </div>
      </div>
    </div>
  )
}

function calculateDeduction(
  recipeQty: number,
  recipeUnit: string,
  pantryQty: number,
  pantryUnit: string
): { deductQty: number; note?: string } {
  // Handle empty/missing units - treat as unitless quantities
  if (!recipeUnit.trim() || !pantryUnit.trim()) {
    // If either unit is empty, just use simple numeric deduction
    return { deductQty: Math.min(recipeQty, pantryQty) }
  }

  // Validate quantities
  if (recipeQty <= 0 || pantryQty <= 0) {
    return { deductQty: 0 }
  }

  // Same units - simple deduction
  if (recipeUnit === pantryUnit) {
    return { deductQty: Math.min(recipeQty, pantryQty) }
  }

  // Try to convert
  if (canConvert(recipeUnit, pantryUnit)) {
    const convertedRecipeQty = convertUnit(recipeQty, recipeUnit, pantryUnit)
    if (convertedRecipeQty !== null) {
      const deductQty = Math.min(convertedRecipeQty, pantryQty)
      return {
        deductQty: Math.round(deductQty * 100) / 100, // Round to 2 decimal places
        note: `Recipe needs ${formatQuantity(recipeQty)} ${recipeUnit} (≈ ${formatQuantity(convertedRecipeQty)} ${pantryUnit})`
      }
    }
  }

  // Can't convert - show warning
  return {
    deductQty: 0,
    note: `Unit mismatch: recipe uses ${recipeUnit}, pantry has ${pantryUnit}`
  }
}

const MarkAsCookedModal = ({
  recipe,
  pantryItems,
  onClose,
  onSkip,
}: {
  recipe: {
    _id: Id<'recipes'>
    title: string
    parsedIngredients: {
      originalText: string
      quantity?: number
      unit?: string
      ingredientId?: Id<'ingredients'>
    }[]
  }
  pantryItems: PantryItem[]
  onClose: () => void
  onSkip: () => void
}) => {
  const markCooked = useMutation(api.recipes.markCooked)
  const [saving, setSaving] = useState(false)

  const deductibleIngredients = recipe.parsedIngredients
    .filter((ing) => ing.ingredientId)
    .map((ing) => {
      const pantryItem = pantryItems.find((p) => p.ingredientId === ing.ingredientId)
      return {
        ...ing,
        pantryItem,
        ingredientName: pantryItem?.ingredient.name || ing.originalText,
      }
    })
    .filter((ing) => ing.pantryItem)

  const [deductions, setDeductions] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    deductibleIngredients.forEach((ing) => {
      if (ing.pantryItem) {
        const result = calculateDeduction(
          ing.quantity || 1,
          ing.unit || '',
          ing.pantryItem.quantity,
          ing.pantryItem.unit
        )
        initial[ing.pantryItem._id] = result.deductQty
      }
    })
    return initial
  })

  const [deductionNotes] = useState<Record<string, string>>(() => {
    const initialNotes: Record<string, string> = {}
    deductibleIngredients.forEach((ing) => {
      if (ing.pantryItem) {
        const result = calculateDeduction(
          ing.quantity || 1,
          ing.unit || '',
          ing.pantryItem.quantity,
          ing.pantryItem.unit
        )
        if (result.note) {
          initialNotes[ing.pantryItem._id] = result.note
        }
      }
    })
    return initialNotes
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const deductionList = Object.entries(deductions)
        .filter(([_, qty]) => qty > 0)
        .map(([pantryItemId, quantity]) => ({
          pantryItemId: pantryItemId as Id<'pantryItems'>,
          quantity,
        }))

      await markCooked({
        recipeId: recipe._id,
        deductions: deductionList,
      })
      onClose()
    } catch (e) {
      console.error('Failed to mark as cooked:', e)
    } finally {
      setSaving(false)
    }
  }

  if (deductibleIngredients.length === 0) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <header className="page-header">
          <h1 className="page-title">Finished Cooking!</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <p className="text-warmgray text-center mb-6">
            No ingredients to deduct from pantry.
          </p>
          <button onClick={onClose} className="btn-primary">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="page-header">
        <h1 className="page-title">Update Pantry</h1>
      </header>

      <div className="flex-1 px-4 py-4">
        <p className="text-warmgray mb-4">
          Deduct these ingredients from your pantry?
        </p>

        <div className="space-y-3">
          {deductibleIngredients.map((ing) => {
            if (!ing.pantryItem) return null
            const currentDeduction = deductions[ing.pantryItem._id] || 0

            return (
              <div
                key={ing.pantryItem._id}
                className="bg-white rounded-xl p-4 border border-warmgray/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-espresso">
                    {ing.ingredientName}
                  </span>
                  <span className="text-sm text-warmgray">
                    {ing.pantryItem.quantity} {ing.pantryItem.unit} in pantry
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setDeductions((d) => ({
                        ...d,
                        [ing.pantryItem!._id]: Math.max(0, currentDeduction - 0.5),
                      }))
                    }
                    className="w-10 h-10 rounded-full bg-warmgray/10 flex items-center justify-center text-espresso hover:bg-warmgray/20"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-medium text-espresso">
                      {formatQuantity(currentDeduction)}
                    </span>
                    <span className="text-warmgray ml-1">{ing.pantryItem.unit}</span>
                  </div>
                  <button
                    onClick={() =>
                      setDeductions((d) => ({
                        ...d,
                        [ing.pantryItem!._id]: currentDeduction + 0.5,
                      }))
                    }
                    className="w-10 h-10 rounded-full bg-warmgray/10 flex items-center justify-center text-espresso hover:bg-warmgray/20"
                  >
                    +
                  </button>
                </div>
                {deductionNotes[ing.pantryItem._id] && (
                  <span className="deduction-note">{deductionNotes[ing.pantryItem._id]}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-4 py-4 border-t border-warmgray/20">
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-3 rounded-xl border border-warmgray/30 text-espresso hover:bg-warmgray/10"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Update Pantry'}
          </button>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/recipes_/$recipeId')({
  component: RecipeDetail,
})
