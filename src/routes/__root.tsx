import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
  useNavigate,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import appCss from '~/styles/app.css?url'
import { Navigation } from '~/components/Navigation'
import { AppInitializer } from '~/components/AppInitializer'

const RootDocument = ({ children }: { children: React.ReactNode }) => (
  <html>
    <head>
      <HeadContent />
    </head>
    <body>
      {children}
      <Scripts />
    </body>
  </html>
)

const AUTH_ROUTES = ['/sign-in', '/sign-up']

const RootComponent = () => {
  const { isSignedIn, isLoaded } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthRoute = AUTH_ROUTES.includes(location.pathname)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn && !isAuthRoute) {
      navigate({ to: '/sign-in' })
    }
    if (isSignedIn && isAuthRoute) {
      navigate({ to: '/' })
    }
  }, [isLoaded, isSignedIn, isAuthRoute, navigate])

  if (!isLoaded) {
    return (
      <RootDocument>
        <div className="min-h-screen flex items-center justify-center bg-cream">
          <div className="text-warmgray animate-pulse">Loading...</div>
        </div>
      </RootDocument>
    )
  }

  if (isAuthRoute) {
    return (
      <RootDocument>
        <Outlet />
      </RootDocument>
    )
  }

  return (
    <RootDocument>
      <AppInitializer />
      <main className="main-content">
        <Outlet />
      </main>
      <Navigation />
    </RootDocument>
  )
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'PantryPilot',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  notFoundComponent: () => <div>Route not found</div>,
  component: RootComponent,
})
