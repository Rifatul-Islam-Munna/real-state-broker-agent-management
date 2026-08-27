import test from "node:test"
import assert from "node:assert/strict"

import {
  appendConversationalPrompt,
  buildTestChatbotInput,
  composeQuestionExamples,
  splitQuestionExamples,
  parseTestChatbotRole,
  parseTestCredit,
  parseTestMonthlyIncome,
  propertyQualification,
  qualificationMatchesProperty,
  filterBotActivity,
  leadShowingTemplates,
  propertyIdFromPickerLabel,
  propertyPickerLabel,
  shouldOfferPropertyIndex,
  splitIndexedKnowledge,
} from "./chatbot-operations.ts"

const activity = [
  {
    id: "1",
    kind: "message",
    type: "BOT",
    reason: "EVIDENCE_VERIFIED",
    body: "Parking is included.",
    channel: "WEB",
    conversationStatus: "ACTIVE",
    leadName: "Sam Lead",
    propertyTitle: "Oak Home",
    createdAt: "2026-08-26T10:00:00Z",
  },
  {
    id: "2",
    kind: "event",
    type: "STOPPED",
    reason: "TURN_LIMIT",
    body: null,
    channel: "SMS",
    conversationStatus: "STOPPED",
    leadName: "Alex Buyer",
    propertyTitle: "Pine Condo",
    createdAt: "2026-08-26T09:00:00Z",
  },
]

test("filters bot activity across search, kind, channel and status", () => {
  assert.deepEqual(
    filterBotActivity(activity, {
      search: "pine",
      kind: "event",
      channel: "SMS",
      status: "STOPPED",
    }).map((item) => item.id),
    ["2"]
  )
  assert.deepEqual(
    filterBotActivity(activity, {
      search: "parking",
      kind: "all",
      channel: "all",
      status: "all",
    }).map((item) => item.id),
    ["1"]
  )
})

test("test chat always uses lead web policy with selected property", () => {
  assert.deepEqual(buildTestChatbotInput(" Is parking included? ", 9), {
    audience: "LEAD",
    channel: "WEB",
    propertyId: 9,
    question: "Is parking included?",
  })
})

test("showing template picker includes only active LeadShowing templates", () => {
  const templates = [
    { id: "lead", name: "Lead", audience: "LeadShowing", isActive: true },
    { id: "off", name: "Off", audience: "LeadShowing", isActive: false },
    { id: "realtor", name: "Realtor", audience: "Realtor", isActive: true },
  ]
  assert.deepEqual(leadShowingTemplates(templates).map((item) => item.id), ["lead"])
})

test("searchable property labels resolve without exposing raw IDs", () => {
  const properties = [
    { id: 9, title: "Oak Home", address: "12 Oak Street", status: "Published" },
  ]
  assert.equal(propertyPickerLabel(properties[0]), "Oak Home - 12 Oak Street")
  assert.equal(propertyIdFromPickerLabel("Oak Home - 12 Oak Street", properties), 9)
  assert.equal(propertyIdFromPickerLabel("oak", properties), null)
  assert.equal(propertyIdFromPickerLabel("", properties), null)
})

test("offers property indexing only for selected-property evidence failures", () => {
  assert.equal(
    shouldOfferPropertyIndex({ reason: "EVIDENCE_INSUFFICIENT", evidence: [] }, 9),
    true
  )
  assert.equal(
    shouldOfferPropertyIndex({ reason: "EVIDENCE_INSUFFICIENT", evidence: [] }, null),
    false
  )
  assert.equal(
    shouldOfferPropertyIndex({ reason: "TURN_LIMIT", evidence: [] }, 9),
    false
  )
})

test("keeps generated property fields out of the editable knowledge list", () => {
  const result = splitIndexedKnowledge([
    { id: "1", sourceType: "PROPERTY_FIELD" },
    { id: "2", sourceType: "MANUAL" },
    { id: "3", sourceType: "PROPERTY_FIELD" },
  ])

  assert.deepEqual(result.manual.map((item) => item.id), ["2"])
  assert.equal(result.propertyCount, 2)
})

test("splits one main question from similar phrasings without changing storage shape", () => {
  assert.deepEqual(composeQuestionExamples("Can I park my car?", "Is parking included?\nWhere do I park?"), [
    "Can I park my car?",
    "Is parking included?",
    "Where do I park?",
  ])
  assert.deepEqual(splitQuestionExamples(["Can I park my car?", "Is parking included?", "Where do I park?"]), {
    mainQuestion: "Can I park my car?",
    similarQuestions: "Is parking included?\nWhere do I park?",
  })
})

test("test conversation helpers understand role, credit, income and property criteria", () => {
  assert.equal(parseTestChatbotRole("I am a Realtor"), "REALTOR")
  assert.equal(parseTestChatbotRole("prospective tenant"), "LEAD")
  assert.equal(parseTestCredit("my credit is 735"), 735)
  assert.equal(parseTestMonthlyIncome("I make $5,000 per month"), 5000)
  const payload = { description: "Credit Score >> 720. Verifiable income ($4,650 monthly income)." }
  assert.deepEqual(propertyQualification(payload), { minimumCreditScore: 720, minimumMonthlyIncome: 4650 })
  assert.equal(qualificationMatchesProperty(735, 5000, payload), true)
  assert.equal(qualificationMatchesProperty(650, 5000, payload), false)
})


test("keeps the verified answer first and adds qualification as a soft follow-up", () => {
  assert.equal(
    appendConversationalPrompt("The minimum credit score is 720.", "Are you looking to rent it yourself, or are you a Realtor?"),
    "The minimum credit score is 720.\n\nAre you looking to rent it yourself, or are you a Realtor?"
  )
  assert.equal(appendConversationalPrompt("Parking is included.", ""), "Parking is included.")
})


test("test conversation does not capture property numbers or requirements as qualification answers", () => {
  assert.equal(parseTestCredit("Is apartment 315 on the top floor?"), null)
  assert.equal(parseTestMonthlyIncome("Is the rent $1,550 per month?"), null)
  assert.equal(parseTestMonthlyIncome("What is the $500 HOA deposit?"), null)
  assert.equal(parseTestCredit("What minimum credit score do I need, is it 720?"), null)
  assert.equal(parseTestMonthlyIncome("Is the minimum monthly income $4,650?"), null)
})