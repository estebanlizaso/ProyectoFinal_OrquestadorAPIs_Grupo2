const TEXT_MIME_TYPE = 'text/plain;charset=utf-8'

export function downloadTextFile(fileName: string, content: string, mimeType: string = TEXT_MIME_TYPE): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}