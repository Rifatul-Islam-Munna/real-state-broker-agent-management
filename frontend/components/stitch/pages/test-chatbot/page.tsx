"use client"

import { useCallback, useMemo, useState, useTransition, type FormEvent } from "react"
import { BadgeCheckIcon, BotIcon, CalendarClockIcon, ChevronDownIcon, RotateCcwIcon, SendIcon, ShieldAlertIcon, SparklesIcon, UserRoundIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChatbotPropertyPicker } from "@/components/chatbot-property-picker"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  parseTestChatbotRole,
  parseTestCredit,
  parseTestMonthlyIncome,
  parseTestShowingIntent,
  propertyQualification,
  qualificationMatchesProperty,
  testQualificationClarification,
} from "@/lib/chatbot-operations"
import { formatKnowledgeProperty, type KnowledgePropertyLike } from "@/lib/chatbot-knowledge-targeting"
import { interpretTestChatbotReply, testChatbot, type ChatbotTestResult } from "@/lib/tenant-chatbot-actions"

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

const CREDIT_FOLLOW_UP = "If you want, I can quickly check the two basic requirements. Could you share your approximate credit score? A rough number is completely fine."
const INCOME_FOLLOW_UP = "Thanks. The second basic check is income. If you don't mind, about how much do you make per month before taxes? A rough estimate is completely fine."

function workflowResult(answer: string, decision: ChatbotTestResult["decision"], reason: string): ChatbotTestResult {
  return { answer, decision, reason, confidence: null, evidence: [] }
}

function looksLikePropertyInquiry(value: string) {
  const text = value.toLowerCase()
  return /[?]/.test(value) || /\b(what|when|where|which|how|does|do|is|are|can|could|would|will|fit|enough|space|room|bed|bath|rent|parking|pet|utility|family|household|occupancy)\b/.test(text)
}

