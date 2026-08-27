"use client"

import { useCallback, useMemo, useState, useTransition, type FormEvent, type MouseEvent } from "react"
import { BadgeCheckIcon, BotIcon, CalendarClockIcon, RotateCcwIcon, SendIcon, ShieldAlertIcon, SparklesIcon, UserRoundIcon } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChatbotPropertyPicker } from "@/components/chatbot-property-picker"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  appendConversationalPrompt,
  parseTestChatbotRole,
  parseTestCredit,
  parseTestMonthlyIncome,
  parseTestShowingIntent,
  propertyQualification,
  qualificationMatchesProperty,
  shouldOfferPropertyIndex,
} from "@/lib/chatbot-operations"
import { formatKnowledgeProperty, type KnowledgePropertyLike } from "@/lib/chatbot-knowledge-targeting"
import { reindexChatbotKnowledge, testChatbot, type ChatbotTestResult } from "@/lib/tenant-chatbot-actions"

type Props = { initialProperties: KnowledgePropertyLike[] }
type Workflow = {
  role: "LEAD" | "REALTOR" | null
  creditScore: number | null
  monthlyIncome: number | null
  showingEligible: boolean
  realtorVerified: boolean
}
type ChatMessage =
  | { id: string; role: "user"; body: string }
  | { id: string; role: "assistant"; body: string; result: ChatbotTestResult; question: string; propertyId: number | null }

const initialWorkflow: Workflow = {
  role: null,
  creditScore: null,
  monthlyIncome: null,
  showingEligible: false,
  realtorVerified: false,
}

const ROLE_FOLLOW_UP = "Also, so I give you the right details, are you looking to rent this place yourself, or are you a Realtor?"
const CREDIT_FOLLOW_UP = "If you want, I can quickly check whether this property looks like a fit. What's your approximate credit score?"
const INCOME_FOLLOW_UP = "Got it. And roughly how much do you make per month before taxes? An estimate is fine."

function workflowResult(answer: string, decision: ChatbotTestResult["decision"], reason: string): ChatbotTestResult {
  return { answer, decision, reason, confidence: null, evidence: [] }
}

