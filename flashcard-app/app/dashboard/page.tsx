'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading, router])

const fetchDecks = async () => {
  try {
    const { data, error } = await supabase
      .from('decks')
      .select(`
        *,
        cards(count)
      `)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    const decksWithCount = data.map(deck => ({
      ...deck,
      cards_count: deck.cards?.[0]?.count || 0
    }))
    
    setDecks(decksWithCount)
  } catch (error) {
    console.error('Error fetching decks:', error)
  } finally {
    setLoadingDecks(false)
  }
}

useEffect(() => {
  fetchDecks()
}, [fetchDecks])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return null
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
            <div className="text-center py-8">Loading decks...</div>
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
                    <span>{deck.cards_count} cards</span>
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