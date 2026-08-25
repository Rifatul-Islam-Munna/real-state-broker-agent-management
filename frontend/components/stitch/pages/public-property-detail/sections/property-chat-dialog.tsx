"use client"

import { useEffect, useMemo, useState } from "react"

import type {
  PropertyItem,
  PropertyPreQuestion,
} from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  useCreateContactRequest,
  useCreateTenantPropertyInquiry,
  usePublicTenantChatbot,
  type PublicTenantChatbotResponse,
} from "@/hooks/use-real-estate-api"
import { deleteUploadedAsset, uploadPropertyAsset } from "@/lib/upload-client"

type PropertyChatDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  property: PropertyItem
}

type ChatStep =
  | {
      id: string
      kind: "pre-question"
      questionId?: number
      prompt: string
      helperText?: string
      required: boolean
      allowsFileUpload: boolean
      attachmentUrl?: string | null
    }
  | {
      id: string
      kind: "field"
      field:
        | "contactName"
        | "contactEmail"
        | "contactPhone"
        | "budget"
        | "timeline"
        | "interest"
        | "additionalMessage"
      prompt: string
      placeholder: string
      required: boolean
      multiline?: boolean
      suggestions?: string[]
    }

type PreQuestionAnswerDraft = {
  questionId?: number
  questionPrompt: string
  answerText: string
  file?: File | null
}

type ContactFormState = {
  contactName: string
  contactEmail: string
  contactPhone: string
  budget: string
  timeline: string
  interest: string
  additionalMessage: string
}

const initialContactState: ContactFormState = {
  additionalMessage: "",
  budget: "",
  contactEmail: "",
  contactName: "",
  contactPhone: "",
  interest: "",
  timeline: "",
}

function sortQuestions(questions: PropertyPreQuestion[]) {
  return [...questions].sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
}

function buildSteps(property: PropertyItem): ChatStep[] {
  const preQuestionSteps = sortQuestions(property.preQuestions ?? []).map((question, index) => ({
    allowsFileUpload: question.allowsFileUpload ?? false,
    attachmentUrl: question.attachmentUrl ?? null,
    helperText: question.helperText ?? "",
    id: `pre-question-${question.id ?? index}`,
    kind: "pre-question" as const,
    prompt: question.prompt ?? `Question ${index + 1}`,
    questionId: question.id,
    required: question.isRequired ?? true,
  }))

  return [
    ...preQuestionSteps,
    {
      field: "contactName",
      id: "contactName",
      kind: "field",
      placeholder: "Full name",
      prompt: "What is your full name so the agent knows who to follow up with?",
      required: true,
    },
    {
      field: "contactEmail",
      id: "contactEmail",
      kind: "field",
      placeholder: "Email address",
      prompt: "What email address should we send updates to?",
      required: true,
    },
    {
      field: "contactPhone",
      id: "contactPhone",
      kind: "field",
      placeholder: "Phone number",
      prompt: "What phone number should the agent use if they need to call or text you?",
      required: true,
    },
    {
      field: "budget",
      id: "budget",
      kind: "field",
      placeholder: "Budget or price range",
      prompt: "What budget or price range are you working with?",
      required: true,
    },
    {
      field: "timeline",
      id: "timeline",
      kind: "field",
      placeholder: "Your timeline",
      prompt: "How soon are you hoping to move forward?",
      required: true,
      suggestions: ["Immediate", "This Month", "1-3 Months", "Just Researching"],
    },
    {
      field: "interest",
      id: "interest",
      kind: "field",
      placeholder: "What you need help with",
      prompt: "What do you want the agent to help with first?",
      required: true,
      suggestions: ["Buy", "Rent", "Schedule Viewing", "Ask Questions"],
    },
    {
      field: "additionalMessage",
      id: "additionalMessage",
      kind: "field",
      multiline: true,
      placeholder: "Anything else the agent should know?",
      prompt: "Anything else you want the agent to know before they reply?",
      required: false,
    },
  ]
}

