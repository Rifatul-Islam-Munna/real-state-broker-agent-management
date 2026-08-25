import test from "node:test"
import assert from "node:assert/strict"

import { formatKnowledgeProperty, priorityPreset } from "./chatbot-knowledge-targeting.ts"

test("formats a property with title, address and status", () => {
  assert.deepEqual(
    formatKnowledgeProperty({ id: 9, title: "Oak Street Home", status: "published", payload: { exactLocation: "12 Oak St" } }),
    { id: 9, title: "Oak Street Home", address: "12 Oak St", status: "Published", searchText: "oak street home 12 oak st published" }
  )
})

test("maps priority presets to safe numeric values", () => {
  assert.equal(priorityPreset("normal"), 50)
  assert.equal(priorityPreset("high"), 75)
  assert.equal(priorityPreset("highest"), 100)
})
