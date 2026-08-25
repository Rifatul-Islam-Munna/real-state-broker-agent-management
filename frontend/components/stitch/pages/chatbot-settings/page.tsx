"use client"

import {
  useCallback,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react"
import {
  BotIcon,
  BookOpenIcon,
  RefreshCwIcon,
  SaveIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  addChatbotKnowledge,
  deleteChatbotKnowledge,
  reindexChatbotKnowledge,
  saveChatbotSettings,
  updateChatbotKnowledge,
  type ChatbotKnowledge,
  type ChatbotSettings,
} from "@/lib/tenant-chatbot-actions"

type Props = {
  initialSettings: ChatbotSettings
  initialKnowledge: ChatbotKnowledge[]
}

type BooleanGroup = "channels" | "stopRules"

function SettingSwitch({
  checked,
  description,
  group,
  id,
  label,
  onChange,
}: {
  checked: boolean
  description: string
  group: BooleanGroup
  id: string
  label: string
  onChange: (group: BooleanGroup, id: string, checked: boolean) => void
}) {
  const handleCheckedChange = useCallback(
    (value: boolean) => onChange(group, id, value),
    [group, id, onChange]
  )

  return (
    <Field orientation="horizontal">
      <FieldLabel htmlFor={id}>
        <span className="flex flex-col gap-0.5">
          <span>{label}</span>
          <FieldDescription>{description}</FieldDescription>
        </span>
      </FieldLabel>
      <Switch id={id} checked={checked} onCheckedChange={handleCheckedChange} />
    </Field>
  )
}

export function ChatbotSettingsPage({
  initialSettings,
  initialKnowledge,
}: Props) {
  const [settings, setSettings] = useState(initialSettings)
  const [knowledge, setKnowledge] = useState(initialKnowledge)
  const [isSaving, startSaving] = useTransition()
  const [isAdding, startAdding] = useTransition()
  const [isManaging, startManaging] = useTransition()

  const updateBoolean = useCallback(
    (group: BooleanGroup, id: string, checked: boolean) => {
      setSettings((current) => ({
        ...current,
        [group]: { ...current[group], [id]: checked },
      }))
    },
    []
  )

  const handleEnabledChange = useCallback((checked: boolean) => {
    setSettings((current) => ({ ...current, enabled: checked }))
  }, [])

  const handleNumberChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.currentTarget
      setSettings((current) => ({ ...current, [name]: Number(value) }))
    },
    []
  )

  const handleMessageChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const { name, value } = event.currentTarget
      setSettings((current) => ({ ...current, [name]: value }))
    },
    []
  )

  const handleSave = useCallback(() => {
    startSaving(async () => {
      try {
        const saved = await saveChatbotSettings(settings)
        setSettings(saved)
        toast.success("Chatbot settings saved")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save settings"
        )
      }
    })
  }, [settings])

  const handleKnowledgeSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = event.currentTarget
      const data = new FormData(form)
      startAdding(async () => {
        try {
          const created = await addChatbotKnowledge({
            propertyId: Number(data.get("propertyId")) || null,
            audience:
              String(data.get("audience")) === "REALTOR" ? "REALTOR" : "LEAD",
            title: String(data.get("title") ?? ""),
            answer: String(data.get("answer") ?? ""),
            questionExamples: String(data.get("questionExamples") ?? "")
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
            priority: Number(data.get("priority")) || 50,
          })
          setKnowledge((current) => [created, ...current])
          form.reset()
          toast.success("Knowledge added and indexed")
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Could not add knowledge"
          )
        }
      })
    },
    []
  )

  const handleKnowledgeUpdate = useCallback(
    (event: FormEvent<HTMLFormElement>, id: string) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      startManaging(async () => {
        try {
          const updated = await updateChatbotKnowledge(id, {
            propertyId: Number(data.get("propertyId")) || null,
            audience:
              String(data.get("audience")) === "REALTOR" ? "REALTOR" : "LEAD",
            title: String(data.get("title") ?? ""),
            answer: String(data.get("answer") ?? ""),
            questionExamples: String(data.get("questionExamples") ?? "")
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
            priority: Number(data.get("priority")) || 50,
          })
          setKnowledge((current) =>
            current.map((item) => (item.id === id ? updated : item))
          )
          toast.success("Knowledge updated and reindexed")
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not update knowledge"
          )
        }
      })
    },
    []
  )

  const handleKnowledgeStatus = useCallback((item: ChatbotKnowledge) => {
    startManaging(async () => {
      try {
        const updated = await updateChatbotKnowledge(item.id, {
          active: !item.active,
        })
        setKnowledge((current) =>
          current.map((entry) => (entry.id === item.id ? updated : entry))
        )
        toast.success(
          updated.active ? "Knowledge enabled" : "Knowledge disabled"
        )
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not change knowledge status"
        )
      }
    })
  }, [])

  const handleKnowledgeDelete = useCallback((id: string) => {
    startManaging(async () => {
      try {
        await deleteChatbotKnowledge(id)
        setKnowledge((current) => current.filter((item) => item.id !== id))
        toast.success("Knowledge deleted")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not delete knowledge"
        )
      }
    })
  }, [])

  const handleReindex = useCallback(() => {
    startManaging(async () => {
      try {
        const result = await reindexChatbotKnowledge()
        toast.success(
          `Reindexed ${result.indexed} property knowledge item${result.indexed === 1 ? "" : "s"}`
        )
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not reindex knowledge"
        )
      }
    })
  }, [])

  return (
    <main className="flex min-h-full flex-col gap-6 bg-background p-4 text-foreground md:p-8">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <BotIcon />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Knowledge Chatbot
              </h1>
              <Badge variant={settings.enabled ? "default" : "secondary"}>
                {settings.enabled ? "Automation active" : "Automation paused"}
              </Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Evidence-first replies for web chat, email, and SMS. Every answer
              is traceable and every stop is logged.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FieldLabel htmlFor="chatbot-enabled">Master switch</FieldLabel>
          <Switch
            id="chatbot-enabled"
            checked={settings.enabled}
            onCheckedChange={handleEnabledChange}
          />
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <SaveIcon data-icon="inline-start" />
            )}
            Save settings
          </Button>
        </div>
      </header>

      {!settings.enabled && (
        <Alert>
          <ShieldCheckIcon />
          <AlertTitle>The chatbot is safely paused</AlertTitle>
          <AlertDescription>
            Test mode still works, but no lead will receive automated replies
            until the master switch and its channel are enabled.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery channels</CardTitle>
              <CardDescription>
                Each channel stays independently controlled.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <SettingSwitch
                  checked={settings.channels.web}
                  description="Reply inside public property chat."
                  group="channels"
                  id="web"
                  label="Web chat"
                  onChange={updateBoolean}
                />
                <SettingSwitch
                  checked={settings.channels.email}
                  description="Reply to linked inbound lead email."
                  group="channels"
                  id="email"
                  label="Email"
                  onChange={updateBoolean}
                />
                <SettingSwitch
                  checked={settings.channels.sms}
                  description="Reply to linked inbound text messages."
                  group="channels"
                  id="sms"
                  label="SMS"
                  onChange={updateBoolean}
                />
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Answer quality</CardTitle>
              <CardDescription>
                Low-confidence answers stop instead of guessing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="minimumConfidence">
                    Minimum confidence
                  </FieldLabel>
                  <Input
                    id="minimumConfidence"
                    name="minimumConfidence"
                    type="number"
                    min="0.5"
                    max="0.99"
                    step="0.01"
                    value={settings.minimumConfidence}
                    onChange={handleNumberChange}
                  />
                  <FieldDescription>
                    Recommended: 0.82 or higher.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="responseDelaySeconds">
                    Reply delay in seconds
                  </FieldLabel>
                  <Input
                    id="responseDelaySeconds"
                    name="responseDelaySeconds"
                    type="number"
                    min="0"
                    max="300"
                    value={settings.responseDelaySeconds}
                    onChange={handleNumberChange}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="maxTurns">
                    Maximum conversation turns
                  </FieldLabel>
                  <Input
                    id="maxTurns"
                    name="maxTurns"
                    type="number"
                    min="1"
                    max="50"
                    value={settings.maxTurns}
                    onChange={handleNumberChange}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="fallbackMessage">
                    Safe fallback message
                  </FieldLabel>
                  <Textarea
                    id="fallbackMessage"
                    name="fallbackMessage"
                    value={settings.fallbackMessage}
                    onChange={handleMessageChange}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="creditRequiredMessage">
                    Credit score question
                  </FieldLabel>
                  <Textarea
                    id="creditRequiredMessage"
                    name="creditRequiredMessage"
                    value={settings.creditRequiredMessage}
                    onChange={handleMessageChange}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="creditRejectedMessage">
                    Below-minimum response
                  </FieldLabel>
                  <Textarea
                    id="creditRejectedMessage"
                    name="creditRejectedMessage"
                    value={settings.creditRejectedMessage}
                    onChange={handleMessageChange}
                  />
                </Field>{" "}
                <Field>
                  <FieldLabel htmlFor="propertyUnavailableMessage">
                    Unavailable-property response
                  </FieldLabel>
                  <Textarea
                    id="propertyUnavailableMessage"
                    name="propertyUnavailableMessage"
                    value={settings.propertyUnavailableMessage}
                    onChange={handleMessageChange}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="evidenceConflictMessage">
                    Conflicting-evidence response
                  </FieldLabel>
                  <Textarea
                    id="evidenceConflictMessage"
                    name="evidenceConflictMessage"
                    value={settings.evidenceConflictMessage}
                    onChange={handleMessageChange}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="turnLimitMessage">
                    Turn-limit response
                  </FieldLabel>
                  <Textarea
                    id="turnLimitMessage"
                    name="turnLimitMessage"
                    value={settings.turnLimitMessage}
                    onChange={handleMessageChange}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="realtorVerificationMessage">
                    Unverified-realtor response
                  </FieldLabel>
                  <Textarea
                    id="realtorVerificationMessage"
                    name="realtorVerificationMessage"
                    value={settings.realtorVerificationMessage}
                    onChange={handleMessageChange}
                  />
                  <FieldDescription>
                    Used when a lead asks for lockbox, entry, owner-contact,
                    commission, or other realtor-only information.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheckIcon /> Strict stop rules
              </CardTitle>
              <CardDescription>
                These checks run again immediately before every delivery.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <SettingSwitch
                  checked={settings.stopRules.humanIntervention}
                  description="Handoff as soon as staff sends a message."
                  group="stopRules"
                  id="humanIntervention"
                  label="Human intervention"
                  onChange={updateBoolean}
                />
                <SettingSwitch
                  checked={settings.stopRules.doNotContact}
                  description="Never reply to opted-out leads."
                  group="stopRules"
                  id="doNotContact"
                  label="Do not contact"
                  onChange={updateBoolean}
                />
                <SettingSwitch
                  checked={settings.stopRules.propertyUnavailable}
                  description="Stop when the listing is no longer published."
                  group="stopRules"
                  id="propertyUnavailable"
                  label="Unavailable property"
                  onChange={updateBoolean}
                />
                <SettingSwitch
                  checked={settings.stopRules.creditBelowMinimum}
                  description="Stop below the property's minimum score."
                  group="stopRules"
                  id="creditBelowMinimum"
                  label="Credit requirement"
                  onChange={updateBoolean}
                />
                <SettingSwitch
                  checked={settings.stopRules.insufficientEvidence}
                  description="No evidence means no factual answer."
                  group="stopRules"
                  id="insufficientEvidence"
                  label="Insufficient evidence"
                  onChange={updateBoolean}
                />
                <SettingSwitch
                  checked={settings.stopRules.evidenceConflict}
                  description="Conflicting sources require staff review."
                  group="stopRules"
                  id="evidenceConflict"
                  label="Conflicting evidence"
                  onChange={updateBoolean}
                />
                <SettingSwitch
                  checked={settings.stopRules.turnLimit}
                  description="Prevent endless automated conversations."
                  group="stopRules"
                  id="turnLimit"
                  label="Turn limit"
                  onChange={updateBoolean}
                />
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon /> Improve knowledge
              </CardTitle>
              <CardDescription>
                Add verified tenant or property facts. Realtor-only answers
                never reach leads.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleKnowledgeSubmit}>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="knowledge-title">
                      Fact title
                    </FieldLabel>
                    <Input
                      id="knowledge-title"
                      name="title"
                      required
                      maxLength={240}
                      placeholder="Parking policy"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="knowledge-answer">
                      Verified answer
                    </FieldLabel>
                    <Textarea
                      id="knowledge-answer"
                      name="answer"
                      required
                      placeholder="One assigned parking space is included."
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="knowledge-questions">
                      Example questions
                    </FieldLabel>
                    <Textarea
                      id="knowledge-questions"
                      name="questionExamples"
                      placeholder={"Is parking included?\nCan I park an SUV?"}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field>
                      <FieldLabel>Audience</FieldLabel>
                      <Select name="audience" defaultValue="LEAD">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="LEAD">Lead</SelectItem>
                            <SelectItem value="REALTOR">
                              Realtor only
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="knowledge-property">
                        Property ID
                      </FieldLabel>
                      <Input
                        id="knowledge-property"
                        name="propertyId"
                        type="number"
                        min="1"
                        placeholder="All properties"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="knowledge-priority">
                        Priority
                      </FieldLabel>
                      <Input
                        id="knowledge-priority"
                        name="priority"
                        type="number"
                        min="0"
                        max="100"
                        defaultValue="50"
                      />
                    </Field>
                  </div>
                </FieldGroup>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isAdding}>
                  {isAdding ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <SparklesIcon data-icon="inline-start" />
                  )}
                  Add and index knowledge
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpenIcon /> Indexed knowledge
                </CardTitle>
                <CardDescription>
                  {knowledge.length} verified knowledge item
                  {knowledge.length === 1 ? "" : "s"}.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReindex}
                disabled={isManaging}
              >
                {isManaging ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <RefreshCwIcon data-icon="inline-start" />
                )}
                Reindex properties
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {knowledge.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tenant knowledge has been added yet. Property fields are
                  indexed separately.
                </p>
              ) : (
                knowledge.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{item.title}</h3>
                      <Badge variant="outline">{item.audience}</Badge>
                      <Badge
                        variant={
                          item.indexStatus === "indexed"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {item.indexStatus}
                      </Badge>
                      <Badge variant={item.active ? "default" : "secondary"}>
                        {item.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {item.answer}
                    </p>
                    {item.sourceType === "MANUAL" ? (
                      <details className="rounded-lg border bg-muted/20 p-3">
                        <summary className="cursor-pointer text-sm font-medium">
                          Edit verified knowledge
                        </summary>
                        <form
                          className="mt-4 space-y-3"
                          onSubmit={(event) =>
                            handleKnowledgeUpdate(event, item.id)
                          }
                        >
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                              name="title"
                              defaultValue={item.title}
                              required
                              maxLength={240}
                              aria-label="Knowledge title"
                            />
                            <Input
                              name="propertyId"
                              type="number"
                              min="1"
                              defaultValue={item.propertyId ?? ""}
                              placeholder="All properties"
                              aria-label="Property ID"
                            />
                          </div>
                          <Textarea
                            name="answer"
                            defaultValue={item.answer}
                            required
                            aria-label="Verified answer"
                          />
                          <Textarea
                            name="questionExamples"
                            defaultValue={(item.questionExamples ?? []).join(
                              "\n"
                            )}
                            placeholder="One example question per line"
                            aria-label="Example questions"
                          />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Select
                              name="audience"
                              defaultValue={item.audience}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="LEAD">Lead</SelectItem>
                                <SelectItem value="REALTOR">
                                  Realtor only
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              name="priority"
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={item.priority}
                              aria-label="Priority"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="submit"
                              size="sm"
                              disabled={isManaging}
                            >
                              Save changes
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isManaging}
                              onClick={() => handleKnowledgeStatus(item)}
                            >
                              {item.active ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={isManaging}
                              onClick={() => handleKnowledgeDelete(item.id)}
                            >
                              <Trash2Icon data-icon="inline-start" /> Delete
                            </Button>
                          </div>
                        </form>
                      </details>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Managed automatically from property fields.
                      </p>
                    )}
                  </article>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
