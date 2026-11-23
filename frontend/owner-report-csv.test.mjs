import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  defaultTemplateSource,
  extractTemplateTokens,
  findConfidentPropertyMatch,
  parseWeeklyOwnerReportCsv,
  renderTemplateWithMapping,
} from "./lib/owner-report-csv.ts"

function csv(rows) {
  return rows
    .map((row) =>
      row.map((value) => {
        const text = String(value ?? "")
        return /[",\n\r]/.test(text)
          ? '"' + text.replaceAll('"', '""') + '"'
          : text
      }).join(",")
    )
    .join("\r\n")
}

test("detects Excel-style merged headings and selects only one week's feedback", () => {
  const groups = ["Inquiries", "Appointments", "Showings", "Applications", "Feedback"]
  const headings = ["Address", ...groups.flatMap((name) => [name, "", "", ""])]
  const weekHeadings = ["Address", ...groups.flatMap(() => ["1st week", "2nd week", "3rd week", "4th week"])]
  const csvText = csv([
    ["Weekly Review"],
    headings,
    weekHeadings,
    [],
    ["2686 NW 60th Way Unit#169",
      "8", "8", "6", "2",
      "3", "3", "4", "1",
      "3", "3", "2", "1",
      "0", "1", "0", "0",
      "Week one, not for Week 2", "Second week feedback", "Week three feedback", "Week four feedback"],
  ])

  const result = parseWeeklyOwnerReportCsv(csvText, 2)
  assert.equal(result.layout, "grouped")
  assert.equal(result.rows.length, 1)
  assert.equal(result.rows[0].propertyName, "2686 NW 60th Way Unit#169")
  assert.equal(result.rows[0].inquiries, "8")
  assert.equal(result.rows[0].appointments, "3")
  assert.equal(result.rows[0].showings, "3")
  assert.equal(result.rows[0].applications, "1")
  assert.equal(result.rows[0].feedback, "Second week feedback")
})

test("flat headings allow arbitrary metric order, missing metric groups and quoted multiline feedback", () => {
  const csvText = csv([
    ["Address", "Feedback Week 3", "Showings W3", "Inquiries - week 3", "Appointments 3rd week", "Applications wk3"],
    ["1000 Northeast 14th Avenue",
      "First prospect liked the garden.\nSecond prospect liked the kitchen.",
      "1", "4", "2", "0"],
  ])
  const result = parseWeeklyOwnerReportCsv(csvText, 3)
  assert.equal(result.layout, "flat")
  assert.equal(result.rows[0].feedback, "First prospect liked the garden.\nSecond prospect liked the kitchen.")
  assert.equal(result.rows[0].inquiries, "4")
  assert.equal(result.rows[0].showings, "1")
})

test("numbered feedback columns follow the selected week instead of always including the first", () => {
  const text = csv([
    ["Address", "Inquiries Week 1", "Inquiries Week 2", "Inquiries Week 3", "Inquiries Week 4",
      "Feedback 1", "Feedback #2", "Feedback3", "Feedback (4)"],
    ["12 Example Road", "1", "2", "3", "4",
      "First week's feedback", "Second week's feedback", "Third week's feedback", "Fourth week's feedback"],
  ])

  for (const week of [1, 2, 3, 4]) {
    const result = parseWeeklyOwnerReportCsv(text, week)
    assert.equal(result.rows[0].inquiries, String(week))
    assert.equal(result.rows[0].feedback, [
      "First week's feedback", "Second week's feedback",
      "Third week's feedback", "Fourth week's feedback",
    ][week - 1], `Week ${week} must use only its own feedback`)
  }
})

test("compact numbered metric headers use the correct week and never fall back to Week 1", () => {
  const text = csv([
    ["Address", "Inquiries1", "Inquiries2", "Inquiries3", "Feedback1", "Feedback3"],
    ["30 River Street", "6", "7", "8", "Week 1 comments", "Week 3 comments"],
  ])
  const second = parseWeeklyOwnerReportCsv(text, 2)
  assert.equal(second.rows[0].inquiries, "7")
  assert.equal(second.rows[0].feedback, "")
  const third = parseWeeklyOwnerReportCsv(text, 3)
  assert.equal(third.rows[0].inquiries, "8")
  assert.equal(third.rows[0].feedback, "Week 3 comments")
})

test("semicolon CSV and spelled-out week headings import correctly", () => {
  const text = [
    "Address;Inquiries First Week;Appointments First Week;Feedback First Week",
    "18 Example Avenue;3;1;Asked about the garden",
  ].join("\n")
  const result = parseWeeklyOwnerReportCsv(text, 1)
  assert.equal(result.rows[0].inquiries, "3")
  assert.equal(result.rows[0].appointments, "1")
  assert.equal(result.rows[0].feedback, "Asked about the garden")
})

test("long format filters the requested week and merges multiple feedback rows", () => {
  const csvText = csv([
    ["Address", "Week", "Inquiries", "Appointments", "Showings", "Applications", "Feedback"],
    ["10 High Street", "Week 1", "5", "0", "0", "0", "wrong week"],
    ["10 High Street", "Week 2", "2", "0", "1", "0", "Found the house bright."],
    ["10 High Street", "2", "1", "0", "0", "0", "Wanted a second showing."],
  ])
  const result = parseWeeklyOwnerReportCsv(csvText, 2)
  assert.equal(result.layout, "long")
  assert.equal(result.rows.length, 1)
  assert.equal(result.rows[0].inquiries, "3")
  assert.equal(result.rows[0].showings, "1")
  assert.equal(result.rows[0].feedback, "Found the house bright.\n\nWanted a second showing.")
})

test("both downloadable templates import without special options", () => {
  for (const filename of ["owner-report-standard.csv", "owner-report-grouped.csv"]) {
    const file = readFileSync(new URL("./public/" + filename, import.meta.url), "utf8")
    const first = parseWeeklyOwnerReportCsv(file, 1)
    const fourth = parseWeeklyOwnerReportCsv(file, 4)
    assert.equal(first.rows.length, 1, filename)
    assert.equal(fourth.rows.length, 1, filename)
    assert.equal(first.rows[0].inquiries, "2", filename)
    assert.equal(fourth.rows[0].inquiries, "1", filename)
  }
})

test("blank and demo CSV downloads use the supported four-week format", () => {
  const blank = readFileSync(new URL("./public/owner-report-blank.csv", import.meta.url), "utf8")
  const demo = readFileSync(new URL("./public/owner-report-demo.csv", import.meta.url), "utf8")
  assert.equal(blank.trim().split(/\r?\n/).length, 1)
  assert.match(blank, /^Address,Inquiries Week 1,/)
  assert.match(blank, /Feedback Week 4/)
  for (const week of [1, 2, 3, 4]) {
    const parsed = parseWeeklyOwnerReportCsv(demo, week)
    assert.equal(parsed.rows.length, 2, "demo week " + week)
    assert.equal(parsed.rows[0].propertyName, "123 Example Lane")
    assert.ok(parsed.rows[0].feedback, "demo has feedback for week " + week)
  }
})

test("property matching avoids ambiguous matches and wrong unit numbers", () => {
  const sameUnits = [
    { id: 1, title: "2686 NW 60th Way Unit 169" },
    { id: 2, title: "2686 NW 60th Way Unit 170" },
  ]
  const match = findConfidentPropertyMatch("2686 NW 60th Way Unit#169", sameUnits)
  assert.equal(match.property?.id, 1)

  const ambiguous = findConfidentPropertyMatch("42 Main Street", [
    { id: 11, title: "42 Main St" },
    { id: 12, title: "42 Main Street" },
  ])
  assert.equal(ambiguous.property, null)
})

test("merged Address header can refer to property values in the adjacent column", () => {
  const groups = ["Inquiries", "Appointments", "Showings", "Applications", "Feedback"]
  const headings = ["Address", "", ...groups.flatMap((name) => [name, "", "", ""])]
  const weeks = ["Address", "", ...groups.flatMap(() => ["1st", "2nd", "3rd", "4th"])]
  const row = ["", "987 Second Street", "1", "2", "3", "4",
    "0", "0", "0", "0", "1", "1", "1", "1",
    "0", "0", "0", "0", "First", "Second", "Third", "Fourth"]
  const result = parseWeeklyOwnerReportCsv(csv([
    ["Weekly Review"], headings, weeks, row,
  ]), 4)
  assert.equal(result.propertyColumn, 2)
  assert.equal(result.rows[0].propertyName, "987 Second Street")
  assert.equal(result.rows[0].inquiries, "4")
  assert.equal(result.rows[0].feedback, "Fourth")
})

test("repeated feedback columns for one selected week are combined", () => {
  const text = csv([
    ["Address", "Inquiries Week 1", "Appointments Week 1",
      "Feedback Week 1", "Feedback Week 1"],
    ["12 Lake Road", "1", "0", "Positive feedback", "Asked about price"],
  ])
  const result = parseWeeklyOwnerReportCsv(text, 1)
  assert.equal(result.rows[0].feedback, "Positive feedback\n\nAsked about price")
})

test("new template variables map to the selected week data", () => {
  assert.equal(defaultTemplateSource("inquiries"), "inquiries")
  assert.equal(defaultTemplateSource("appointments"), "appointments")
  assert.equal(defaultTemplateSource("showings"), "showings")
  assert.equal(defaultTemplateSource("applications"), "applications")
  assert.equal(defaultTemplateSource("feedback"), "feedback")
  assert.equal(defaultTemplateSource("feedback_count"), "feedbackCount")
  assert.equal(defaultTemplateSource("total_activity"), "totalActivity")
  assert.equal(defaultTemplateSource("fromdate"), "fromDate")
  assert.equal(defaultTemplateSource("todate"), "toDate")
  assert.equal(defaultTemplateSource("report_period"), "reportPeriod")
  assert.equal(defaultTemplateSource("property_address"), "propertyName")
  assert.equal(defaultTemplateSource("client_name"), "ownerName")
  assert.equal(defaultTemplateSource("seller_name"), "ownerName")
  assert.equal(defaultTemplateSource("landlord_name"), "ownerName")
  assert.equal(defaultTemplateSource("recipient_email"), "ownerEmail")
  const rendered = renderTemplateWithMapping(
    "Week {{week}}: {{inquiries}} inquiries, {{feedback}}",
    { week: "week", inquiries: "inquiries", feedback: "feedback" },
    { week: "2", inquiries: "4", feedback: "Nice house" }
  )
  assert.equal(rendered, "Week 2: 4 inquiries, Nice house")
})

test("conditional feedback removes the entire sentence and extra blank line when empty", () => {
  const body = "Hello {{owner_name}},\n\n{{#if feedback}}Feedback: {{feedback}}{{/if}}\n\nRegards"
  const mapping = { owner_name: "ownerName", feedback: "feedback" }
  assert.equal(
    renderTemplateWithMapping(body, mapping, { ownerName: "Alex", feedback: "Nice garden." }),
    "Hello Alex,\n\nFeedback: Nice garden.\n\nRegards"
  )
  assert.equal(
    renderTemplateWithMapping(body, mapping, { ownerName: "Alex", feedback: "   " }),
    "Hello Alex,\n\nRegards"
  )
})

test("conditional guards are extracted for mapping even without a matching value placeholder", () => {
  const body = "Stats:\n{{#if inquiries}}Inquiries: {{inquiries}}{{/if}}\n{{#if feedback}}Feedback received.{{/if}}\nEnd"
  assert.deepEqual(extractTemplateTokens(body), ["inquiries", "feedback"])
  assert.equal(
    renderTemplateWithMapping(body, { inquiries: "inquiries", feedback: "feedback" }, {
      inquiries: "0", feedback: ""
    }),
    "Stats:\nInquiries: 0\nEnd"
  )
})

test("conditional sentences also support inline content and multiline CSV feedback", () => {
  const body = "Summary: {{#if feedback}}Tenant said: {{feedback}}{{/if}}"
  const mapping = { feedback: "feedback" }
  assert.equal(
    renderTemplateWithMapping(body, mapping, { feedback: "Liked the view.\nAsked about repairs." }),
    "Summary: Tenant said: Liked the view.\nAsked about repairs."
  )
  assert.equal(renderTemplateWithMapping(body, mapping, { feedback: "" }), "Summary: ")
})