type LiveChatTurn = {
  id: string
  role: "visitor" | "bot"
  body: string
  decision?: PublicTenantChatbotResponse["decision"]
  reason?: string
}

function formatVisitorAnswer(step: ChatStep, contactState: ContactFormState, preAnswers: PreQuestionAnswerDraft[]) {
  if (step.kind === "pre-question") {
    const answer = preAnswers.find((item) => item.questionPrompt === step.prompt)
    const fileLabel = answer?.file ? `\nFile: ${answer.file.name}` : ""
    return `${answer?.answerText?.trim() ?? ""}${fileLabel}`.trim() || "Skipped"
  }

  return contactState[step.field]?.trim() || "Skipped"
}

export function PropertyChatDialog({ open, onOpenChange, property }: PropertyChatDialogProps) {
  const createContactRequest = useCreateContactRequest()
  const createTenantPropertyInquiry = useCreateTenantPropertyInquiry()
  const publicChatbot = usePublicTenantChatbot()
  const inquiryMutation = property.tenantScoped
    ? createTenantPropertyInquiry
    : createContactRequest
  const steps = useMemo(() => buildSteps(property), [property])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [draftAnswer, setDraftAnswer] = useState("")
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [contactState, setContactState] = useState<ContactFormState>(initialContactState)
  const [preAnswers, setPreAnswers] = useState<PreQuestionAnswerDraft[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [chatAccessToken, setChatAccessToken] = useState("")
  const [chatSessionId, setChatSessionId] = useState(() => crypto.randomUUID())
  const [chatDraft, setChatDraft] = useState("")
  const [chatTurns, setChatTurns] = useState<LiveChatTurn[]>([])
  const [chatTerminal, setChatTerminal] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      return
    }

    setCurrentStepIndex(0)
    setDraftAnswer("")
    setDraftFile(null)
    setContactState(initialContactState)
    setPreAnswers([])
    setSubmitError(null)
    setIsSubmitted(false)
    setChatAccessToken("")
    setChatSessionId(crypto.randomUUID())
    setChatDraft("")
    setChatTurns([])
    setChatTerminal(false)
    setChatError(null)
  }, [open])

  const currentStep = steps[currentStepIndex] ?? null

  function moveToNextStep() {
    setDraftAnswer("")
    setDraftFile(null)
    setSubmitError(null)
    setCurrentStepIndex((current) => Math.min(current + 1, steps.length))
  }

  function handleCurrentStepSubmit() {
    if (!currentStep) {
      return
    }

    if (currentStep.kind === "pre-question") {
      if (currentStep.required && !draftAnswer.trim() && !draftFile) {
        setSubmitError("Please answer this question before continuing.")
        return
      }

      setPreAnswers((current) => [
        ...current,
        {
          answerText: draftAnswer.trim(),
          file: draftFile,
          questionId: currentStep.questionId,
          questionPrompt: currentStep.prompt,
        },
      ])
      moveToNextStep()
      return
    }

    if (currentStep.required && !draftAnswer.trim()) {
      setSubmitError("This detail is required before the agent can follow up.")
      return
    }

    if (currentStep.field === "contactEmail" && draftAnswer.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draftAnswer.trim())) {
      setSubmitError("Please enter a valid email address.")
      return
    }

    setContactState((current) => ({
      ...current,
      [currentStep.field]: draftAnswer.trim(),
    }))
    moveToNextStep()
  }

  async function handleSendConversation() {
    setSubmitError(null)
    const uploadedObjectNames: string[] = []

    try {
      const answers = await Promise.all(
        preAnswers.map(async (answer) => {
          if (!answer.file) {
            return {
              answerText: answer.answerText,
              attachmentObjectName: null,
              attachmentUrl: null,
              questionId: answer.questionId ?? null,
              questionPrompt: answer.questionPrompt,
            }
          }

          const upload = await uploadPropertyAsset(answer.file, "property-chats")
          uploadedObjectNames.push(upload.objectName)

          return {
            answerText: answer.answerText,
            attachmentObjectName: upload.objectName,
            attachmentUrl: upload.url,
            questionId: answer.questionId ?? null,
            questionPrompt: answer.questionPrompt,
          }
        }),
      )

      const message = [
        `Property: ${property.title}`,
        `Property ID: ${property.id}`,
        property.slug ? `Property Link: /properties/${property.slug}` : "",
        property.location ? `Location: ${property.location}` : "",
        property.price ? `Price: ${property.price}` : "",
        property.agent?.fullName ? `Assigned Agent: ${property.agent.fullName}` : "",
        contactState.budget ? `Budget: ${contactState.budget}` : "",
        contactState.timeline ? `Timeline: ${contactState.timeline}` : "",
        contactState.interest ? `Interest: ${contactState.interest}` : "",
        contactState.additionalMessage ? `Message: ${contactState.additionalMessage}` : "",
        ...answers.map((answer, index) => {
          const uploadLine = answer.attachmentUrl ? `\nAttachment: ${answer.attachmentUrl}` : ""
          return `Question ${index + 1}: ${answer.questionPrompt}\nAnswer: ${answer.answerText || "Skipped"}${uploadLine}`
        }),
      ].filter(Boolean).join("\n\n")

      const response = await inquiryMutation.mutateAsync({
        agentId: property.agentId ?? property.agent?.id ?? null,
        agentName: property.agent?.fullName ?? "",
        email: contactState.contactEmail,
        inquiryType: "Inquire About Listing",
        message,
        name: contactState.contactName,
        phone: contactState.contactPhone,
        propertyId: property.id,
        propertyTitle: property.title,
      })

      if (response.error) {
        throw response.error
      }

      const issuedChatToken = response.data?.chatSessionToken ?? ""
      setChatAccessToken(issuedChatToken)
      setIsSubmitted(true)
    } catch (error) {
      await Promise.allSettled(uploadedObjectNames.map((objectName) => deleteUploadedAsset(objectName)))
      setSubmitError(error instanceof Error ? error.message : "Failed to send the inquiry.")
    }
  }

  async function handleChatSubmit() {
    const body = chatDraft.trim()
    if (!body || !chatAccessToken || chatTerminal || publicChatbot.isPending) return

    const visitorTurn: LiveChatTurn = {
      id: `visitor-${crypto.randomUUID()}`,
      role: "visitor",
      body,
    }
    setChatTurns((current) => [...current, visitorTurn])
    setChatDraft("")
    setChatError(null)

    try {
      const response = await publicChatbot.mutateAsync({
        accessToken: chatAccessToken,
        sessionId: chatSessionId,
        idempotencyKey: crypto.randomUUID(),
        body,
      })
      if (response.error) throw response.error
      const result = response.data
      if (!result) throw new Error("The chatbot did not return a decision.")

      if (result.answer?.trim()) {
        setChatTurns((current) => [...current, {
          id: `bot-${crypto.randomUUID()}`,
          role: "bot",
          body: result.answer.trim(),
          decision: result.decision,
          reason: result.reason,
        }])
      }
      if (result.decision === "STOP" || result.decision === "CREATE_SHOWING_REQUEST") {
        setChatTerminal(true)
      }
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "The chatbot is unavailable right now.")
    }
  }

  const answeredSteps = steps.slice(0, Math.min(currentStepIndex, steps.length))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-none">
        <DialogTitle className="sr-only">
          {`Contact agent for ${property.title}`}
        </DialogTitle>
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-secondary">
            {"Listing Inquiry"}
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-900">
            {"Contact Agent"}
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            {"This sends the listing inquiry to the Contact Us inbox with property and assigned-agent context. Admin can convert it to a lead with one button."}
          </p>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="max-h-[70vh] overflow-y-auto bg-slate-50 px-6 py-6">
            <div className="space-y-5">
              <div className="flex gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <AppIcon className="text-lg" name="forum" />
                </div>
                <div className="max-w-[85%] rounded-3xl rounded-tl-md bg-white px-4 py-3 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">
                    {`Hi, I’m collecting details for ${property.title}.`}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {"Answer the pre-questions first, then share your contact details so the assigned agent can follow up with the right context."}
                  </p>
                </div>
              </div>

              {answeredSteps.map((step) => (
                <div key={step.id} className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                      <AppIcon className="text-lg" name="question_answer" />
                    </div>
                    <div className="max-w-[85%] rounded-3xl rounded-tl-md bg-white px-4 py-3 shadow-sm">
                      <p className="text-sm font-semibold text-slate-900">{step.prompt}</p>
                      {"helperText" in step && step.helperText ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">{step.helperText}</p>
                      ) : null}
                      {"attachmentUrl" in step && step.attachmentUrl ? (
                        <a
                          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                          href={step.attachmentUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <AppIcon className="text-base" name="attach_file" />
                          {"Open reference file"}
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-3xl rounded-tr-md bg-primary px-4 py-3 text-white">
                      <p className="text-sm whitespace-pre-wrap">
                        {formatVisitorAnswer(step, contactState, preAnswers)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {!isSubmitted && currentStep ? (
                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                    <AppIcon className="text-lg" name="chat_bubble" />
                  </div>
                  <div className="max-w-[85%] rounded-3xl rounded-tl-md bg-white px-4 py-3 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">{currentStep.prompt}</p>
                    {"helperText" in currentStep && currentStep.helperText ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">{currentStep.helperText}</p>
                    ) : null}
                    {"attachmentUrl" in currentStep && currentStep.attachmentUrl ? (
                      <a
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                        href={currentStep.attachmentUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <AppIcon className="text-base" name="attach_file" />
                        {"Open reference file"}
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {isSubmitted ? (
                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                    <AppIcon className="text-lg" name="check_circle" />
                  </div>
                  <div className="max-w-[85%] rounded-3xl rounded-tl-md bg-white px-4 py-3 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">
                      {"Your inquiry has been sent."}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {chatAccessToken ? "You can now ask verified questions about this property below." : "Admin and the assigned agent context are saved in Contact Us."}
                    </p>
                  </div>
                </div>
              ) : null}

              {chatTurns.length > 0 ? (
                <div aria-live="polite" className="space-y-4">
                  {chatTurns.map((turn) => turn.role === "visitor" ? (
                    <div className="flex justify-end" key={turn.id}>
                      <div className="max-w-[80%] rounded-3xl rounded-tr-md bg-primary px-4 py-3 text-white">
                        <p className="whitespace-pre-wrap text-sm">{turn.body}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3" key={turn.id}>
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                        <AppIcon className="text-lg" name="smart_toy" />
                      </div>
                      <div className="max-w-[85%] rounded-3xl rounded-tl-md bg-white px-4 py-3 shadow-sm">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{turn.body}</p>
                        {turn.reason ? <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{turn.reason}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {publicChatbot.isPending ? (
                <div aria-live="polite" className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white"><AppIcon className="text-lg" name="smart_toy" /></div>
                  <div className="rounded-3xl rounded-tl-md bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">Checking verified knowledge...</div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-l border-slate-200 bg-white px-6 py-6">
            {isSubmitted ? (
              <div className="space-y-4">
                <div className="rounded-3xl border border-green-200 bg-green-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-700">Inquiry Submitted</p>
                  <p className="mt-3 text-lg font-bold text-slate-900">Your details are saved.</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {chatAccessToken ? "Ask the knowledge chatbot a property question. It will answer only from verified sources." : "The property team can review your inquiry now."}
                  </p>
                </div>

                {chatAccessToken ? (
                  <div className="space-y-3 rounded-3xl border border-primary/15 bg-primary/5 p-4">
                    {chatTerminal ? (
                      <p className="rounded-2xl bg-white p-3 text-sm font-semibold text-slate-600">Automated chat has stopped for this conversation. The property team can continue with you directly.</p>
                    ) : (
                      <>
                        <label className="text-xs font-bold uppercase tracking-[0.18em] text-primary" htmlFor={`property-chat-question-${property.id}`}>Ask a verified question</label>
                        <Textarea
                          id={`property-chat-question-${property.id}`}
                          className="min-h-28 rounded-2xl border-slate-200 bg-white p-4"
                          disabled={publicChatbot.isPending}
                          maxLength={4000}
                          onChange={(event) => setChatDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault()
                              void handleChatSubmit()
                            }
                          }}
                          placeholder="Is parking included? Are pets allowed?"
                          value={chatDraft}
                        />
                        {chatError ? <p className="text-sm font-semibold text-rose-600">{chatError}</p> : null}
                        <button
                          className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={publicChatbot.isPending || !chatDraft.trim()}
                          onClick={() => void handleChatSubmit()}
                          type="button"
                        >
                          {publicChatbot.isPending ? "Checking verified knowledge..." : "Ask Chatbot"}
                        </button>
                      </>
                    )}
                  </div>
                ) : null}

                <button
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700"
                  onClick={() => onOpenChange(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
            ) : currentStep ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    {`Step ${Math.min(currentStepIndex + 1, steps.length)} of ${steps.length}`}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {"Each answer is saved into a structured summary for the property team."}
                  </p>
                </div>

                {"suggestions" in currentStep && currentStep.suggestions?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {currentStep.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        className="rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary"
                        onClick={() => setDraftAnswer(suggestion)}
                        type="button"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}

                {currentStep.kind === "field" && currentStep.multiline ? (
                  <Textarea
                    className="min-h-40 rounded-2xl border-slate-200 bg-slate-50 p-4"
                    onChange={(event) => setDraftAnswer(event.target.value)}
                    placeholder={currentStep.placeholder}
                    value={draftAnswer}
                  />
                ) : (
                  <Input
                    className="h-auto rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    onChange={(event) => setDraftAnswer(event.target.value)}
                    placeholder={currentStep.kind === "field" ? currentStep.placeholder : "Type your answer"}
                    type={currentStep.kind === "field" && currentStep.field === "contactEmail" ? "email" : "text"}
                    value={draftAnswer}
                  />
                )}

                {currentStep.kind === "pre-question" && currentStep.allowsFileUpload ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/20 bg-white px-4 py-2 text-sm font-bold text-primary">
                      <AppIcon className="text-base" name="attach_file" />
                      {draftFile ? "Replace File" : "Attach File"}
                      <input
                        className="hidden"
                        onChange={(event) => setDraftFile(event.target.files?.[0] ?? null)}
                        type="file"
                      />
                    </label>
                    {draftFile ? (
                      <p className="mt-3 text-sm text-slate-600">{draftFile.name}</p>
                    ) : (
                      <p className="mt-3 text-xs text-slate-500">
                        {"Optional: attach one file with this answer."}
                      </p>
                    )}
                  </div>
                ) : null}

                {submitError ? (
                  <p className="text-sm font-semibold text-rose-600">{submitError}</p>
                ) : null}

                <button
                  className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={inquiryMutation.isPending}
                  onClick={handleCurrentStepSubmit}
                  type="button"
                >
                  {"Save Answer & Continue"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl border border-primary/15 bg-primary/5 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                    {"Ready To Send"}
                  </p>
                  <p className="mt-3 text-lg font-bold text-slate-900">
                    {"Your transcript is complete."}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {"When you send this, it goes to Contact Us. Admin can convert it to a lead in one click."}
                  </p>
                </div>

                {submitError ? (
                  <p className="text-sm font-semibold text-rose-600">{submitError}</p>
                ) : null}

                <button
                  className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={inquiryMutation.isPending}
                  onClick={() => void handleSendConversation()}
                  type="button"
                >
                  {inquiryMutation.isPending ? "Sending Inquiry..." : "Send To Contact Us"}
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