function looksLikeQualificationReply(value: string, expected: "creditScore" | "monthlyEarning") {
  if (expected === "creditScore") {
    if (parseTestCredit(value) !== null) return true
    return /\b(credit|fico|credit score|my score|score is|score was|credit karma|experian|equifax|transunion)\b/i.test(value)
  }
  if (parseTestMonthlyIncome(value) !== null) return true
  return /\b(income|salary|earnings|paycheck|i make|we make|i earn|we earn|bring in|bring home|per month|monthly|per year|yearly|annual)\b/i.test(value)
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
    const suppliedCredit = parseTestCredit(nextQuestion)
    const suppliedIncome = parseTestMonthlyIncome(nextQuestion)
    if (workflow.creditScore === null && suppliedCredit === null) {
      const clarification = testQualificationClarification(nextQuestion, "creditScore")
      if (clarification) return workflowResult(clarification, "ASK_CREDIT", "CREDIT_REQUIRED")
    }
    if (workflow.creditScore !== null && workflow.monthlyIncome === null && suppliedIncome === null) {
      const clarification = testQualificationClarification(nextQuestion, "monthlyEarning")
      if (clarification) return workflowResult(clarification, "ASK_INCOME", "INCOME_REQUIRED")
    }
    if (suppliedCredit === null && suppliedIncome === null) return null

    const credit = workflow.creditScore ?? suppliedCredit
    const income = workflow.monthlyIncome ?? suppliedIncome
    setWorkflow((current) => ({
      ...current,
      creditScore: current.creditScore ?? suppliedCredit,
      monthlyIncome: current.monthlyIncome ?? suppliedIncome,
    }))
    if (credit === null) return workflowResult(CREDIT_FOLLOW_UP, "ASK_CREDIT", "CREDIT_REQUIRED")
    if (income === null) return workflowResult(INCOME_FOLLOW_UP, "ASK_INCOME", "INCOME_REQUIRED")

    const qualified = qualificationMatchesProperty(credit, income, selectedProperty.payload)
    setWorkflow((current) => ({ ...current, creditScore: credit, monthlyIncome: income, showingEligible: qualified }))
    if (qualified) {
      return workflowResult("That looks good on the two basic checks you shared. If you'd like to see the property, the showing form is ready below.", "ANSWER", "QUALIFIED")
    }
    const requirements = propertyQualification(selectedProperty.payload)
    const alternatives = initialProperties
      .filter((property) => property.id !== selectedProperty.id && property.status?.toLowerCase() === "published")
      .filter((property) => qualificationMatchesProperty(credit, income, property.payload))
      .slice(0, 3)
      .map((property) => formatKnowledgeProperty(property).title)
    const failedCredit = Boolean(requirements.minimumCreditScore && credit < requirements.minimumCreditScore)
    const reason = failedCredit ? "CREDIT_BELOW_MINIMUM" : "INCOME_BELOW_MINIMUM"
    const requirementText = failedCredit
      ? `minimum credit score of ${requirements.minimumCreditScore}`
      : `minimum monthly income of $${requirements.minimumMonthlyIncome?.toLocaleString()}`
    return workflowResult(
      `This property requires a ${requirementText}. Based on the test values, it may not be a match.${alternatives.length ? ` Other published matches: ${alternatives.join(", ")}.` : " A team member can help find another property."}`,
      "ANSWER",
      reason
    )
  }, [initialProperties, selectedProperty, workflow.creditScore, workflow.monthlyIncome])

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextQuestion = question.trim()
    if (nextQuestion.length < 2) return
    const messageId = crypto.randomUUID()
    setError("")
    setMessages((current) => [...current, { id: `user-${messageId}`, role: "user", body: nextQuestion }])
    setQuestion("")

    const audience: "LEAD" | "REALTOR" = workflow.role ?? "LEAD"

    const showingIntent = parseTestShowingIntent(nextQuestion)
    const declaredRole = parseTestChatbotRole(nextQuestion)

    if (!workflow.role) {
      if (declaredRole) {
        setWorkflow((current) => ({ ...current, role: declaredRole }))
        if (declaredRole === "LEAD") {
          const isCreditReply = looksLikeQualificationReply(nextQuestion, "creditScore")
          const isIncomeReply = looksLikeQualificationReply(nextQuestion, "monthlyEarning")
          if (looksLikePropertyInquiry(nextQuestion) && !isCreditReply && !isIncomeReply) {
            startTransition(async () => {
              try {
                const result = await testChatbot({ propertyId, audience: "LEAD", channel: "WEB", question: nextQuestion })
                appendAssistant(nextQuestion, { ...result, answer: `${result.answer}\n\n${CREDIT_FOLLOW_UP}` }, messageId)
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "The test chat could not answer.")
              }
            })
            return
          }
          const qualification = qualificationReply(nextQuestion)
          if (qualification) {
            appendAssistant(nextQuestion, qualification, messageId)
            return
          }
        }
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
      startTransition(async () => {
        try {
          const interpreted = await interpretTestChatbotReply({
            propertyId,
            audience: "LEAD",
            channel: "WEB",
            expected: "role",
            message: nextQuestion,
          })
          if (interpreted.recognized && interpreted.role) {
            setWorkflow((current) => ({ ...current, role: interpreted.role }))
            if (interpreted.role === "LEAD") {
              const isCreditReply = looksLikeQualificationReply(nextQuestion, "creditScore")
              const isIncomeReply = looksLikeQualificationReply(nextQuestion, "monthlyEarning")
              if (looksLikePropertyInquiry(nextQuestion) && !isCreditReply && !isIncomeReply) {
                const result = await testChatbot({ propertyId, audience: "LEAD", channel: "WEB", question: nextQuestion })
                appendAssistant(nextQuestion, { ...result, answer: `${result.answer}\n\n${CREDIT_FOLLOW_UP}` }, messageId)
                return
              }
              const qualification = qualificationReply(nextQuestion)
              if (qualification) {
                appendAssistant(nextQuestion, qualification, messageId)
                return
              }
              appendAssistant(
                nextQuestion,
                workflowResult(`Got it — you're interested in this property. ${CREDIT_FOLLOW_UP}`, "ASK_CREDIT", "CREDIT_REQUIRED"),
                messageId
              )
              return
            }
            appendAssistant(
              nextQuestion,
              workflowResult("Got it — you're a Realtor. I can use the Realtor-facing property details, but private access information stays hidden until the Realtor is verified.", "ANSWER", "ROLE_CAPTURED"),
              messageId
            )
            return
          }
          const result = await testChatbot({ propertyId, audience: "LEAD", channel: "WEB", question: nextQuestion })
          appendAssistant(nextQuestion, result, messageId)
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "The test chat could not answer.")
        }
      })
      return
    } else if (workflow.role === "LEAD" && (!workflow.showingEligible || workflow.monthlyIncome === null)) {
      const expected = workflow.creditScore === null ? "creditScore" as const : "monthlyEarning" as const
      const isQualificationReply = looksLikeQualificationReply(nextQuestion, expected)
      if (looksLikePropertyInquiry(nextQuestion) && !showingIntent && !isQualificationReply) {
        startTransition(async () => {
          try {
            const result = await testChatbot({ propertyId, audience: "LEAD", channel: "WEB", question: nextQuestion })
            const followUp = expected === "creditScore" ? CREDIT_FOLLOW_UP : INCOME_FOLLOW_UP
            appendAssistant(nextQuestion, { ...result, answer: `${result.answer}\n\n${followUp}` }, messageId)
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "The test chat could not answer.")
          }
        })
        return
      }
      const qualification = qualificationReply(nextQuestion)
      if (qualification) {
        appendAssistant(nextQuestion, qualification, messageId)
        return
      }
      startTransition(async () => {
        try {
          const interpreted = await interpretTestChatbotReply({
            propertyId,
            audience: "LEAD",
            channel: "WEB",
            expected,
            message: nextQuestion,
          })
          if (interpreted.clarification) {
            appendAssistant(nextQuestion, workflowResult(
              interpreted.clarification,
              expected === "creditScore" ? "ASK_CREDIT" : "ASK_INCOME",
              expected === "creditScore" ? "CREDIT_REQUIRED" : "INCOME_REQUIRED"
            ), messageId)
            return
          }
          const interpretedValue = expected === "creditScore" ? interpreted.creditScore : interpreted.monthlyEarning
          if (interpreted.recognized && interpretedValue !== null) {
            const resolved = qualificationReply(String(interpretedValue))
            if (resolved) {
              appendAssistant(nextQuestion, resolved, messageId)
              return
            }
          }
          if (showingIntent || declaredRole === "LEAD") {
            appendAssistant(
              nextQuestion,
              expected === "creditScore"
                ? workflowResult("Absolutely — I can help with that. Before I unlock the showing form, what's your approximate credit score?", "ASK_CREDIT", "CREDIT_REQUIRED")
                : workflowResult("Thanks. One last basic check before I unlock the showing form: about how much is your monthly income before taxes?", "ASK_INCOME", "INCOME_REQUIRED"),
              messageId
            )
            return
          }
          const result = await testChatbot({ propertyId, audience: "LEAD", channel: "WEB", question: nextQuestion })
          appendAssistant(nextQuestion, result, messageId)
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "The test chat could not answer.")
        }
      })
      return
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
        appendAssistant(nextQuestion, result, messageId)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "The test chat could not answer.")
      }
    })
  }, [appendAssistant, propertyId, qualificationReply, question, workflow])

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
                    {(message.result.confidence !== null || message.result.evidence.length > 0 || message.result.ai) ? (
                      <details className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-foreground/80">
                          <ChevronDownIcon className="size-3.5" />
                          Test details
                          {message.result.confidence !== null ? <span>· {Math.round(message.result.confidence * 100)}% confidence</span> : null}
                          {message.result.ai?.provider ? <span>· {message.result.ai.status === "ANSWERED" ? "AI answered" : "AI attempted"} · {message.result.ai.provider}</span> : null}
                        </summary>
                        <div className="mt-2 space-y-2">
                          <p><span className="font-medium text-foreground/70">Decision:</span> {message.result.decision} · {message.result.reason}</p>
                          {message.result.ai?.model ? <p><span className="font-medium text-foreground/70">Model:</span> {message.result.ai.model}</p> : null}
                          {message.result.evidence.length ? (
                            <div>
                              <p className="mb-1 font-medium text-foreground/70">Retrieved chunks</p>
                              <div className="space-y-1.5">
                                {message.result.evidence.map((item) => (
                                  <div key={`${message.id}-${item.knowledgeId}`} className="rounded-md border bg-muted/30 px-2.5 py-2">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="truncate font-medium text-foreground/80">{item.title}</span>
                                      <span>{Math.round(item.score * 100)}%</span>
                                    </div>
                                    <p className="mt-0.5">{item.sourceType} · {item.scope}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </details>
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