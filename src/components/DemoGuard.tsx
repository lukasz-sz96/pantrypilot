import { useDemoUser } from '~/hooks/useDemoUser'
import { Tooltip } from '~/components/Tooltip'

interface DemoGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  action?: string
  className?: string
}

export const DemoGuard = ({
  children,
  fallback,
  action = 'This action',
  className = '',
}: DemoGuardProps) => {
  const { isDemoUser } = useDemoUser()

  if (!isDemoUser) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <Tooltip content={`${action} is disabled for demo accounts`}>
      <div
        className={`opacity-50 cursor-not-allowed select-none ${className}`}
        onClick={(e) => e.preventDefault()}
        onKeyDown={(e) => e.preventDefault()}
      >
        {children}
      </div>
    </Tooltip>
  )
}
