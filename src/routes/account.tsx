import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { UserProfile, useAuth, useUser } from '@clerk/clerk-react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'

const AccountPage = () => {
  const { signOut } = useAuth()
  const { user } = useUser()
  const navigate = useNavigate()
  const deleteAllData = useMutation(api.users.deleteAllData)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    setDeleting(true)
    try {
      await deleteAllData()
      await user?.delete()
      navigate({ to: '/sign-in' })
    } catch (e) {
      console.error('Failed to delete account:', e)
      setDeleting(false)
    }
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Account</h1>
      </header>

      <div className="content-section py-4 space-y-6">
        <div className="card">
          <UserProfile
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none p-0',
                navbar: 'hidden',
                pageScrollBox: 'p-0',
                profileSection: 'border-cream-dark',
                formButtonPrimary: 'bg-sage hover:bg-sage-dark',
                formFieldInput: 'rounded-xl border-warmgray/30 focus:border-sage focus:ring-sage',
              },
              variables: {
                colorPrimary: '#7C9A82',
                colorText: '#3D2F2A',
                colorTextSecondary: '#9C8B82',
                borderRadius: '0.75rem',
              },
            }}
          />
        </div>

        <div className="card space-y-4">
          <h2 className="font-display text-lg text-espresso">Danger Zone</h2>

          <button
            onClick={() => signOut()}
            className="w-full py-3 rounded-xl border border-warmgray/30 text-espresso hover:bg-warmgray/10 transition-colors"
          >
            Sign Out
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 rounded-xl text-terracotta border border-terracotta/30 hover:bg-terracotta/10 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-cream rounded-2xl p-6 max-w-sm w-full">
            <h2 className="font-display text-xl text-espresso mb-2">Delete Account?</h2>
            <p className="text-warmgray mb-4">
              This will permanently delete your account and all your data (recipes, pantry items, shopping lists). This cannot be undone.
            </p>
            <p className="text-sm text-espresso mb-2">
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-warmgray/30 bg-white focus:outline-none focus:ring-2 focus:ring-terracotta mb-4"
              placeholder="DELETE"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                className="flex-1 py-3 rounded-xl border border-warmgray/30 text-espresso hover:bg-warmgray/10"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                className="flex-1 py-3 rounded-xl bg-terracotta text-white font-medium hover:bg-terracotta/90 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export const Route = createFileRoute('/account')({
  component: AccountPage,
})
