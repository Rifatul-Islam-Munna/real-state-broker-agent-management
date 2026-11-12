import assert from "node:assert/strict"
import { test } from "node:test"

import {
  createOwnerDrafts,
  ownerContactIssue,
  ownerContactsFromProperty,
  serializeOwnerDrafts,
} from "./lib/owner-report-contacts.ts"

test("loads primary and all saved property owners for CSV and manual reports", () => {
  const property = {
    id: -15,
    title: "123 Garden Road",
    payload: {
      ownerName: "Primary",
      ownerEmail: "primary@example.com",
      ownerPhone: "+15550001001",
      owners: [
        { name: "Primary", email: "primary@example.com", phone: "+15550001001" },
        { name: "Second", email: "second@example.com", phone: "+15550001002" },
        { name: "Third", email: "third@example.com", phone: "+15550001003" },
      ],
    },
  }
  const owners = ownerContactsFromProperty(property)
  assert.equal(owners.length, 3)
  assert.deepEqual(owners.map((owner) => owner.name), ["Primary", "Second", "Third"])
  const drafts = createOwnerDrafts(owners)
  assert.equal(new Set(drafts.map((owner) => owner.id)).size, 3)
  assert.equal(ownerContactIssue(drafts, true, true), "")
  assert.equal(serializeOwnerDrafts(drafts).length, 3)
})

test("older properties with only primary owner values still work", () => {
  const owner = ownerContactsFromProperty({
    id: 13,
    title: "Legacy Property",
    payload: {
      ownerName: "Legacy Owner",
      ownerEmail: "legacy@example.com",
      ownerPhone: "",
    },
  })
  assert.equal(owner.length, 1)
  assert.equal(owner[0].email, "legacy@example.com")
  assert.equal(ownerContactIssue(createOwnerDrafts(owner), true, false), "")
})

test("every selected owner must have the contact method being sent", () => {
  const drafts = createOwnerDrafts([
    { name: "First", email: "first@example.com", phone: "+15550001001" },
    { name: "Second", email: "", phone: "+15550001002" },
  ])
  assert.match(ownerContactIssue(drafts, true, false), /Owner 2/)
  assert.equal(ownerContactIssue(drafts, false, true), "")
  drafts[1].phone = ""
  assert.match(ownerContactIssue(drafts, false, true), /Owner 2/)
})
