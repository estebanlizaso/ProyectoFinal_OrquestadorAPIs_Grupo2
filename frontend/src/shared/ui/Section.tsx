import { useId, type ReactNode } from 'react'

export type SectionProps = {
  title: string
  children: ReactNode
}

export function Section({ title, children }: SectionProps) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="mb-4 text-lg leading-none font-bold text-gray-900">
        {title}
      </h2>
      {children}
    </section>
  )
}
