import { X } from 'lucide-react'
import { useEffect } from 'react'

type Props = {
  isOpen: boolean
  onClose: () => void
  categories: Array<{ name: string; count: number }>
  selectedCategory: string | null
  onCategoryChange: (category: string | null) => void
  tags: Array<{ name: string; count: number }>
  selectedTags: Array<string>
  onTagToggle: (tag: string) => void
  onClearFilters: () => void
  totalCount: number
}

export const RecipeFilterDrawer = ({
  isOpen,
  onClose,
  categories,
  selectedCategory,
  onCategoryChange,
  tags,
  selectedTags,
  onTagToggle,
  onClearFilters,
  totalCount,
}: Props) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const hasActiveFilters = selectedCategory || selectedTags.length > 0

  if (!isOpen) return null

  return (
    <div className="filter-drawer-overlay" onClick={onClose}>
      <div
        className="filter-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="filter-drawer-header">
          <h2 className="filter-drawer-title">Filters</h2>
          <button onClick={onClose} className="filter-drawer-close" aria-label="Close">
            <X size={24} />
          </button>
        </div>

        <div className="filter-drawer-content">
          <div className="filter-drawer-section">
            <h3 className="filter-drawer-heading">Categories</h3>
            <div className="filter-drawer-options">
              <button
                onClick={() => onCategoryChange(null)}
                className={`filter-drawer-option ${selectedCategory === null ? 'active' : ''}`}
              >
                <span className="filter-drawer-radio">
                  {selectedCategory === null && <span className="filter-drawer-radio-dot" />}
                </span>
                <span>All Recipes</span>
                <span className="filter-drawer-count">{totalCount}</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => onCategoryChange(cat.name === selectedCategory ? null : cat.name)}
                  className={`filter-drawer-option ${selectedCategory === cat.name ? 'active' : ''}`}
                >
                  <span className="filter-drawer-radio">
                    {selectedCategory === cat.name && <span className="filter-drawer-radio-dot" />}
                  </span>
                  <span>{cat.name}</span>
                  <span className="filter-drawer-count">{cat.count}</span>
                </button>
              ))}
            </div>
          </div>

          {tags.length > 0 && (
            <div className="filter-drawer-section">
              <h3 className="filter-drawer-heading">Tags</h3>
              <div className="filter-drawer-options">
                {tags.map((tag) => (
                  <button
                    key={tag.name}
                    onClick={() => onTagToggle(tag.name)}
                    className={`filter-drawer-option ${selectedTags.includes(tag.name) ? 'active' : ''}`}
                  >
                    <span className="filter-drawer-checkbox">
                      {selectedTags.includes(tag.name) && (
                        <svg viewBox="0 0 12 12" className="filter-drawer-check">
                          <path d="M2 6l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span>{tag.name}</span>
                    <span className="filter-drawer-count">{tag.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="filter-drawer-footer">
          {hasActiveFilters && (
            <button onClick={onClearFilters} className="filter-drawer-clear">
              Clear all filters
            </button>
          )}
          <button onClick={onClose} className="filter-drawer-apply">
            Show Results
          </button>
        </div>
      </div>
    </div>
  )
}
