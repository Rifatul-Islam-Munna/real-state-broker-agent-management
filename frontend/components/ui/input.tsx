"use client"

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  onChange,
  disabled,
  multiple,
  ...props
}: React.ComponentProps<"input">) {
  const [selectedLabel, setSelectedLabel] = React.useState("")

  if (type === "file") {
    return (
      <label
        aria-disabled={disabled}
        className={cn(
          "flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-xs transition-colors hover:border-primary/50 hover:bg-muted/20 focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/15 aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:bg-muted aria-disabled:opacity-60",
          className,
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold leading-none text-primary-foreground">
          +
        </span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {selectedLabel || (multiple ? "Add attachments" : "Add attachment")}
        </span>
        <InputPrimitive
          {...props}
          className="sr-only"
          disabled={disabled}
          multiple={multiple}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? [])
            setSelectedLabel(
              files.length > 1
                ? `${files.length} files selected`
                : files[0]?.name ?? "",
            )
            onChange?.(event)
          }}
          type="file"
        />
      </label>
    )
  }

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 py-2 text-base shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 md:text-sm dark:bg-input/20",
        className,
      )}
      disabled={disabled}
      multiple={multiple}
      onChange={onChange}
      {...props}
    />
  )
}

export { Input }
