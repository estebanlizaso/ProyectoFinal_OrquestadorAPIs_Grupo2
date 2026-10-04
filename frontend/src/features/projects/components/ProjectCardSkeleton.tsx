import { Card } from '../../../shared/ui/Card'
import { Skeleton } from '../../../shared/ui/Skeleton'

export function ProjectCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-6.5 w-25 rounded-lg" />
    </Card>
  )
}
