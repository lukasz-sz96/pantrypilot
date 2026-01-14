import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useState } from 'react'

const Shopping = () => {
  const lists = useQuery(api.shoppingLists.list)
  const ingredients = useQuery(api.ingredients.list)
  const createList = useMutation(api.shoppingLists.create)
  const removeList = useMutation(api.shoppingLists.remove)
  const toggleItem = useMutation(api.shoppingLists.toggleItem)
  const removeItem = useMutation(api.shoppingLists.removeItem)

  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [expandedList, setExpandedList] = useState<Id<'shoppingLists'> | null>(null)

  const getIngredientName = (ingredientId: Id<'ingredients'>) => {
    return ingredients?.find((i) => i._id === ingredientId)?.name || 'Unknown'
  }

  const handleCreateList = async () => {
    if (!newListName.trim()) return
    await createList({ name: newListName.trim() })
    setNewListName('')
    setShowNewList(false)
  }

  if (lists === undefined) {
    return (
      <>
        <header className="page-header">
          <h1 className="page-title">Shopping Lists</h1>
        </header>
        <div className="px-4 py-8 text-center">
          <div className="animate-pulse text-warmgray">Loading...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <header className="page-header">
        <div className="flex items-center justify-between">
          <h1 className="page-title">Shopping Lists</h1>
          <button
            onClick={() => setShowNewList(true)}
            className="btn-primary"
          >
            + New
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {showNewList && (
          <div className="card">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name..."
              className="w-full px-4 py-3 rounded-xl border border-warmgray/30 bg-white focus:outline-none focus:ring-2 focus:ring-sage mb-3"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewList(false)}
                className="flex-1 py-2 rounded-xl border border-warmgray/30 text-espresso"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateList}
                disabled={!newListName.trim()}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {lists.length === 0 && !showNewList ? (
          <div className="text-center py-8">
            <p className="text-warmgray mb-4">No shopping lists yet.</p>
            <button
              onClick={() => setShowNewList(true)}
              className="btn-primary"
            >
              Create your first list
            </button>
          </div>
        ) : (
          lists.map((list) => {
            const isExpanded = expandedList === list._id
            const checkedCount = list.items.filter((i) => i.checked).length
            const totalCount = list.items.length

            return (
              <div key={list._id} className="card">
                <button
                  onClick={() => setExpandedList(isExpanded ? null : list._id)}
                  className="w-full text-left flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-display text-lg text-espresso">{list.name}</h3>
                    <p className="text-sm text-warmgray">
                      {totalCount === 0
                        ? 'Empty'
                        : `${checkedCount}/${totalCount} items checked`}
                    </p>
                  </div>
                  <span className="text-warmgray">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-warmgray/20">
                    {list.items.length === 0 ? (
                      <p className="text-warmgray text-sm text-center py-4">
                        No items in this list.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {list.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-warmgray/5"
                          >
                            <button
                              onClick={() => toggleItem({ listId: list._id, itemIndex: idx })}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                item.checked
                                  ? 'bg-sage border-sage text-white'
                                  : 'border-warmgray/30'
                              }`}
                            >
                              {item.checked && '✓'}
                            </button>
                            <span
                              className={`flex-1 ${
                                item.checked ? 'line-through text-warmgray' : 'text-espresso'
                              }`}
                            >
                              {item.quantity} {item.unit} {getIngredientName(item.ingredientId)}
                            </span>
                            <button
                              onClick={() => removeItem({ listId: list._id, itemIndex: idx })}
                              className="text-warmgray hover:text-terracotta"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-warmgray/20">
                      <button
                        onClick={() => removeList({ id: list._id })}
                        className="text-sm text-terracotta hover:underline"
                      >
                        Delete list
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

export const Route = createFileRoute('/shopping')({
  component: Shopping,
})
