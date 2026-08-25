"use client"

import { useCallback, useState, useTransition, type ChangeEvent, type FormEvent } from "react"
import { BotIcon, FlaskConicalIcon, SearchIcon, ShieldAlertIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  addChatbotKnowledge,
  listChatbotKnowledge,
  reindexChatbotKnowledge,
  testChatbot,
  updateChatbotKnowledge,
  type ChatbotTestResult,
} from "@/lib/tenant-chatbot-actions"

export function TestChatbotPage() {
  const [audience, setAudience] = useState<"LEAD" | "REALTOR">("LEAD")
  const [channel, setChannel] = useState<"WEB" | "EMAIL" | "SMS">("WEB")
  const [propertyId, setPropertyId] = useState("")
  const [question, setQuestion] = useState("")
  const [result, setResult] = useState<ChatbotTestResult | null>(null)
  const [error, setError] = useState("")
  const [improveMessage, setImproveMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleAudienceChange = useCallback((value: string) => {
    setAudience(value === "REALTOR" ? "REALTOR" : "LEAD")
  }, [])

  const handleChannelChange = useCallback((value: string) => {
    setChannel(value === "EMAIL" ? "EMAIL" : value === "SMS" ? "SMS" : "WEB")
  }, [])

  const handlePropertyChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPropertyId(event.currentTarget.value)
  }, [])

  const handleQuestionChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(event.currentTarget.value)
  }, [])

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setImproveMessage("")
    setResult(null)
    startTransition(async () => {
      try {
        setResult(await testChatbot({
          audience,
          channel,
          propertyId: Number(propertyId) || null,
          question,
        }))
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "The simulation failed")
      }
    })
  }, [audience, channel, propertyId, question])

  const handleImproveKnowledge = useCallback(() => {
    if (!result || !question.trim() || !result.answer.trim()) return

    setError("")
    setImproveMessage("")
    startTransition(async () => {
      try {
        const currentKnowledge = await listChatbotKnowledge()
        const editableEvidence = result.evidence.find(
          (source) => source.scope !== "PLATFORM" && source.sourceType === "MANUAL",
        )
        const existing = editableEvidence
          ? currentKnowledge.find((item) => String(item.id) === String(editableEvidence.knowledgeId) && item.sourceType === "MANUAL")
          : undefined
        const resolvedPropertyId = Number(propertyId) || existing?.propertyId || null

        if (existing) {
          await updateChatbotKnowledge(String(existing.id), {
            active: true,
            answer: result.answer,
            audience,
            priority: existing.priority,
            propertyId: resolvedPropertyId,
            questionExamples: Array.from(new Set([...(existing.questionExamples ?? []), question.trim()])),
            title: existing.title,
          })
        } else {
          await addChatbotKnowledge({
            answer: result.answer,
            audience,
            priority: 80,
            propertyId: resolvedPropertyId,
            questionExamples: [question.trim()],
            title: question.trim().slice(0, 120),
          })
        }

        await reindexChatbotKnowledge()
        setImproveMessage(existing ? "Knowledge updated and reindexed." : "Knowledge created and reindexed.")
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to improve knowledge")
      }
    })
  }, [audience, propertyId, question, result])

  return (
    <main className="flex min-h-full flex-col gap-6 bg-background p-4 text-foreground md:p-8">
      <header className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <FlaskConicalIcon />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Test Chatbot</h1>
              <Badge variant="secondary">Simulation only</Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Preview the exact policy decision, confidence, and evidence without contacting a lead or creating a showing.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(22rem,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Ask as a user</CardTitle>
              <CardDescription>Choose the same audience and channel the real conversation would use.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel>Audience</FieldLabel>
                  <Select value={audience} onValueChange={handleAudienceChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="LEAD">Lead</SelectItem>
                        <SelectItem value="REALTOR">Realtor</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Channel</FieldLabel>
                  <Select value={channel} onValueChange={handleChannelChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="WEB">Web chat</SelectItem>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="test-property">Property ID</FieldLabel>
                  <Input id="test-property" type="number" min="1" value={propertyId} onChange={handlePropertyChange} placeholder="Optional" />
                  <FieldDescription>Property-specific evidence outranks tenant-wide knowledge.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="test-question">Question</FieldLabel>
                  <Textarea id="test-question" required minLength={2} maxLength={2000} value={question} onChange={handleQuestionChange} placeholder="Is parking included with this property?" />
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isPending || question.trim().length < 2}>
                {isPending ? <Spinner data-icon="inline-start" /> : <SearchIcon data-icon="inline-start" />}
                Run simulation
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BotIcon /> Decision trace</CardTitle>
            <CardDescription>The simulator shows why the bot answered or stopped.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {error && (
              <Alert variant="destructive">
                <ShieldAlertIcon />
                <AlertTitle>Simulation unavailable</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!result && !error && (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
                <FlaskConicalIcon />
                <p className="font-medium">No simulation yet</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Ask a real property question to inspect the answer and every matched source.
                </p>
              </div>
            )}
            {result && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={result.decision === "ANSWER" ? "default" : "destructive"}>{result.decision}</Badge>
                  <Badge variant="outline">{result.reason}</Badge>
                  <Badge variant="secondary">
                    {result.confidence === null ? "No score" : `${Math.round(result.confidence * 100)}% confidence`}
                  </Badge>
                </div>
                <div className="rounded-2xl border bg-muted/30 p-5">
                  <p className="whitespace-pre-wrap text-sm leading-6">{result.answer}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-medium">Matched evidence</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={isPending || !result.answer.trim()}
                    onClick={handleImproveKnowledge}
                  >
                    {isPending ? <Spinner data-icon="inline-start" /> : null}
                    Improve knowledge
                  </Button>
                </div>
                {improveMessage ? (
                  <p className="text-sm font-medium text-emerald-700">{improveMessage}</p>
                ) : null}
                <div className="flex flex-col gap-3">
                  {result.evidence.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No verified source passed the policy gate.</p>
                  ) : (
                    result.evidence.map((source) => (
                      <article key={source.knowledgeId} className="flex items-center justify-between gap-4 rounded-xl border p-4">
                        <div className="flex min-w-0 flex-col gap-1">
                          <p className="truncate text-sm font-medium">{source.title}</p>
                          <p className="text-xs text-muted-foreground">{source.scope} · {source.sourceType}</p>
                        </div>
                        <Badge variant="outline">{Math.round(source.score * 100)}%</Badge>
                      </article>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
