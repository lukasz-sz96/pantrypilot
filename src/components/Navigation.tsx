import { Link, useLocation } from '@tanstack/react-router'
import { UserButton } from '@clerk/clerk-react'

const ChefHatIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21H7c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1z" />
    <path d="M6 17V9c0-2.8 2.2-5 5-5h2c2.8 0 5 2.2 5 5v8" />
    <path d="M6 9c-1.7 0-3 1.3-3 3s1.3 3 3 3" />
    <path d="M18 9c1.7 0 3 1.3 3 3s-1.3 3-3 3" />
  </svg>
)

const PantryIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="9" x2="9" y2="15" />
    <line x1="15" y1="9" x2="15" y2="15" />
    <circle cx="6" cy="6" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="18" cy="18" r="1" fill="currentColor" />
  </svg>
)

const BookIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
)

const CartIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 6h15l-1.5 9h-12z" />
    <circle cx="9" cy="20" r="1.5" fill="currentColor" />
    <circle cx="17" cy="20" r="1.5" fill="currentColor" />
    <path d="M3 3h2l.5 3" />
  </svg>
)

const navItems = [
  { to: '/', label: 'Cook', icon: ChefHatIcon },
  { to: '/pantry', label: 'Pantry', icon: PantryIcon },
  { to: '/recipes', label: 'Recipes', icon: BookIcon },
  { to: '/shopping', label: 'Shopping', icon: CartIcon },
] as const

export const Navigation = () => {
  const location = useLocation()

  return (
    <nav className="nav-bar">
      <div className="nav-bar-inner">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive =
            location.pathname === to ||
            (to !== '/' && location.pathname.startsWith(to))

          return (
            <Link
              key={to}
              to={to}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" />
              <span className="nav-label">{label}</span>
            </Link>
          )
        })}
        <Link
          to="/account"
          className={`nav-item nav-user ${location.pathname === '/account' ? 'active' : ''}`}
        >
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-7 h-7',
              },
            }}
          />
          <span className="nav-label">Account</span>
        </Link>
      </div>
    </nav>
  )
}
