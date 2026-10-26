import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
      <Link to="/" className="text-sm text-slate-600 underline">
        Back to home
      </Link>
    </main>
  )
}
