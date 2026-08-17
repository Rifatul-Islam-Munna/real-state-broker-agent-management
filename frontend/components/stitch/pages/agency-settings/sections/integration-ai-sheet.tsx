"use client"

import { useEffect, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useUpdateAgencyIntegrationSettings } from "@/hooks/use-real-estate-api"

type AiProviderName = "Claude" | "Custom" | "Gemini" | "Ollama" | "OpenAI" | "OpenRouter"

type Values = {
  providerName: AiProviderName
  baseUrl: string
  model: string
  apiKey: string
  hasApiKey: boolean
}

const OTHER_MODEL = "__other_model__"

const aiProviderPresets: Record<AiProviderName, { baseUrl: string; defaultModel: string; models: string[] }> = {
  OpenAI: { baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-5.4", models: ["gpt-5.4"] },
  Gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta", defaultModel: "gemini-2.5-flash", models: ["gemini-2.5-flash", "gemini-2.5-pro"] },
  Claude: { baseUrl: "https://api.anthropic.com/v1", defaultModel: "claude-sonnet-4-6", models: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5"] },
  OpenRouter: { baseUrl: "https://openrouter.ai/api/v1", defaultModel: "openai/gpt-5.4", models: ["openai/gpt-5.4", "anthropic/claude-sonnet-4.6", "google/gemini-2.5-flash"] },
  Ollama: { baseUrl: "http://localhost:11434", defaultModel: "llama3.2", models: ["llama3.2", "qwen3", "gemma3"] },
  Custom: { baseUrl: "", defaultModel: "", models: [] },
}

const emptyValues = (): Values => ({
  providerName: "OpenAI",
  baseUrl: aiProviderPresets.OpenAI.baseUrl,
  model: aiProviderPresets.OpenAI.defaultModel,
  apiKey: "",
  hasApiKey: false,
})

export function IntegrationAiSheet({
  config,
  onOpenChange,
  open,
}: {
  config?: Partial<Values> | null
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const mutation = useUpdateAgencyIntegrationSettings()
  const [values, setValues] = useState<Values>(() => emptyValues())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues({ ...emptyValues(), ...config, apiKey: "" })
    setError(null)
  }, [config, open])

  function patch(update: Partial<Values>) {
    setValues((current) => ({ ...current, ...update }))
  }

  function changeProvider(providerName: Values["providerName"]) {
    if (providerName === values.providerName) return
    const preset = aiProviderPresets[providerName]
    patch({
      providerName,
      baseUrl: preset.baseUrl,
      model: preset.defaultModel,
      apiKey: "",
      hasApiKey: false,
    })
  }

  async function save() {
    setError(null)
    if (!values.baseUrl.trim() || !values.model.trim()) {
      setError("Base URL and model are required.")
      return
    }
    if (
      values.providerName !== "Ollama" &&
      !values.apiKey.trim() &&
      !values.hasApiKey
    ) {
      setError("API key is required for a new connection.")
      return
    }

    const response = await mutation.mutateAsync({
      aiProvider: {
        providerName: values.providerName,
        baseUrl: values.baseUrl.trim(),
        model: values.model.trim(),
        apiKey: values.apiKey.trim(),
      },
    })
    if (response.error) {
      setError(response.error.message)
      return
    }
    onOpenChange(false)
  }

  async function disconnect() {
    setError(null)
    const response = await mutation.mutateAsync({ clearAiProvider: true })
    if (response.error) {
      setError(response.error.message)
      return
    }
    onOpenChange(false)
  }

  const suggestedModels = aiProviderPresets[values.providerName].models
  const modelSelectValue = suggestedModels.includes(values.model) ? values.model : OTHER_MODEL

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="shadow-none sm:w-[34rem] sm:max-w-[34rem]">
        <SheetHeader className="border-b">
          <SheetTitle>{"AI provider"}</SheetTitle>
          <SheetDescription>
            {"Choose a provider and model, then paste its API key. Leave the key blank to keep the saved key for the same provider. Ollama can be used without a key."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          <Field label="Provider">
            <Select onValueChange={(value) => changeProvider(value as Values["providerName"])} value={values.providerName}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OpenAI">{"OpenAI"}</SelectItem>
                <SelectItem value="Gemini">{"Google Gemini"}</SelectItem>
                <SelectItem value="Claude">{"Anthropic Claude"}</SelectItem>
                <SelectItem value="OpenRouter">{"OpenRouter"}</SelectItem>
                <SelectItem value="Ollama">{"Ollama"}</SelectItem>
                <SelectItem value="Custom">{"Custom compatible provider"}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {(values.providerName === "Custom" || values.providerName === "Ollama") ? (
            <Field label="Base URL"><Input onChange={(event) => patch({ baseUrl: event.target.value })} value={values.baseUrl} /></Field>
          ) : null}
          <Field label="Model">
            <Select
              onValueChange={(value) => patch({ model: value === OTHER_MODEL ? "" : value })}
              value={modelSelectValue}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {suggestedModels.map((model) => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
                <SelectItem value={OTHER_MODEL}>{"Other model..."}</SelectItem>
              </SelectContent>
            </Select>
            {modelSelectValue === OTHER_MODEL ? (
              <Input
                onChange={(event) => patch({ model: event.target.value })}
                placeholder="Enter provider model ID"
                value={values.model}
              />
            ) : null}
          </Field>
          {values.providerName !== "Ollama" ? (
            <Field label={values.hasApiKey ? "API key (saved)" : "API key"}>
              <Input autoComplete="new-password" onChange={(event) => patch({ apiKey: event.target.value })} placeholder={values.hasApiKey ? "Leave blank to keep saved key" : "Enter API key"} type="password" value={values.apiKey} />
            </Field>
          ) : null}
        </div>
        <SheetFooter>
          <Button disabled={mutation.isPending} onClick={() => void disconnect()} type="button" variant="destructive">{"Disconnect"}</Button>
          <Button disabled={mutation.isPending} onClick={() => void save()} type="button">{mutation.isPending ? "Saving..." : "Save connection"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}
