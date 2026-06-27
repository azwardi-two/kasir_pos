import type { ReactNode } from 'react'

interface Props {
  left: ReactNode
  right: ReactNode
}

export function Layout({ left, right }: Props) {
  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      <div className="flex-1 flex flex-col min-w-0">
        {left}
      </div>
      <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col">
        {right}
      </div>
    </div>
  )
}
