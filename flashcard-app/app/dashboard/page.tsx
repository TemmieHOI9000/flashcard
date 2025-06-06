'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Deck {
  id: string
  title: string
  description: string
  created_at: string
  cards_count?: number
}

export default function Dashboard() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [decks, setDecks] = useState<Deck[]>([])
  const [loadingDecks, setLoadingDecks] = useState(true)

  // Debug logs to help identify the issue
  useEffect(() => {
    console.log('Dashboard: user =', user)
    console.log('Dashboard: loading =', loading)
  }, [user, loading])

  useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log('No user found, redirecting to /auth')
        router.push('/auth')
      } else {
        console.log('User found:', user.email)
      }
    }
  }, [user, loading, router])

  const fetchDecks = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID available for fetching decks')
      setLoadingDecks(false)
      return
    }

    try {
      console.log('Fetching decks for user:', user.id)
      
      // First, let's try a simpler query to test the connection
      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching decks:', error)
        throw error
      }
      
      console.log('Fetched decks:', data)
      
      // For now, let's not worry about card counts and just get basic deck info
      setDecks(data || [])
    } catch (error) {
      console.error('Error fetching decks:', error)
      // Don't throw here, just log and continue
    } finally {
      setLoadingDecks(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id && !loading) {
      fetchDecks()
    }
  }, [fetchDecks, user?.id, loading])

  // Show loading while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if no user (will redirect)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">My Flashcards</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.email}</span>
              <button
                onClick={signOut}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Your Decks</h2>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700">
              Create New Deck
            </button>
          </div>

          {loadingDecks ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Loading decks...</p>
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You don&apos;t have any decks yet.</p>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700">
                Create Your First Deck
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {decks.map((deck) => (
                <div key={deck.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{deck.title}</h3>
                  <p className="text-gray-600 mb-4">{deck.description || 'No description'}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{deck.cards_count || 0} cards</span>
                    <span>{new Date(deck.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm font-medium hover:bg-green-700">
                      Study
                    </button>
                    <button className="flex-1 bg-gray-600 text-white py-2 px-3 rounded text-sm font-medium hover:bg-gray-700">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}