import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Master Any Subject with Spaced Repetition
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Learn faster and remember longer with intelligent flashcards
          </p>
          <div className="space-x-4">
            <Link
              href="/auth"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/dashboard"
              className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold border border-blue-600 hover:bg-blue-50 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}