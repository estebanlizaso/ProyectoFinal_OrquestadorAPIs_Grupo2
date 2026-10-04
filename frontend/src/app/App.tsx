import { APP_TEXTS } from './constants'

export function App() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">{APP_TEXTS.title}</h1>
    </main>
  )
}
