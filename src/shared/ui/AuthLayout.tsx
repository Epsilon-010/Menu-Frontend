import { ForkKnifeIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

/** Sign in and sign-up layout: the product pitch on wide screens, the form on the right. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-[#181818] p-12 text-white lg:flex">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950">
          <ForkKnifeIcon size={20} weight="bold" aria-hidden />
        </span>
        <div className="max-w-[680px] space-y-4">
          <h1 className="bg-gradient-to-r from-white to-[#9B9B9B] bg-clip-text text-5xl font-semibold tracking-tight text-transparent">
            Every table orders on its own.
            <br />
            The kitchen hears it at once.
          </h1>
          <p className="max-w-[680px] text-lg text-zinc-400">
            Guests build their order from the tablet, the kitchen releases each dish when it is ready and the waiter
            brings it to the right table.
          </p>
        </div>
        <p className="text-sm text-zinc-500">Menu for restaurants</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-6">{children}</section>
    </main>
  )
}

/** The small logo above the form title, only where the pitch panel is hidden. */
export function AuthLogo() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white lg:hidden">
      <ForkKnifeIcon size={20} weight="bold" aria-hidden />
    </span>
  )
}
