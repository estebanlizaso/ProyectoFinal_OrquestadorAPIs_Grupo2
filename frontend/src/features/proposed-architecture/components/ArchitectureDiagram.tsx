import { Card } from '../../../shared/ui/Card'
import { PROPOSED_ARCHITECTURE_PAGE_TEXTS } from '../constants'

export function ArchitectureDiagram() {
  return (
    <Card className="flex min-h-[60vh] items-center justify-center p-6 lg:col-span-2">
      <p className="text-sm text-gray-400">{PROPOSED_ARCHITECTURE_PAGE_TEXTS.diagramEmpty}</p>
    </Card>
  )
}
