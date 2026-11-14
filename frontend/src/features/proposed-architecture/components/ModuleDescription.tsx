import { MODULE_DETAIL_TEXTS } from '../constants'

export type ModuleDescriptionProps = {
  description: string | null
}

export function ModuleDescription({ description }: ModuleDescriptionProps) {
  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-gray-900">{MODULE_DETAIL_TEXTS.descriptionTitle}</h3>
      <p className="mt-2 text-sm whitespace-pre-wrap text-gray-600">
        {description || MODULE_DETAIL_TEXTS.descriptionEmpty}
      </p>
    </section>
  )
}
