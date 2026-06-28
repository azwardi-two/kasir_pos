import type { ReactNode } from 'react'

interface Props {
  left: ReactNode
  right: ReactNode
}

export function Layout({ left, right }: Props) {
  return (
    <div className="h-dvh flex flex-col md:flex-row overflow-hidden bg-gray-100">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {left}
      </div>
      <div className="w-full md:w-96 flex-shrink-0 md:border-l border-t md:border-t-0 border-gray-200 bg-white flex flex-col max-h-[45vh] md:max-h-none">
        {right}
      </div>
    </div>
  )
}
