import { cn } from '../../shared/lib/cn'

export type SidebarNavItemProps = {
  href: string
  label: string
  isActive: boolean
}

export function SidebarNavItem({ href, label, isActive }: SidebarNavItemProps) {
  return (
    <a
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive ? 'bg-primary-blue-light text-primary-blue' : 'text-gray-600 hover:bg-gray-50',
      )}
    >
      {label}
    </a>
  )
}
