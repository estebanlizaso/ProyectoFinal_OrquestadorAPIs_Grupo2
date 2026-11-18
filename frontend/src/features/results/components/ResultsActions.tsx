import { ArrowLeft, Download, FileJson, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useDownloadArchitectureArtifact, type ArchitectureArtifact } from '../../../services/architectureService'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { downloadBlob } from '../../../shared/lib/downloadBlob'
import { Button } from '../../../shared/ui/Button'
import { ARTIFACT_FILE_NAMES, RESULTS_ACTIONS_TEXTS } from '../constants'
import { RESULTS_DOWNLOAD_ERROR_MESSAGES } from '../errorMessages'

export type ResultsActionsProps = {
  projectId: number
  onBackToProjects: () => void
}

export function ResultsActions({ projectId, onBackToProjects }: ResultsActionsProps) {
  const packageDownload = useDownloadArchitectureArtifact()
  const postmanDownload = useDownloadArchitectureArtifact()
  const [lastArtifact, setLastArtifact] = useState<ArchitectureArtifact | null>(null)

  async function handleDownloadPackage(): Promise<void> {
    setLastArtifact('package')
    const file = await packageDownload.run(projectId, 'package')
    if (file) {
      downloadBlob(ARTIFACT_FILE_NAMES.package(projectId), file)
    }
  }

  async function handleDownloadPostman(): Promise<void> {
    setLastArtifact('postman-collection')
    const file = await postmanDownload.run(projectId, 'postman-collection')
    if (file) {
      downloadBlob(ARTIFACT_FILE_NAMES.postmanCollection(projectId), file)
    }
  }

  const isDownloadingPackage = packageDownload.status === 'loading'
  const isDownloadingPostman = postmanDownload.status === 'loading'
  const visibleError =
    lastArtifact === 'package' ? packageDownload.error : lastArtifact === 'postman-collection' ? postmanDownload.error : null

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" onClick={onBackToProjects}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          {RESULTS_ACTIONS_TEXTS.backToProjects}
        </Button>
        <Button
          variant="secondary"
          disabled={isDownloadingPostman}
          aria-busy={isDownloadingPostman}
          onClick={() => void handleDownloadPostman()}
        >
          {isDownloadingPostman ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <FileJson className="size-4" aria-hidden="true" />
          )}
          {isDownloadingPostman ? RESULTS_ACTIONS_TEXTS.downloadingPostman : RESULTS_ACTIONS_TEXTS.downloadPostman}
        </Button>
        <Button
          disabled={isDownloadingPackage}
          aria-busy={isDownloadingPackage}
          onClick={() => void handleDownloadPackage()}
        >
          {isDownloadingPackage ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          {isDownloadingPackage ? RESULTS_ACTIONS_TEXTS.downloadingZip : RESULTS_ACTIONS_TEXTS.downloadZip}
        </Button>
      </div>
      {visibleError && (
        <p role="alert" className="text-sm text-red-600">
          {getErrorMessage(visibleError, RESULTS_DOWNLOAD_ERROR_MESSAGES)}
        </p>
      )}
    </div>
  )
}
