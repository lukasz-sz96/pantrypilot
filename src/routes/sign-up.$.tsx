import { createFileRoute } from '@tanstack/react-router'
import { SignUp } from '@clerk/clerk-react'

const SignUpCatchAll = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-4">
      <div className="mb-8 text-center">
        <h1 className="font-display text-4xl text-espresso mb-2">
          PantryPilot
        </h1>
        <p className="text-warmgray">Your kitchen companion</p>
      </div>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        appearance={{
          elements: {
            rootBox: 'w-full max-w-md',
            card: 'bg-white rounded-2xl shadow-lg border border-cream-dark',
            headerTitle: 'font-display text-espresso',
            headerSubtitle: 'text-warmgray',
            formButtonPrimary: 'bg-sage hover:bg-sage-dark',
            formFieldInput:
              'rounded-xl border-warmgray/30 focus:border-sage focus:ring-sage',
            footerActionLink: 'text-sage hover:text-sage-dark',
          },
          variables: {
            colorPrimary: '#7C9A82',
            colorText: '#3D2F2A',
            colorTextSecondary: '#9C8B82',
            colorBackground: '#FFFFFF',
            colorInputBackground: '#FFFFFF',
            colorInputText: '#3D2F2A',
            borderRadius: '0.75rem',
          },
        }}
      />
    </div>
  )
}

export const Route = createFileRoute('/sign-up/$')({
  component: SignUpCatchAll,
})
