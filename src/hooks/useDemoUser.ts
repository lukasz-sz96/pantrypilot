import { useUser } from '@clerk/clerk-react'

type UserRole = 'demo' | 'user' | 'admin'

export const useDemoUser = () => {
  const { user, isLoaded } = useUser()
  const role = (user?.publicMetadata?.role as UserRole) ?? 'user'
  return {
    isDemoUser: role === 'demo',
    isAdmin: role === 'admin',
    role,
    isLoaded,
  }
}
