import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-thumb border-2 border-dashed border-muted bg-cream",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
