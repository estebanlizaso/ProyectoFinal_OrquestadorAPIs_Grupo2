export type ProgressBarProps = {
  value: number
  max?: number
  label: string
}

export function ProgressBar({ value, max = 100, label }: ProgressBarProps) {
  return (
    <progress
      value={value}
      max={max}
      aria-label={label}
      className="h-2 w-full appearance-none overflow-hidden rounded-full bg-gray-200 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary-blue [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary-blue [&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-100 [&::-webkit-progress-value]:ease-linear"
    />
  )
}
