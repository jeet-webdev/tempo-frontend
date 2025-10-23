import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    userName?: string;
    isTopPerformer?: boolean;
  }
>(({ className, userName, isTopPerformer, children, ...props }, ref) => {
  // Generate initials from userName
  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Generate random gradient rotation for unique feel
  const getGradientRotation = (name?: string) => {
    if (!name) return 135;
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 130 + (hash % 10); // 130-140 degree range
  };

  const initials = children || getInitials(userName);
  const rotation = getGradientRotation(userName);

  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full",
        "bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500",
        "text-white font-bold text-sm",
        "border border-white/20",
        "shadow-lg shadow-purple-500/30",
        "transition-all duration-300 ease-out",
        "hover:scale-110 hover:shadow-xl hover:shadow-purple-500/50",
        "relative overflow-hidden",
        isTopPerformer && "ring-2 ring-yellow-400/60 ring-offset-2 ring-offset-transparent",
        className
      )}
      style={{
        backgroundImage: `linear-gradient(${rotation}deg, rgba(168, 85, 247, 0.8), rgba(236, 72, 153, 0.8), rgba(34, 211, 238, 0.8))`
      }}
      {...props}
    >
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
      
      {/* Initials */}
      <span className="relative z-10 drop-shadow-lg" style={{ fontWeight: 700 }}>
        {initials}
      </span>
      
      {/* Glass border ring */}
      <div className="absolute inset-0 rounded-full border border-white/30 pointer-events-none" />
    </AvatarPrimitive.Fallback>
  );
})
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }