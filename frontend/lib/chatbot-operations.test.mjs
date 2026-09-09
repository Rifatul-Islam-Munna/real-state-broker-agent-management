import test from "node:test";
import assert from "node:assert/strict";

import {
  appendConversationalPrompt,
  buildTestChatbotInput,
  composeQuestionExamples,
  splitQuestionExamples,
  parseTestChatbotRole,
  parseTestCredit,
  parseTestMonthlyIncome,
  parseTestShowingIntent,
  normalizeTestHumanText,
  propertyQualification,
  qualificationMatchesProperty,
  filterBotActivity,
  leadShowingTemplates,
  propertyIdFromPickerLabel,
  propertyPickerLabel,
  shouldOfferPropertyIndex,
  splitIndexedKnowledge,
  testChatbotConversationReply,
  testQualificationClarification,
} from "./chatbot-operations.ts";

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
];

test("filters bot activity across search, kind, channel and status", () => {
  assert.deepEqual(
    filterBotActivity(activity, {
      search: "pine",
      kind: "event",
      channel: "SMS",
      status: "STOPPED",
    }).map((item) => item.id),
    ["2"],
  );
  assert.deepEqual(
    filterBotActivity(activity, {
      search: "parking",
      kind: "all",
      channel: "all",
      status: "all",
    }).map((item) => item.id),
    ["1"],
  );
});

test("test chat always uses lead web policy with selected property", () => {
  assert.deepEqual(buildTestChatbotInput(" Is parking included? ", 9), {
    audience: "LEAD",
    channel: "WEB",
    propertyId: 9,
    question: "Is parking included?",
  });
});

test("showing template picker includes only active LeadShowing templates", () => {
  const templates = [
    { id: "lead", name: "Lead", audience: "LeadShowing", isActive: true },
    { id: "off", name: "Off", audience: "LeadShowing", isActive: false },
    { id: "realtor", name: "Realtor", audience: "Realtor", isActive: true },
  ];
  assert.deepEqual(
    leadShowingTemplates(templates).map((item) => item.id),
    ["lead"],
  );
});

test("searchable property labels resolve without exposing raw IDs", () => {
  const properties = [
    { id: 9, title: "Oak Home", address: "12 Oak Street", status: "Published" },
  ];
  assert.equal(propertyPickerLabel(properties[0]), "Oak Home - 12 Oak Street");
  assert.equal(
    propertyIdFromPickerLabel("Oak Home - 12 Oak Street", properties),
    9,
  );
  assert.equal(propertyIdFromPickerLabel("oak", properties), null);
  assert.equal(propertyIdFromPickerLabel("", properties), null);
});

test("offers property indexing only for selected-property evidence failures", () => {
  assert.equal(
    shouldOfferPropertyIndex(
      { reason: "EVIDENCE_INSUFFICIENT", evidence: [] },
      9,
    ),
    true,
  );
  assert.equal(
    shouldOfferPropertyIndex(
      { reason: "EVIDENCE_INSUFFICIENT", evidence: [] },
      null,
    ),
    false,
  );
  assert.equal(
    shouldOfferPropertyIndex({ reason: "TURN_LIMIT", evidence: [] }, 9),
    false,
  );
});

test("keeps generated property fields out of the editable knowledge list", () => {
  const result = splitIndexedKnowledge([
    { id: "1", sourceType: "PROPERTY_FIELD" },
    { id: "2", sourceType: "MANUAL" },
    { id: "3", sourceType: "PROPERTY_FIELD" },
  ]);

  assert.deepEqual(
    result.manual.map((item) => item.id),
    ["2"],
  );
  assert.equal(result.propertyCount, 2);
});

test("splits one main question from similar phrasings without changing storage shape", () => {
  assert.deepEqual(
    composeQuestionExamples(
      "Can I park my car?",
      "Is parking included?\nWhere do I park?",
    ),
    ["Can I park my car?", "Is parking included?", "Where do I park?"],
  );
  assert.deepEqual(
    splitQuestionExamples([
      "Can I park my car?",
      "Is parking included?",
      "Where do I park?",
    ]),
    {
      mainQuestion: "Can I park my car?",
      similarQuestions: "Is parking included?\nWhere do I park?",
    },
  );
});

test("test conversation helpers understand role, credit, income and property criteria", () => {
  assert.equal(parseTestChatbotRole("I am a Realtor"), "REALTOR");
  assert.equal(parseTestChatbotRole("prospective tenant"), "LEAD");
  assert.equal(parseTestCredit("my credit is 735"), 735);
  assert.equal(parseTestMonthlyIncome("I make $5,000 per month"), 5000);
  const payload = {
    description:
      "Credit Score >> 720. Verifiable income ($4,650 monthly income).",
  };
  assert.deepEqual(propertyQualification(payload), {
    minimumCreditScore: 720,
    minimumMonthlyIncome: 4650,
  });
  assert.equal(qualificationMatchesProperty(735, 5000, payload), true);
  assert.equal(qualificationMatchesProperty(650, 5000, payload), false);
});

