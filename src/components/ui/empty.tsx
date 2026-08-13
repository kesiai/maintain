import * as React from 'react'
import { cn } from '@/lib/utils'

export interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  description?: string
  image?: React.ReactNode
}

export const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, description, image, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center p-8 text-center',
          className
        )}
        {...props}
      >
        {image && <div className="mb-4">{image}</div>}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    )
  }
)

Empty.displayName = 'Empty'
