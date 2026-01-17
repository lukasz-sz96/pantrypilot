import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { parseCooklang, parseIngredientLine } from '../lib/cooklang'
import { RecipeFilterSidebar } from '../components/RecipeFilterSidebar'
import { RecipeFilterDrawer } from '../components/RecipeFilterDrawer'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { DemoGuard } from '~/components/DemoGuard'

type IngredientMatch = {
  originalText: string
  quantity?: number
  unit?: string
  matchedIngredient?: {
    _id: Id<'ingredients'>
    name: string
    aliases?: string[]
    category: string
  }
  isNew?: boolean
  newName?: string
  newCategory?: string
}

const RecipeCard = ({
  recipe,
}: {
  recipe: {
    _id: string
    title: string
    source?: string
    image?: string
    category?: string
    tags?: Array<string>
    parsedIngredients: { originalText: string }[]
  }
}) => {
  return (
    <Link
      to="/recipes/$recipeId"
      params={{ recipeId: recipe._id }}
      className="recipe-card"
    >
      <div className="recipe-card-image">
        {recipe.image ? (
          <img src={recipe.image} alt="" loading="lazy" />
        ) : (
          <div className="recipe-card-placeholder" />
        )}
        {recipe.category && (
          <span className="recipe-card-badge">{recipe.category}</span>
        )}
      </div>
      <div className="recipe-card-content">
        <h3 className="recipe-card-title">{recipe.title}</h3>
        <p className="recipe-card-meta">
          {recipe.parsedIngredients.length} ingredients
        </p>
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="recipe-card-tags">
            {recipe.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="recipe-card-tag">
                {tag}
              </span>
            ))}
            {recipe.tags.length > 2 && (
              <span className="recipe-card-tag-more">
                +{recipe.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

const RecipeCardSkeleton = () => (
  <div className="recipe-card-skeleton">
    <div className="recipe-card-skeleton-image" />
    <div className="recipe-card-skeleton-content">
      <div className="recipe-card-skeleton-title" />
      <div className="recipe-card-skeleton-meta" />
      <div className="recipe-card-skeleton-tags">
        <div className="recipe-card-skeleton-tag" />
        <div className="recipe-card-skeleton-tag" />
      </div>
    </div>
  </div>
)

const AddRecipeModal = ({ onClose }: { onClose: () => void }) => {
  const [mode, setMode] = useState<'choose' | 'import' | 'manual'>('choose')
  const [importData, setImportData] = useState<{
    cooklangSource: string
    title: string
    source: string
    image?: string
    manualIngredients?: { name: string; quantity?: number; unit?: string }[]
    suggestedCategory?: string
    isNewCategory?: boolean
    suggestedTags?: Array<string>
  } | null>(null)

  if (importData) {
    return (
      <RecipePreviewModal
        cooklangSource={importData.cooklangSource}
        title={importData.title}
        source={importData.source}
        image={importData.image}
        manualIngredients={importData.manualIngredients}
        suggestedCategory={importData.suggestedCategory}
        isNewCategory={importData.isNewCategory}
        suggestedTags={importData.suggestedTags}
        onClose={onClose}
        onBack={() => setImportData(null)}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60]">
      <div className="bg-cream w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom)+5rem)] sm:pb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display text-espresso">Add Recipe</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-warmgray/20 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {mode === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('import')}
              className="w-full text-left p-4 rounded-xl bg-white border border-warmgray/20 hover:border-sage transition-colors"
            >
              <div className="font-semibold text-espresso">Import from URL</div>
              <div className="text-sm text-warmgray mt-1">
                Paste a recipe URL to extract ingredients and steps
              </div>
            </button>
            <button
              onClick={() => setMode('manual')}
              className="w-full text-left p-4 rounded-xl bg-white border border-warmgray/20 hover:border-sage transition-colors"
            >
              <div className="font-semibold text-espresso">
                Write in Cooklang
              </div>
              <div className="text-sm text-warmgray mt-1">
                Create a recipe using Cooklang syntax
              </div>
            </button>
          </div>
        )}

        {mode === 'import' && (
          <ImportRecipeForm
            onBack={() => setMode('choose')}
            onImported={setImportData}
          />
        )}

        {mode === 'manual' && (
          <ManualRecipeForm
            onBack={() => setMode('choose')}
            onContinue={(data) => setImportData(data)}
          />
        )}
      </div>
    </div>
  )
}

const ImportRecipeForm = ({
  onBack,
  onImported,
}: {
  onBack: () => void
  onImported: (data: {
    cooklangSource: string
    title: string
    source: string
    image?: string
    suggestedCategory?: string
    isNewCategory?: boolean
    suggestedTags?: Array<string>
  }) => void
}) => {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const importFromUrl = useAction(api.recipes.importFromUrl)

  const handleImport = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError('')

    try {
      const result = await importFromUrl({ url: url.trim() })
      onImported({
        cooklangSource: result.cooklangSource,
        title: result.title,
        source: url.trim(),
        image: result.image,
        suggestedCategory: result.suggestedCategory,
        isNewCategory: result.isNewCategory,
        suggestedTags: result.suggestedTags,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import recipe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-espresso mb-1">
          Recipe URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/recipe"
          className="w-full px-4 py-3 rounded-xl border border-warmgray/30 bg-white focus:outline-none focus:ring-2 focus:ring-sage"
          autoFocus
        />
        <p className="text-xs text-warmgray mt-2">
          Works with most recipe websites using AI extraction
        </p>
      </div>
      {error && <p className="text-sm text-terracotta">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-warmgray/30 text-espresso hover:bg-warmgray/10 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleImport}
          disabled={!url.trim() || loading}
          className="flex-1 btn-primary disabled:opacity-50"
        >
          {loading ? 'Importing...' : 'Import'}
        </button>
      </div>
    </div>
  )
}

const ManualRecipeForm = ({
  onBack,
  onContinue,
}: {
  onBack: () => void
  onContinue: (data: {
    cooklangSource: string
    title: string
    source: string
    manualIngredients?: { name: string; quantity?: number; unit?: string }[]
  }) => void
}) => {
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [steps, setSteps] = useState('')

  const handleContinue = () => {
    if (!title.trim() || !ingredients.trim() || !steps.trim()) return

    // Parse each ingredient line to extract quantity/unit/name
    const parsedIngredients = ingredients
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => parseIngredientLine(line))

    const stepLines = steps
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    // Generate cooklang - steps only (ingredients are passed separately)
    const cooklangSource = `---\ntitle: ${title}\n---\n\n${stepLines.join('\n\n')}`

    onContinue({
      cooklangSource,
      title: title.trim(),
      source: source.trim() || (undefined as any),
      manualIngredients: parsedIngredients,
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-espresso mb-1">
          Recipe Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Favorite Pasta"
          className="w-full px-4 py-3 rounded-xl border border-warmgray/30 bg-white focus:outline-none focus:ring-2 focus:ring-sage"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-espresso mb-1">
          Source (optional)
        </label>
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Grandma's cookbook"
          className="w-full px-4 py-3 rounded-xl border border-warmgray/30 bg-white focus:outline-none focus:ring-2 focus:ring-sage"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-espresso mb-1">
          Ingredients
        </label>
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="flour&#10;salt&#10;eggs&#10;butter&#10;milk"
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-warmgray/30 bg-white focus:outline-none focus:ring-2 focus:ring-sage text-sm"
        />
        <p className="text-xs text-warmgray mt-1">One ingredient per line</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-espresso mb-1">
          Instructions
        </label>
        <textarea
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder="Mix flour and salt in a bowl.&#10;Add eggs and mix until smooth.&#10;Let rest for 30 minutes."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-warmgray/30 bg-white focus:outline-none focus:ring-2 focus:ring-sage text-sm"
        />
        <p className="text-xs text-warmgray mt-1">One step per line</p>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-warmgray/30 text-espresso hover:bg-warmgray/10 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!title.trim() || !ingredients.trim() || !steps.trim()}
          className="flex-1 btn-primary disabled:opacity-50"
        >
          Preview
        </button>
      </div>
    </div>
  )
}

const RecipePreviewModal = ({
  cooklangSource,
  title,
  source,
  image,
  manualIngredients,
  suggestedCategory,
  isNewCategory,
  suggestedTags,
  onClose,
  onBack,
}: {
  cooklangSource: string
  title: string
  source: string
  image?: string
  manualIngredients?: { name: string; quantity?: number; unit?: string }[]
  suggestedCategory?: string
  isNewCategory?: boolean
  suggestedTags?: Array<string>
  onClose: () => void
  onBack: () => void
}) => {
  const navigate = useNavigate()
  const allIngredients = useQuery(api.ingredients.list)
  const defaultCategories = useQuery(api.recipes.getDefaultCategories)
  const dbCategories = useQuery(api.recipes.listCategories)
  const createIngredient = useMutation(api.ingredients.create)
  const addAlias = useMutation(api.ingredients.addAlias)
  const saveRecipe = useMutation(api.recipes.save)
  const createCategory = useMutation(api.recipes.createCategory)

  const parsed = parseCooklang(cooklangSource)

  // Use manualIngredients if provided (from manual entry), otherwise use parsed
  const initialIngredients = manualIngredients
    ? manualIngredients.map((ing) => ({
        originalText: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
      }))
    : parsed.ingredients.map((ing) => ({
        originalText: ing.originalText,
        quantity: ing.quantity,
        unit: ing.unit,
      }))

  const [matches, setMatches] = useState<IngredientMatch[]>(
    () => initialIngredients,
  )
  const [saving, setSaving] = useState(false)
  const [editableTitle, setEditableTitle] = useState(
    title || parsed.title || 'Untitled Recipe',
  )
  const [selectedCategory, setSelectedCategory] = useState(
    suggestedCategory || '',
  )
  const [tags, setTags] = useState<Array<string>>(suggestedTags || [])
  const [newTag, setNewTag] = useState('')

  const allCategories = [
    ...(defaultCategories || []),
    ...(dbCategories || []).map((c) => c.name),
  ].filter((c, i, arr) => arr.indexOf(c) === i)

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const findMatch = (text: string) => {
    if (!allIngredients) return undefined
    const normalized = text.toLowerCase().trim()
    return allIngredients.find(
      (i) =>
        i.normalizedName === normalized ||
        (i.aliases && i.aliases.some((a) => a.toLowerCase() === normalized)),
    )
  }

  if (allIngredients === undefined) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
        <div className="bg-cream rounded-2xl p-6">
          <div className="animate-pulse text-warmgray">
            Loading ingredients...
          </div>
        </div>
      </div>
    )
  }

  const matchedIngredients = matches.map((m) => ({
    ...m,
    matchedIngredient: m.matchedIngredient || findMatch(m.originalText),
  }))

  const unmatchedCount = matchedIngredients.filter(
    (m) => !m.matchedIngredient && !m.isNew,
  ).length

  const handleLinkIngredient = (
    index: number,
    ingredient: {
      _id: Id<'ingredients'>
      name: string
      aliases?: string[]
      category: string
    },
  ) => {
    setMatches((prev) =>
      prev.map((m, i) =>
        i === index
          ? {
              ...m,
              matchedIngredient: {
                _id: ingredient._id,
                name: ingredient.name,
                aliases: ingredient.aliases,
                category: ingredient.category,
              },
              isNew: false,
            }
          : m,
      ),
    )
  }

  const handleCreateNew = (index: number, name: string, category: string) => {
    setMatches((prev) =>
      prev.map((m, i) =>
        i === index
          ? {
              ...m,
              isNew: true,
              newName: name,
              newCategory: category,
              matchedIngredient: undefined,
            }
          : m,
      ),
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const ingredientIds: (Id<'ingredients'> | undefined)[] = []

      for (const match of matchedIngredients) {
        if (match.matchedIngredient) {
          ingredientIds.push(match.matchedIngredient._id)
          const aliases = match.matchedIngredient.aliases ?? []
          if (
            match.originalText.toLowerCase() !==
              match.matchedIngredient.name.toLowerCase() &&
            !aliases.some(
              (a) => a.toLowerCase() === match.originalText.toLowerCase(),
            )
          ) {
            await addAlias({
              id: match.matchedIngredient._id,
              alias: match.originalText,
            })
          }
        } else if (match.isNew && match.newName) {
          const newId = await createIngredient({
            name: match.newName,
            aliases:
              match.newName.toLowerCase() !== match.originalText.toLowerCase()
                ? [match.originalText]
                : [],
            category: match.newCategory || 'Other',
            isStaple: false,
            defaultUnit: match.unit || 'unit',
          })
          ingredientIds.push(newId)
        } else {
          ingredientIds.push(undefined)
        }
      }

      if (
        selectedCategory &&
        (isNewCategory || !allCategories.includes(selectedCategory))
      ) {
        await createCategory({ name: selectedCategory })
      }

      const recipeId = await saveRecipe({
        title: editableTitle,
        source: source || undefined,
        cooklangSource,
        parsedIngredients: matchedIngredients.map((m, i) => ({
          originalText: m.originalText,
          quantity: m.quantity,
          unit: m.unit,
          ingredientId: ingredientIds[i],
        })),
        parsedSteps: parsed.steps,
        servings: parsed.servings,
        image,
        category: selectedCategory || undefined,
        tags: tags.length > 0 ? tags : undefined,
      })

      onClose()
      navigate({ to: '/recipes/$recipeId', params: { recipeId } })
    } catch (e) {
      console.error('Failed to save recipe:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60]">
      <div className="bg-cream w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom)+5rem)] sm:pb-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            value={editableTitle}
            onChange={(e) => setEditableTitle(e.target.value)}
            className="flex-1 text-xl font-display text-espresso bg-transparent border-b border-transparent hover:border-warmgray/30 focus:border-sage focus:outline-none py-1"
            placeholder="Recipe title"
          />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-warmgray/20 flex items-center justify-center shrink-0"
          >
            ×
          </button>
        </div>

        <div className="mb-4 space-y-3">
          <div>
            <label className="text-sm font-semibold text-warmgray uppercase tracking-wide mb-2 flex items-center gap-2">
              Category
              {suggestedCategory && (
                <span className="text-xs font-normal normal-case text-sage">
                  ✨ AI suggested
                </span>
              )}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-warmgray/20 bg-white text-espresso focus:outline-none focus:ring-2 focus:ring-sage"
            >
              <option value="">No category</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Or type a new category..."
              value={
                !allCategories.includes(selectedCategory)
                  ? selectedCategory
                  : ''
              }
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full mt-2 px-3 py-2 rounded-xl border border-warmgray/20 bg-white text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-sage"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-warmgray uppercase tracking-wide mb-2 flex items-center gap-2">
              Tags
              {suggestedTags && suggestedTags.length > 0 && (
                <span className="text-xs font-normal normal-case text-sage">
                  ✨ AI suggested
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sage/20 text-sage-dark text-sm"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-terracotta"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), addTag())
                }
                className="flex-1 px-3 py-2 rounded-xl border border-warmgray/20 bg-white text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-sage"
              />
              <button
                onClick={addTag}
                disabled={!newTag.trim()}
                className="px-4 py-2 rounded-xl bg-sage/10 text-sage-dark text-sm font-medium hover:bg-sage/20 transition-colors disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-warmgray uppercase tracking-wide mb-3">
            Ingredients ({matchedIngredients.length})
          </h3>
          {unmatchedCount > 0 && (
            <p className="text-sm text-terracotta mb-3">
              {unmatchedCount} ingredient{unmatchedCount > 1 ? 's' : ''} need
              linking
            </p>
          )}
          <div className="space-y-2">
            {matchedIngredients.map((match, index) => (
              <IngredientMatchRow
                key={index}
                match={match}
                allIngredients={allIngredients || []}
                onLink={(ing) => handleLinkIngredient(index, ing)}
                onCreateNew={(name, cat) => handleCreateNew(index, name, cat)}
              />
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-warmgray uppercase tracking-wide mb-3">
            Steps ({parsed.steps.length})
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-espresso">
            {parsed.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl border border-warmgray/30 text-espresso hover:bg-warmgray/10 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </div>
  )
}

const IngredientMatchRow = ({
  match,
  allIngredients,
  onLink,
  onCreateNew,
}: {
  match: IngredientMatch
  allIngredients: {
    _id: Id<'ingredients'>
    name: string
    aliases?: string[]
    category: string
  }[]
  onLink: (ing: (typeof allIngredients)[0]) => void
  onCreateNew: (name: string, category: string) => void
}) => {
  const [expanded, setExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newName, setNewName] = useState(match.originalText)
  const [newCategory, setNewCategory] = useState('Other')

  const isMatched = !!match.matchedIngredient
  const isNew = match.isNew

  const filteredIngredients = searchQuery
    ? allIngredients.filter(
        (i) =>
          i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (i.aliases &&
            i.aliases.some((a) =>
              a.toLowerCase().includes(searchQuery.toLowerCase()),
            )),
      )
    : allIngredients.slice(0, 5)

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

  const quantityText = match.quantity
    ? `${match.quantity}${match.unit ? ` ${match.unit}` : ''}`
    : ''

  return (
    <div className="bg-white rounded-xl border border-warmgray/20 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 flex items-center justify-between"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-espresso">
              {match.originalText}
            </span>
            {quantityText && (
              <span className="text-sm text-warmgray">({quantityText})</span>
            )}
          </div>
          {isMatched && (
            <div className="text-xs text-sage mt-1">
              → {match.matchedIngredient!.name}
            </div>
          )}
          {isNew && (
            <div className="text-xs text-sage mt-1">
              → Create: {match.newName}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isMatched || isNew ? (
            <span className="badge badge-sage text-xs">linked</span>
          ) : (
            <span className="badge badge-warning text-xs">unlinked</span>
          )}
          <span className="text-warmgray">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-warmgray/10 p-3 space-y-3">
          <div>
            <input
              type="text"
              placeholder="Search ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-warmgray/20 text-sm focus:outline-none focus:ring-1 focus:ring-sage"
            />
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {filteredIngredients.map((ing) => (
              <button
                key={ing._id}
                onClick={() => {
                  onLink(ing)
                  setExpanded(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  match.matchedIngredient?._id === ing._id
                    ? 'bg-sage/20 text-sage-dark'
                    : 'hover:bg-warmgray/10'
                }`}
              >
                {ing.name}
                {ing.aliases && ing.aliases.length > 0 && (
                  <span className="text-warmgray ml-2 text-xs">
                    ({ing.aliases.slice(0, 2).join(', ')})
                  </span>
                )}
              </button>
            ))}
          </div>
          <DemoGuard action="Creating ingredients">
            <div className="border-t border-warmgray/10 pt-3">
              <p className="text-xs text-warmgray mb-2">
                Or create new ingredient:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name"
                  className="flex-1 px-3 py-2 rounded-lg border border-warmgray/20 text-sm focus:outline-none focus:ring-1 focus:ring-sage"
                />
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-warmgray/20 text-sm focus:outline-none focus:ring-1 focus:ring-sage"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  onCreateNew(newName, newCategory)
                  setExpanded(false)
                }}
                disabled={!newName.trim()}
                className="w-full mt-2 py-2 rounded-lg bg-sage/10 text-sage-dark text-sm font-medium hover:bg-sage/20 transition-colors disabled:opacity-50"
              >
                Create "{newName}"
              </button>
            </div>
          </DemoGuard>
        </div>
      )}
    </div>
  )
}

const INITIAL_DISPLAY_COUNT = 24
const LOAD_MORE_COUNT = 24

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

const Recipes = () => {
  const recipes = useQuery(api.recipes.list)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<Array<string>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const debouncedSearch = useDebounce(searchQuery, 300)

  const categories = useMemo(() => {
    if (!recipes) return []
    const categoryMap = new Map<string, number>()
    recipes.forEach((r) => {
      if (r.category) {
        categoryMap.set(r.category, (categoryMap.get(r.category) || 0) + 1)
      }
    })
    return Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [recipes])

  const recipesInCategory = useMemo(() => {
    if (!recipes) return []
    return selectedCategory
      ? recipes.filter((r) => r.category === selectedCategory)
      : recipes
  }, [recipes, selectedCategory])

  const availableTags = useMemo(() => {
    const tagMap = new Map<string, number>()
    recipesInCategory.forEach((r) => {
      r.tags?.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
      })
    })
    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [recipesInCategory])

  const filteredRecipes = useMemo(() => {
    if (!recipes) return undefined
    return recipes.filter((r) => {
      if (selectedCategory && r.category !== selectedCategory) return false
      if (selectedTags.length > 0 && !selectedTags.every((t) => r.tags?.includes(t)))
        return false
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase()
        const matchesTitle = r.title.toLowerCase().includes(query)
        const matchesIngredients = r.parsedIngredients.some((ing) =>
          ing.originalText.toLowerCase().includes(query)
        )
        const matchesTags = r.tags?.some((tag) =>
          tag.toLowerCase().includes(query)
        )
        if (!matchesTitle && !matchesIngredients && !matchesTags) return false
      }
      return true
    })
  }, [recipes, selectedCategory, selectedTags, debouncedSearch])

  const displayedRecipes = useMemo(() => {
    return filteredRecipes?.slice(0, displayCount)
  }, [filteredRecipes, displayCount])

  const hasMore = filteredRecipes && displayCount < filteredRecipes.length

  useEffect(() => {
    setDisplayCount(INITIAL_DISPLAY_COUNT)
  }, [selectedCategory, selectedTags, debouncedSearch])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => prev + LOAD_MORE_COUNT)
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore])

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }, [])

  const handleClearFilters = useCallback(() => {
    setSelectedCategory(null)
    setSelectedTags([])
    setSearchQuery('')
  }, [])

  const hasActiveFilters = selectedCategory || selectedTags.length > 0 || searchQuery

  return (
    <>
      <header className="recipes-header">
        <div className="recipes-header-content">
          <h1 className="recipes-header-title">Recipes</h1>
          <DemoGuard action="Adding recipes">
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              + Add
            </button>
          </DemoGuard>
        </div>
      </header>

      <div className="recipes-mobile-search">
        <div className="recipes-mobile-search-inner">
          <Search className="recipes-mobile-search-icon" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="recipes-mobile-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="recipes-mobile-search-clear"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={() => setShowFilterDrawer(true)}
            className={`recipes-mobile-filter-btn ${hasActiveFilters ? 'active' : ''}`}
            aria-label="Open filters"
          >
            <SlidersHorizontal size={20} />
            {(selectedCategory || selectedTags.length > 0) && (
              <span className="recipes-mobile-filter-badge">
                {(selectedCategory ? 1 : 0) + selectedTags.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="recipes-page-layout">
        <RecipeFilterSidebar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          tags={availableTags}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
          onClearFilters={handleClearFilters}
          totalCount={recipes?.length || 0}
          filteredCount={filteredRecipes?.length || 0}
        />

        <main className="recipes-main">
          {filteredRecipes === undefined ? (
            <div className="recipe-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <RecipeCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="recipes-empty">
              {recipes && recipes.length > 0 ? (
                <>
                  <p className="recipes-empty-text">No recipes match your filters.</p>
                  <button onClick={handleClearFilters} className="recipes-empty-btn">
                    Clear all filters
                  </button>
                </>
              ) : (
                <>
                  <p className="recipes-empty-text">No recipes yet.</p>
                  <DemoGuard action="Adding recipes">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="btn-primary"
                    >
                      Add your first recipe
                    </button>
                  </DemoGuard>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="recipes-results-header">
                <span className="recipes-results-count">
                  Showing {displayedRecipes?.length} of {filteredRecipes.length} recipes
                </span>
              </div>
              <div className="recipe-grid">
                {displayedRecipes?.map((recipe) => (
                  <RecipeCard key={recipe._id} recipe={recipe} />
                ))}
              </div>
              {hasMore && (
                <div ref={sentinelRef} className="recipes-load-more">
                  <div className="recipe-grid">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <RecipeCardSkeleton key={i} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <RecipeFilterDrawer
        isOpen={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        tags={availableTags}
        selectedTags={selectedTags}
        onTagToggle={handleTagToggle}
        onClearFilters={handleClearFilters}
        totalCount={recipes?.length || 0}
      />

      <div className="recipes-fab">
        <DemoGuard action="Adding recipes">
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            + Add Recipe
          </button>
        </DemoGuard>
      </div>

      {showAddModal && (
        <AddRecipeModal onClose={() => setShowAddModal(false)} />
      )}
    </>
  )
}

export const Route = createFileRoute('/recipes')({
  component: Recipes,
})
