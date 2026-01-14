import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
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

const RootComponent = () => (
  <RootDocument>
    <AppInitializer />
    <main className="main-content">
      <Outlet />
    </main>
    <Navigation />
  </RootDocument>
)

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
