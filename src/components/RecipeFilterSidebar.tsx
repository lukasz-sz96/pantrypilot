import { Search, X } from 'lucide-react'

type Props = {
  searchQuery: string
  onSearchChange: (query: string) => void
  categories: Array<{ name: string; count: number }>
  selectedCategory: string | null
  onCategoryChange: (category: string | null) => void
  tags: Array<{ name: string; count: number }>
  selectedTags: Array<string>
  onTagToggle: (tag: string) => void
  onClearFilters: () => void
  totalCount: number
  filteredCount: number
}

export const RecipeFilterSidebar = ({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  tags,
  selectedTags,
  onTagToggle,
  onClearFilters,
  totalCount,
  filteredCount,
}: Props) => {
  const hasActiveFilters = selectedCategory || selectedTags.length > 0 || searchQuery

  return (
    <aside className="recipe-sidebar">
      <div className="recipe-sidebar-inner">
        <div className="recipe-sidebar-search">
          <Search className="recipe-sidebar-search-icon" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="recipe-sidebar-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="recipe-sidebar-search-clear"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="recipe-sidebar-active">
            <div className="recipe-sidebar-active-header">
              <span className="recipe-sidebar-active-count">
                {filteredCount} of {totalCount} recipes
              </span>
              <button onClick={onClearFilters} className="recipe-sidebar-clear-btn">
                Clear all
              </button>
            </div>
            <div className="recipe-sidebar-active-chips">
              {selectedCategory && (
                <button
                  onClick={() => onCategoryChange(null)}
                  className="recipe-sidebar-chip"
                >
                  {selectedCategory}
                  <X size={14} />
                </button>
              )}
              {selectedTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onTagToggle(tag)}
                  className="recipe-sidebar-chip"
                >
                  {tag}
                  <X size={14} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="recipe-sidebar-section">
          <h3 className="recipe-sidebar-heading">Categories</h3>
          <ul className="recipe-sidebar-list">
            <li>
              <button
                onClick={() => onCategoryChange(null)}
                className={`recipe-sidebar-item ${selectedCategory === null ? 'active' : ''}`}
              >
                <span className="recipe-sidebar-item-radio">
                  {selectedCategory === null && <span className="recipe-sidebar-item-radio-dot" />}
                </span>
                <span className="recipe-sidebar-item-label">All Recipes</span>
                <span className="recipe-sidebar-item-count">{totalCount}</span>
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat.name}>
                <button
                  onClick={() => onCategoryChange(cat.name === selectedCategory ? null : cat.name)}
                  className={`recipe-sidebar-item ${selectedCategory === cat.name ? 'active' : ''}`}
                >
                  <span className="recipe-sidebar-item-radio">
                    {selectedCategory === cat.name && <span className="recipe-sidebar-item-radio-dot" />}
                  </span>
                  <span className="recipe-sidebar-item-label">{cat.name}</span>
                  <span className="recipe-sidebar-item-count">{cat.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {tags.length > 0 && (
          <div className="recipe-sidebar-section">
            <h3 className="recipe-sidebar-heading">Tags</h3>
            <ul className="recipe-sidebar-list">
              {tags.map((tag) => (
                <li key={tag.name}>
                  <button
                    onClick={() => onTagToggle(tag.name)}
                    className={`recipe-sidebar-item checkbox ${selectedTags.includes(tag.name) ? 'active' : ''}`}
                  >
                    <span className="recipe-sidebar-item-checkbox">
                      {selectedTags.includes(tag.name) && (
                        <svg viewBox="0 0 12 12" className="recipe-sidebar-item-check">
                          <path d="M2 6l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="recipe-sidebar-item-label">{tag.name}</span>
                    <span className="recipe-sidebar-item-count">{tag.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  )
}
