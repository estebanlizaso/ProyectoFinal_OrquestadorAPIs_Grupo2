import { LoaderCircle } from 'lucide-react'
import type { RequestStatus } from '../../../shared/api/requestStatus'
import { Button } from '../../../shared/ui/Button'
import { CONTEXT_CHAT_TEXTS } from '../constants'

export type HistoryLoadStatusProps = {
  status: RequestStatus
  onRetry: () => void
}

export function HistoryLoadStatus({ status, onRetry }: HistoryLoadStatusProps) {
  if (status === 'error') {
    return (
      <div role="alert" className="flex items-center justify-between gap-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        <p className="font-semibold">{CONTEXT_CHAT_TEXTS.historyError}</p>
        <Button variant="secondary" onClick={onRetry}>
          {CONTEXT_CHAT_TEXTS.historyRetry}
        </Button>
      </div>
    )
  }

  return (
    <p role="status" className="flex items-center gap-2 text-sm text-gray-400">
      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      {CONTEXT_CHAT_TEXTS.historyLoading}
    </p>
  )
}
