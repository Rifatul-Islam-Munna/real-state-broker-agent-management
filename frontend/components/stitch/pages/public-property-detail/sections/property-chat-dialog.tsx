"use client"

import { useEffect, useMemo, useState } from "react"

import type {
  CreatePropertyChatConversationInput,
  PropertyItem,
  PropertyPreQuestion,
} from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useCreatePropertyChat } from "@/hooks/use-real-estate-api"
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

function formatVisitorAnswer(step: ChatStep, contactState: ContactFormState, preAnswers: PreQuestionAnswerDraft[]) {
  if (step.kind === "pre-question") {
    const answer = preAnswers.find((item) => item.questionPrompt === step.prompt)
    const fileLabel = answer?.file ? `\nFile: ${answer.file.name}` : ""
    return `${answer?.answerText?.trim() ?? ""}${fileLabel}`.trim() || "Skipped"
  }

  return contactState[step.field]?.trim() || "Skipped"
}

export function PropertyChatDialog({ open, onOpenChange, property }: PropertyChatDialogProps) {
  const createPropertyChat = useCreatePropertyChat()
  const steps = useMemo(() => buildSteps(property), [property])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [draftAnswer, setDraftAnswer] = useState("")
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [contactState, setContactState] = useState<ContactFormState>(initialContactState)
  const [preAnswers, setPreAnswers] = useState<PreQuestionAnswerDraft[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

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

      const payload: CreatePropertyChatConversationInput = {
        additionalMessage: contactState.additionalMessage,
        answers,
        budget: contactState.budget,
        contactEmail: contactState.contactEmail,
        contactName: contactState.contactName,
        contactPhone: contactState.contactPhone,
        interest: contactState.interest,
        propertyId: property.id,
        timeline: contactState.timeline,
      }

      const response = await createPropertyChat.mutateAsync(payload)

      if (response.error) {
        throw response.error
      }

      setIsSubmitted(true)
    } catch (error) {
      await Promise.allSettled(uploadedObjectNames.map((objectName) => deleteUploadedAsset(objectName)))
      setSubmitError(error instanceof Error ? error.message : "Failed to send the chat.")
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
            {"Property Chat Intake"}
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-900">
            {"Contact Agent"}
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            {"The chat starts with listing-specific pre-questions, then it collects the structured details your agent needs to follow up and create a lead."}
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
                      {"Your chat has been saved."}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {"The transcript and summary are now stored for the assigned agent, and the system has already checked whether it should create or update a lead automatically."}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-l border-slate-200 bg-white px-6 py-6">
            {isSubmitted ? (
              <div className="space-y-4">
                <div className="rounded-3xl border border-green-200 bg-green-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-700">
                    {"Chat Submitted"}
                  </p>
                  <p className="mt-3 text-lg font-bold text-slate-900">
                    {"The agent can review it now."}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {"You can close this window or continue browsing the property details."}
                  </p>
                </div>
                <button
                  className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white"
                  onClick={() => onOpenChange(false)}
                  type="button"
                >
                  {"Close Chat"}
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
                  disabled={createPropertyChat.isPending}
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
                    {"When you send this, the system stores the chat, creates a summary, and checks whether the inquiry should be auto-added to leads."}
                  </p>
                </div>

                {submitError ? (
                  <p className="text-sm font-semibold text-rose-600">{submitError}</p>
                ) : null}

                <button
                  className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={createPropertyChat.isPending}
                  onClick={() => void handleSendConversation()}
                  type="button"
                >
                  {createPropertyChat.isPending ? "Sending Chat..." : "Send To Agent"}
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
