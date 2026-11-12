import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import {
  defaultTemplateSource,
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
  const rendered = renderTemplateWithMapping(
    "Week {{week}}: {{inquiries}} inquiries, {{feedback}}",
    { week: "week", inquiries: "inquiries", feedback: "feedback" },
    { week: "2", inquiries: "4", feedback: "Nice house" }
  )
  assert.equal(rendered, "Week 2: 4 inquiries, Nice house")
})
