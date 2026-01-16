import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { routeTree } from './routeTree.gen'

declare global {
  interface Window {
    __CONFIG__?: { CONVEX_URL: string; CLERK_PUBLISHABLE_KEY: string }
  }
}

const getConfig = () => {
  if (typeof window !== 'undefined' && window.__CONFIG__) {
    return window.__CONFIG__
  }
  if (typeof process !== 'undefined' && process.env) {
    return {
      CONVEX_URL:
        process.env.CONVEX_URL || import.meta.env.VITE_CONVEX_URL || '',
      CLERK_PUBLISHABLE_KEY:
        process.env.CLERK_PUBLISHABLE_KEY ||
        import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
        '',
    }
  }
  return {
    CONVEX_URL: import.meta.env.VITE_CONVEX_URL || '',
    CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '',
  }
}

const config = getConfig()
const CONVEX_URL = config.CONVEX_URL
const CLERK_PUBLISHABLE_KEY = config.CLERK_PUBLISHABLE_KEY

export function getRouter() {
  if (!CONVEX_URL) {
    console.error('missing envar CONVEX_URL')
  }
  if (!CLERK_PUBLISHABLE_KEY) {
    console.error('missing envar VITE_CLERK_PUBLISHABLE_KEY')
  }
  const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        gcTime: 5000,
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: 'intent',
      context: { queryClient },
      scrollRestoration: true,
      defaultPreloadStaleTime: 0,
      defaultErrorComponent: (err) => <p>{err.error.stack}</p>,
      defaultNotFoundComponent: () => <p>not found</p>,
      Wrap: ({ children }) => (
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
          <ConvexProviderWithClerk
            client={convexQueryClient.convexClient}
            useAuth={useAuth}
          >
            {children}
          </ConvexProviderWithClerk>
        </ClerkProvider>
      ),
    }),
    queryClient,
  )

  return router
}
