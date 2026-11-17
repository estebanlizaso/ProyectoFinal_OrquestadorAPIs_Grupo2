import { CircleCheck, RotateCcw } from 'lucide-react'
import { cn } from '../../../shared/lib/cn'
import { Button } from '../../../shared/ui/Button'
import { ProgressBar } from '../../../shared/ui/ProgressBar'
import { SidePanel } from '../../../shared/ui/SidePanel'
import { buildSolutionStatus } from '../buildSolutionStatus'
import { GENERATION_PROGRESS_TEXTS } from '../constants'
import { getGenerationStage } from '../getGenerationStage'
import type { GenerationPhase } from '../useArchitectureGeneration'

export type GenerationProgressPanelProps = {
  progress: number
  phase: GenerationPhase
  languageLabel: string | null
  errorMessage: string | null
  onRetry: () => void
}

export function GenerationProgressPanel({
  progress,
  phase,
  languageLabel,
  errorMessage,
  onRetry,
}: GenerationProgressPanelProps) {
  const isCompleted = phase === 'completed'

  return (
    <SidePanel title={GENERATION_PROGRESS_TEXTS.title}>
      <ProgressBar value={progress} label={GENERATION_PROGRESS_TEXTS.progressLabel} />
      <p className="mt-3 text-sm text-gray-500" aria-live="polite">
        {isCompleted ? GENERATION_PROGRESS_TEXTS.openingResults : getGenerationStage(progress)}
      </p>
      {phase === 'failed' ? (
        <div className="mt-12 flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-red-600">
            {errorMessage}
          </p>
          <Button variant="secondary" onClick={onRetry}>
            <RotateCcw className="size-4" aria-hidden="true" />
            {GENERATION_PROGRESS_TEXTS.retry}
          </Button>
        </div>
      ) : (
        <p
          className={cn(
            'mt-12 flex items-center gap-2 text-sm font-medium',
            isCompleted ? 'text-green-600' : 'text-primary-blue',
          )}
        >
          {isCompleted ? (
            <CircleCheck className="size-4 animate-fade-in" aria-hidden="true" />
          ) : (
            <span className="size-2 animate-pulse rounded-full bg-primary-blue" aria-hidden="true" />
          )}
          {buildSolutionStatus(languageLabel, isCompleted)}
        </p>
      )}
    </SidePanel>
  )
}
