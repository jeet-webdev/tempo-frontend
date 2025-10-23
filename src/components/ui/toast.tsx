import * as React from "react"
import { Cross2Icon } from "@radix-ui/react-icons"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckCircle2, Info, AlertTriangle, AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col p-4 gap-3 sm:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden rounded-[20px] border p-4 pr-10 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-full backdrop-blur-[30px]",
  {
    variants: {
      variant: {
        default: "bg-white/12 border-white/25 text-white shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_20px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.2)]",
        success: "bg-green-500/20 border-green-400/40 text-white shadow-[0_8px_32px_rgba(34,197,94,0.3),0_0_20px_rgba(34,197,94,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]",
        error: "bg-red-500/20 border-red-400/40 text-white shadow-[0_8px_32px_rgba(239,68,68,0.3),0_0_20px_rgba(239,68,68,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]",
        warning: "bg-orange-500/20 border-orange-400/40 text-white shadow-[0_8px_32px_rgba(251,146,60,0.3),0_0_20px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]",
        info: "bg-cyan-500/20 border-cyan-400/40 text-white shadow-[0_8px_32px_rgba(34,211,238,0.3),0_0_20px_rgba(34,211,238,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]",
        destructive: "bg-red-500/20 border-red-400/40 text-white shadow-[0_8px_32px_rgba(239,68,68,0.3),0_0_20px_rgba(239,68,68,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const variantIcons = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  destructive: AlertCircle,
}

const variantIconColors = {
  default: "text-cyan-400",
  success: "text-green-400",
  error: "text-red-400",
  warning: "text-orange-400",
  info: "text-cyan-400",
  destructive: "text-red-400",
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant = "default", children, ...props }, ref) => {
  const Icon = variantIcons[variant || "default"]
  const iconColor = variantIconColors[variant || "default"]

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0", iconColor)} />
      <div className="flex-1 grid gap-1">
        {children}
      </div>
      <ToastPrimitives.Close className="absolute right-3 top-3 rounded-full p-1 text-white/70 hover:text-white transition-all duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400/50 opacity-0 group-hover:opacity-100">
        <Cross2Icon className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </ToastPrimitives.Close>
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <Cross2Icon className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-bold text-white/95", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-xs text-white/75", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export { Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport, type ToastActionElement, type ToastProps };