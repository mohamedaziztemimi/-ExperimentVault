'use client'

import { Bell, Menu, Search } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface TopNavProps {
  onMenuClick: () => void
}

function buildBreadcrumb(pathname: string): string {
  if (pathname === '/') return 'Dashboard'
  const segment = pathname.split('/').filter(Boolean)[0]
  if (!segment) return 'Dashboard'
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const pathname = usePathname()
  const breadcrumb = buildBreadcrumb(pathname)

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 md:hidden dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 text-sm">
            <li className="text-gray-400 dark:text-gray-500">ExperimentVault</li>
            <li className="text-gray-300 dark:text-gray-600" aria-hidden="true">
              /
            </li>
            <li className="font-medium text-gray-900 dark:text-white">{breadcrumb}</li>
          </ol>
        </nav>
      </div>

      {/* Right: search, notifications, user */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Search className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Bell className="h-5 w-5" />
        </Button>

        <div className="ml-1">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-8 w-8',
              },
            }}
          />
        </div>
      </div>
    </header>
  )
}
