import { Search, X } from 'lucide-react'
import { Input } from '../../../shared/ui/Input'
import { PROJECT_SEARCH_TEXTS } from '../constants'

export type ProjectSearchProps = {
  value: string
  onChange: (value: string) => void
}

export function ProjectSearch({ value, onChange }: ProjectSearchProps) {
  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={PROJECT_SEARCH_TEXTS.placeholder}
        aria-label={PROJECT_SEARCH_TEXTS.label}
        className="pr-9 pl-9"
      />
      {value !== '' && (
        <button
          type="button"
          aria-label={PROJECT_SEARCH_TEXTS.clear}
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}