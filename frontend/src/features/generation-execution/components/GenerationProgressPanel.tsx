import { cn } from '../../../shared/lib/cn'
import { ProgressBar } from '../../../shared/ui/ProgressBar'
import { SidePanel } from '../../../shared/ui/SidePanel'
import { buildSolutionStatus } from '../buildSolutionStatus'
import { GENERATION_PROGRESS_TEXTS, PROGRESS_COMPLETE } from '../constants'
import { getGenerationStage } from '../getGenerationStage'

export type GenerationProgressPanelProps = {
  progress: number
  languageLabel: string | null
}

export function GenerationProgressPanel({ progress, languageLabel }: GenerationProgressPanelProps) {
  const isCompleted = progress >= PROGRESS_COMPLETE

  return (
    <SidePanel title={GENERATION_PROGRESS_TEXTS.title}>
      <ProgressBar value={progress} label={GENERATION_PROGRESS_TEXTS.progressLabel} />
      <p className="mt-3 text-sm text-gray-500" aria-live="polite">
        {getGenerationStage(progress)}
      </p>
      <p className="mt-12 flex items-center gap-2 text-sm font-medium text-primary-blue">
        <span
          className={cn('size-2 rounded-full bg-primary-blue', !isCompleted && 'animate-pulse')}
          aria-hidden="true"
        />
        {buildSolutionStatus(languageLabel, isCompleted)}
      </p>
    </SidePanel>
  )
}
