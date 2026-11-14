import { ArrowLeft } from 'lucide-react'

export type BackButtonProps = {
  label: string
  onClick: () => void
}

export function BackButton({ label, onClick }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-primary-blue"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </button>
  )
}