export function TestChatbotPage({ initialProperties }: Props) {
  const properties = useMemo(
    () => initialProperties.map((property) => ({ ...formatKnowledgeProperty(property), payload: property.payload ?? {} })),
    [initialProperties]
  )
  const [propertyId, setPropertyId] = useState<number | null>(null)
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [workflow, setWorkflow] = useState<Workflow>(initialWorkflow)
  const [showingAt, setShowingAt] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const selectedProperty = useMemo(
    () => initialProperties.find((property) => property.id === propertyId) ?? null,
    [initialProperties, propertyId]
  )

  const appendAssistant = useCallback((questionText: string, result: ChatbotTestResult, id = crypto.randomUUID()) => {
    setMessages((current) => [
      ...current,
      { id: `bot-${id}`, role: "assistant", body: result.answer, result, question: questionText, propertyId },
    ])
  }, [propertyId])

  const resetConversation = useCallback(() => {
    setMessages([])
    setWorkflow(initialWorkflow)
    setQuestion("")
    setShowingAt("")
    setError("")
  }, [])

  const handlePropertyChange = useCallback((value: number | null) => {
    setPropertyId(value)
    setMessages([])
    setWorkflow(initialWorkflow)
    setShowingAt("")
    setError("")
  }, [])

  const qualificationReply = useCallback((nextQuestion: string) => {
    if (!selectedProperty) {
      return workflowResult("Choose a property first so I can test qualification and showing behavior safely.", "STOP", "PROPERTY_REQUIRED")
    }
    if (workflow.creditScore === null) {
      const score = parseTestCredit(nextQuestion)
      if (score === null) return null
      setWorkflow((current) => ({ ...current, creditScore: score }))
      return workflowResult(INCOME_FOLLOW_UP, "ASK_INCOME", "INCOME_REQUIRED")
    }
    if (workflow.monthlyIncome === null) {
      const income = parseTestMonthlyIncome(nextQuestion)
      if (income === null) return null
      const qualified = qualificationMatchesProperty(workflow.creditScore, income, selectedProperty.payload)
      setWorkflow((current) => ({ ...current, monthlyIncome: income, showingEligible: qualified }))
      if (qualified) {
        return workflowResult("That looks good on the two basic checks you shared. If you'd like to see the property, the showing form is ready below.", "ANSWER", "QUALIFIED")
      }
      const requirements = propertyQualification(selectedProperty.payload)
      const alternatives = initialProperties
        .filter((property) => property.id !== selectedProperty.id && property.status?.toLowerCase() === "published")
        .filter((property) => qualificationMatchesProperty(workflow.creditScore!, income, property.payload))
        .slice(0, 3)
        .map((property) => formatKnowledgeProperty(property).title)
      const failedCredit = Boolean(requirements.minimumCreditScore && workflow.creditScore < requirements.minimumCreditScore)
      const reason = failedCredit ? "CREDIT_BELOW_MINIMUM" : "INCOME_BELOW_MINIMUM"
      const requirementText = failedCredit
        ? `minimum credit score of ${requirements.minimumCreditScore}`
        : `minimum monthly income of $${requirements.minimumMonthlyIncome?.toLocaleString()}`
      return workflowResult(
        `This property requires a ${requirementText}. Based on the test values, it may not be a match.${alternatives.length ? ` Other published matches: ${alternatives.join(", ")}.` : " A team member can help find another property."}`,
        "ANSWER",
        reason
      )
    }
    return null
  }, [initialProperties, selectedProperty, workflow.creditScore, workflow.monthlyIncome])

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextQuestion = question.trim()
    if (nextQuestion.length < 2) return
    const messageId = crypto.randomUUID()
    setError("")
    setMessages((current) => [...current, { id: `user-${messageId}`, role: "user", body: nextQuestion }])
    setQuestion("")

    let followUp = ""
    let audience: "LEAD" | "REALTOR" = workflow.role ?? "LEAD"

    const showingIntent = parseTestShowingIntent(nextQuestion)
    const declaredRole = parseTestChatbotRole(nextQuestion)

    if (!workflow.role) {
      if (declaredRole) {
        setWorkflow((current) => ({ ...current, role: declaredRole }))
        appendAssistant(
          nextQuestion,
          declaredRole === "REALTOR"
            ? workflowResult("Got it — you're a Realtor. I can use the Realtor-facing property details, but private access information stays hidden until the Realtor is verified.", "ANSWER", "ROLE_CAPTURED")
            : workflowResult(`Got it — you're interested in this property. ${CREDIT_FOLLOW_UP}`, "ASK_CREDIT", "CREDIT_REQUIRED"),
          messageId
        )
        return
      }
      if (showingIntent) {
        appendAssistant(
          nextQuestion,
          workflowResult("Absolutely — I can help you request a showing. First, are you looking to rent the property yourself, or are you a Realtor?", "ASK_ROLE", "ROLE_REQUIRED"),
          messageId
        )
        return
      }
      followUp = ROLE_FOLLOW_UP
    } else if (workflow.role === "LEAD" && (!workflow.showingEligible || workflow.monthlyIncome === null)) {
      const qualification = qualificationReply(nextQuestion)
      if (qualification) {
        appendAssistant(nextQuestion, qualification, messageId)
        return
      }
      if (showingIntent || declaredRole === "LEAD") {
        appendAssistant(
          nextQuestion,
          workflow.creditScore === null
            ? workflowResult("Absolutely — I can help with that. Before I unlock the showing form, what's your approximate credit score?", "ASK_CREDIT", "CREDIT_REQUIRED")
            : workflowResult("Thanks. One last basic check before I unlock the showing form: about how much is your monthly income before taxes?", "ASK_INCOME", "INCOME_REQUIRED"),
          messageId
        )
        return
      }
      followUp = workflow.creditScore === null ? CREDIT_FOLLOW_UP : INCOME_FOLLOW_UP
      audience = "LEAD"
    }

    startTransition(async () => {
      try {
        const result = await testChatbot({
          propertyId,
          audience,
          channel: "WEB",
          question: nextQuestion,
          allowSensitiveRealtorEvidence: audience === "REALTOR" && workflow.realtorVerified,
        })
        const conversationalResult = followUp
          ? { ...result, answer: appendConversationalPrompt(result.answer, followUp) }
          : result
        appendAssistant(nextQuestion, conversationalResult, messageId)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "The test chat could not answer.")
      }
    })
  }, [appendAssistant, propertyId, qualificationReply, question, workflow])

  const handlePrepareKnowledge = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const messageId = event.currentTarget.dataset.messageId
    const message = messages.find((item) => item.id === messageId)
    if (!message || message.role !== "assistant" || !message.propertyId) return
    setError("")
    startTransition(async () => {
      try {
        await reindexChatbotKnowledge()
        const result = await testChatbot({
          propertyId: message.propertyId,
          audience: workflow.role ?? "LEAD",
          channel: "WEB",
          question: message.question,
          allowSensitiveRealtorEvidence: workflow.role === "REALTOR" && workflow.realtorVerified,
        })
        setMessages((current) => current.map((item) => item.id === message.id && item.role === "assistant" ? { ...item, body: result.answer, result } : item))
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Property knowledge could not be prepared.")
      }
    })
  }, [messages, workflow])

  const handleShowingPreview = useCallback(() => {
    if (!showingAt || !workflow.showingEligible || !selectedProperty) return
    const date = new Date(showingAt)
    if (Number.isNaN(date.getTime())) {
      setError("Choose a valid showing date and time.")
      return
    }
    appendAssistant(
      "Confirm showing",
      workflowResult(`Safe preview only: the live chatbot would now submit a showing request for ${selectedProperty.title} at ${date.toLocaleString()} for staff confirmation.`, "CREATE_SHOWING_REQUEST", "SHOWING_REQUESTED")
    )
  }, [appendAssistant, selectedProperty, showingAt, workflow.showingEligible])

  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col p-3 sm:p-6 lg:p-8">
      <Card className="flex min-h-[calc(100vh-7rem)] flex-col overflow-hidden py-0 shadow-sm">
        <CardHeader className="grid gap-3 border-b py-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BotIcon /></span>
            <div className="min-w-0"><h1 className="truncate font-semibold">Test Chatbot</h1><p className="truncate text-xs text-muted-foreground">Full safe simulation · no lead contacted · no showing created</p></div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ChatbotPropertyPicker id="test-chatbot-property" properties={properties} value={propertyId} onValueChange={handlePropertyChange} />
            <Button type="button" variant="outline" size="icon" onClick={resetConversation} aria-label="Reset simulation"><RotateCcwIcon /></Button>
          </div>
        </CardHeader>

        <div className="grid border-b bg-muted/20 p-3 text-xs sm:grid-cols-4">
          <div><span className="text-muted-foreground">Role</span><p className="font-medium">{workflow.role === "LEAD" ? "Tenant / Lead" : workflow.role === "REALTOR" ? "Realtor" : "Not collected"}</p></div>
          <div><span className="text-muted-foreground">Credit</span><p className="font-medium">{workflow.creditScore ?? "Not collected"}</p></div>
          <div><span className="text-muted-foreground">Monthly income</span><p className="font-medium">{workflow.monthlyIncome ? `$${workflow.monthlyIncome.toLocaleString()}` : "Not collected"}</p></div>
          <div><span className="text-muted-foreground">Showing</span><p className="font-medium">{workflow.showingEligible ? "Eligible" : "Not eligible yet"}</p></div>
        </div>

        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <ScrollArea className="min-h-0 flex-1">
            <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-8">
              {workflow.role === "REALTOR" ? (
                <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-3">
                  <div><p className="text-sm font-medium">Verified Realtor simulation</p><p className="text-xs text-muted-foreground">Turn on only to test lockbox/access evidence that a directory-verified Realtor may receive.</p></div>
                  <Switch checked={workflow.realtorVerified} onCheckedChange={(checked) => setWorkflow((current) => ({ ...current, realtorVerified: checked }))} />
                </div>
              ) : null}

              {messages.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-muted"><SparklesIcon /></span>
                  <div><h2 className="font-semibold">Start exactly like a real conversation</h2><p className="mt-1 max-w-md text-sm text-muted-foreground">Pick a property and ask anything. The bot answers safe verified property questions first, then naturally asks whether the visitor is renting or is a Realtor and collects only the two qualification details when relevant.</p></div>
                </div>
              ) : null}

              {messages.map((message) => message.role === "user" ? (
                <article key={message.id} className="ml-auto flex max-w-[85%] items-end gap-2">
                  <div className="rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">{message.body}</div>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted"><UserRoundIcon /></span>
                </article>
              ) : (
                <article key={message.id} className="flex max-w-[92%] items-start gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><BotIcon /></span>
                  <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border bg-card px-4 py-3 shadow-xs">
                    <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                    <div className="mt-3 flex flex-wrap gap-2"><Badge variant={message.result.decision === "STOP" ? "destructive" : "secondary"}>{message.result.decision}</Badge><Badge variant="outline">{message.result.reason}</Badge>{message.result.confidence != null ? <Badge variant="outline">{Math.round(message.result.confidence * 100)}%</Badge> : null}</div>
                    {shouldOfferPropertyIndex(message.result, message.propertyId) ? (
                      <Button className="mt-3" data-message-id={message.id} disabled={isPending} onClick={handlePrepareKnowledge} size="sm" type="button" variant="outline">{isPending ? <Spinner data-icon="inline-start" /> : <SparklesIcon data-icon="inline-start" />}Index property knowledge and retry</Button>
                    ) : null}
                    {message.result.evidence.length ? (
                      <Accordion className="mt-2"><AccordionItem value={`details-${message.id}`} className="border-0"><AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">Evidence and decision details</AccordionTrigger><AccordionContent><div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">{message.result.evidence.map((source) => <div key={source.knowledgeId} className="flex items-center justify-between gap-3 rounded-md border bg-background p-2"><div className="min-w-0"><p className="truncate text-xs font-medium">{source.title}</p><p className="text-xs text-muted-foreground">{source.scope} · {source.sourceType}</p></div><Badge variant="outline">{Math.round(source.score * 100)}%</Badge></div>)}</div></AccordionContent></AccordionItem></Accordion>
                    ) : null}
                  </div>
                </article>
              ))}

              {workflow.showingEligible && workflow.role === "LEAD" ? (
                <div className="rounded-2xl border bg-card p-4 shadow-xs">
                  <div className="flex items-start gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarClockIcon /></span><div><p className="font-medium">Showing form unlocked</p><p className="text-xs text-muted-foreground">This is a safe preview. The public chat uses the same eligibility gate but creates a request only after explicit confirmation.</p></div></div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input type="datetime-local" value={showingAt} onChange={(event) => setShowingAt(event.currentTarget.value)} /><Button type="button" disabled={!showingAt} onClick={handleShowingPreview}><BadgeCheckIcon />Confirm showing preview</Button></div>
                </div>
              ) : null}

              {isPending ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"><BotIcon /></span><Spinner /> Checking verified knowledge…</div> : null}
              {error ? <Alert variant="destructive"><ShieldAlertIcon /><AlertTitle>Could not answer</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
            </div>
          </ScrollArea>

          <form className="border-t bg-background p-3 sm:p-4" onSubmit={handleSubmit}>
            <div className="mx-auto max-w-3xl"><InputGroup className="min-h-20 items-end rounded-2xl shadow-sm"><InputGroupTextarea aria-label="Message" placeholder={workflow.role ? "Ask a question or answer the qualification prompt…" : "Say tenant/realtor, or start with any question…"} value={question} onChange={(event) => setQuestion(event.currentTarget.value)} /><InputGroupAddon align="block-end" className="justify-between border-t"><span className="text-xs text-muted-foreground">Safe simulation</span><InputGroupButton aria-label="Send message" disabled={isPending || question.trim().length < 2} size="icon-sm" type="submit" variant="default"><SendIcon /></InputGroupButton></InputGroupAddon></InputGroup></div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}