"use client"

import { useEffect, useMemo, useState, type ChangeEvent, type FocusEvent } from "react"
import { Building2Icon, XIcon } from "lucide-react"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import {
  propertyIdFromPickerLabel,
  propertyPickerLabel,
  type PropertyPickerOption,
} from "@/lib/chatbot-operations"
import { cn } from "@/lib/utils"

type Props = {
  id: string
  properties: PropertyPickerOption[]
  value: number | null
  onValueChange: (value: number | null) => void
  className?: string
}

export function ChatbotPropertyPicker({
  id,
  properties,
  value,
  onValueChange,
  className,
}: Props) {
  const selected = useMemo(
    () => properties.find((property) => property.id === value) ?? null,
    [properties, value]
  )
  const [query, setQuery] = useState(() => selected ? propertyPickerLabel(selected) : "")

  useEffect(() => {
    setQuery(selected ? propertyPickerLabel(selected) : "")
  }, [selected])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.currentTarget.value
    setQuery(next)
    const nextId = propertyIdFromPickerLabel(next, properties)
    if (nextId || !next.trim()) onValueChange(nextId)
  }

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (propertyIdFromPickerLabel(event.currentTarget.value, properties)) return
    setQuery(selected ? propertyPickerLabel(selected) : "")
  }

  const handleClear = () => {
    setQuery("")
    onValueChange(null)
  }

  return (
    <InputGroup className={cn("h-11", className)}>
      <InputGroupAddon><Building2Icon /></InputGroupAddon>
      <InputGroupInput
        id={id}
        aria-label="Search and select property"
        autoComplete="off"
        list={`${id}-options`}
        placeholder="All properties"
        value={query}
        onBlur={handleBlur}
        onChange={handleChange}
      />
      {selected ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton aria-label="Clear property" onClick={handleClear} size="icon-xs" type="button"><XIcon /></InputGroupButton>
        </InputGroupAddon>
      ) : null}
      <datalist id={`${id}-options`}>
        {properties.map((property) => (
          <option key={property.id} value={propertyPickerLabel(property)} />
        ))}
      </datalist>
    </InputGroup>
  )
}
