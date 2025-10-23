import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-250 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-500/20 disabled:pointer-events-none disabled:opacity-50 active:scale-97",
  {
    variants: {
      variant: {
        default:
          "btn-liquid",
        destructive:
          "bg-gradient-to-br from-red-500/35 to-red-600/35 text-white backdrop-blur-md border border-red-500/40 shadow-lg hover:from-red-500/50 hover:to-red-600/50",
        outline:
          "btn-secondary-liquid",
        secondary:
          "btn-secondary-liquid",
        ghost: "hover:bg-white/10 text-white/92",
        link: "text-purple-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }