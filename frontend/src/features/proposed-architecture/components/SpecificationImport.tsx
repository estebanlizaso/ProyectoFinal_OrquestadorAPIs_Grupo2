import { Button } from '../../../shared/ui/Button'
import { MODULE_DETAIL_TEXTS } from '../constants'

export function SpecificationImport() {
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-900">{MODULE_DETAIL_TEXTS.specificationTitle}</h3>
      <div className="mt-3 flex flex-col items-center rounded-xl border border-primary-blue bg-primary-blue-light/40 px-6 py-8 text-center">
        <p className="text-sm font-semibold text-primary-blue">{MODULE_DETAIL_TEXTS.importTitle}</p>
        <p className="mt-1 text-xs text-gray-500">{MODULE_DETAIL_TEXTS.importDescription}</p>
        <Button variant="secondary" className="mt-4" disabled>
          {MODULE_DETAIL_TEXTS.selectFile}
        </Button>
      </div>
    </section>
  )
}
