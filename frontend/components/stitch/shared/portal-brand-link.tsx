/* eslint-disable @next/next/no-img-element */

import Link from "next/link"

import { AppIcon } from "@/components/ui/app-icon"
import { cn } from "@/lib/utils"

type PortalBrandLinkProps = {
  agencyName: string
  href: string
  logoUrl?: string
  className?: string
  iconWrapperClassName?: string
  imageClassName?: string
  nameClassName?: string
}

export function PortalBrandLink({
  agencyName,
  href,
  logoUrl,
  className,
  iconWrapperClassName,
  imageClassName,
  nameClassName,
}: PortalBrandLinkProps) {
  return (
    <Link aria-label={agencyName} className={cn("flex min-w-0 items-center gap-3", className)} href={href}>
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-primary",
          iconWrapperClassName,
        )}
      >
        {logoUrl ? (
          <img alt={agencyName} className={cn("h-full w-full object-contain", imageClassName)} src={logoUrl} />
        ) : (
          <AppIcon className="text-3xl" name="domain" />
        )}
      </div>
      <span className={cn("min-w-0 truncate text-lg font-black tracking-tight", nameClassName)}>
        {agencyName}
      </span>
    </Link>
  )
}