test("keeps the verified answer first and adds qualification as a soft follow-up", () => {
  assert.equal(
    appendConversationalPrompt(
      "The minimum credit score is 720.",
      "Are you looking to rent it yourself, or are you a Realtor?",
    ),
    "The minimum credit score is 720.\n\nAre you looking to rent it yourself, or are you a Realtor?",
  );
  assert.equal(
    appendConversationalPrompt("Parking is included.", ""),
    "Parking is included.",
  );
});

test("test conversation does not capture property numbers or requirements as qualification answers", () => {
  assert.equal(parseTestCredit("Is apartment 315 on the top floor?"), null);
  assert.equal(parseTestMonthlyIncome("Is the rent $1,550 per month?"), null);
  assert.equal(parseTestMonthlyIncome("What is the $500 HOA deposit?"), null);
  assert.equal(
    parseTestCredit("What minimum credit score do I need, is it 720?"),
    null,
  );
  assert.equal(
    parseTestMonthlyIncome("Is the minimum monthly income $4,650?"),
    null,
  );
});
test("test chatbot handles greetings and small talk without treating them as property questions", () => {
  assert.match(testChatbotConversationReply("hello") ?? "", /here to help/i);
  assert.match(
    testChatbotConversationReply("how are you?") ?? "",
    /here to help/i,
  );
  assert.match(testChatbotConversationReply("thanks") ?? "", /welcome/i);
  assert.equal(testChatbotConversationReply("Hi, what is the rent?"), null);
});

test("human normalization understands chat shorthand, typos and common rental slang", () => {
  assert.match(
    normalizeTestHumanText("cud i sched a shwng tmr?"),
    /schedule a showing tomorrow/,
  );
  assert.match(
    normalizeTestHumanText("is the proprty still up?"),
    /property still available/,
  );
  assert.match(
    normalizeTestHumanText("what r the utilites incl?"),
    /utilities included/,
  );
});

test("test chatbot role and showing helpers understand informal human messages", () => {
  assert.equal(
    parseTestChatbotRole("just me n my wife, we wanna move in"),
    "LEAD",
  );
  assert.equal(
    parseTestChatbotRole("we had 4 member of family will it fit?"),
    "LEAD",
  );
  assert.equal(parseTestChatbotRole("family of 4 will fit here?"), "LEAD");
  assert.equal(
    parseTestChatbotRole("im their agent, showing it for my client"),
    "REALTOR",
  );
  assert.equal(parseTestChatbotRole("who is the listing agent?"), null);
  assert.equal(parseTestShowingIntent("cud i swing by tmr?"), true);
  assert.equal(parseTestShowingIntent("any openings 4 a tour sat?"), true);
  assert.equal(parseTestShowingIntent("wud love to see it this wknd"), true);
  assert.equal(parseTestShowingIntent("what is the rent?"), false);
});
test("test chatbot qualification helpers accept natural spoken and shorthand answers", () => {
  assert.equal(parseTestCredit("seven forty"), 740);
  assert.equal(parseTestCredit("my score is seven hundred forty"), 740);
  assert.equal(parseTestMonthlyIncome("5k monthly"), 5000);
  assert.equal(parseTestMonthlyIncome("five grand"), 5000);
  assert.equal(parseTestMonthlyIncome("$75k/yr"), 6250);
  assert.equal(parseTestMonthlyIncome("1200/wk"), 5200);
  assert.equal(
    parseTestMonthlyIncome("my score is 750 n i make 5k monthly"),
    5000,
  );
  assert.equal(
    parseTestCredit("what minimum score do i need, seven forty?"),
    null,
  );
  assert.equal(parseTestMonthlyIncome("is the rent 1550 monthly?"), null);
});
test("test chatbot understands emotional approximate and typo-heavy qualification replies", () => {
  assert.equal(parseTestCredit("not great maybe 690"), 690);
  assert.equal(parseTestCredit("my score is low 700s"), 710);
  assert.equal(parseTestCredit("last i checked it was seven forty two"), 742);
  assert.equal(parseTestCredit("seven oh five"), 705);
  assert.equal(parseTestCredit("ahhh, my credit score is like 900"), null);
  assert.match(
    testQualificationClarification(
      "ahhh, my credit score is like 900",
      "creditScore",
    ) ?? "",
    /300–850/,
  );
  assert.match(
    testQualificationClarification(
      "my crenti score is like 7090",
      "creditScore",
    ) ?? "",
    /Did you mean/,
  );
  assert.equal(parseTestMonthlyIncome("not much maybe 4500"), 4500);
  assert.equal(parseTestMonthlyIncome("between 5 and 6k"), 5000);
  assert.equal(parseTestMonthlyIncome("five and a half grand"), 5500);
  assert.match(
    testQualificationClarification("i make like 50", "monthlyEarning") ?? "",
    /rough amount/i,
  );
});

test("test chatbot catches indirect typo-heavy showing requests", () => {
  assert.equal(
    parseTestShowingIntent(
      "i wanna visit this propraty tommor is it possibale to do it can you give me details",
    ),
    true,
  );
  assert.equal(
    parseTestShowingIntent("can i go there tomorrow and take a peek?"),
    true,
  );
  assert.equal(
    parseTestShowingIntent("can you send me more details and photos?"),
    false,
  );
});
