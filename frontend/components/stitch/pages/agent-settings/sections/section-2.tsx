"use client"

import { useState } from "react"

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  agentSettingsAvailability,
  agentSettingsPreferences,
  agentSettingsProfile,
} from "@/static-data/pages/agent-settings/content"

type PreferenceId = (typeof agentSettingsPreferences)[number]["id"]

type AgentProfileDraft = {
  bio: string
  email: string
  focusArea: string
  fullName: string
  licenseId: string
  phone: string
}

const initialProfileDraft: AgentProfileDraft = {
  bio: agentSettingsProfile.bio,
  email: agentSettingsProfile.email,
  focusArea: agentSettingsProfile.focusArea,
  fullName: agentSettingsProfile.fullName,
  licenseId: agentSettingsProfile.licenseId,
  phone: agentSettingsProfile.phone,
}

const initialPreferenceDraft = agentSettingsPreferences.reduce(
  (current, preference) => {
    current[preference.id] = preference.enabled
    return current
  },
  {} as Record<PreferenceId, boolean>,
)

export function Section2Section() {
  const [profileDraft, setProfileDraft] = useState<AgentProfileDraft>(
    initialProfileDraft,
  )
  const [preferenceDraft, setPreferenceDraft] = useState<
    Record<PreferenceId, boolean>
  >(initialPreferenceDraft)

  return (
    <section className="flex-1 bg-background-light px-4 py-6 dark:bg-background-dark md:px-6">
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-white/10 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {"Agent Profile"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {"Basic details used across lead follow-up, listing pages, and internal communication."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:text-slate-300"
                onClick={() => {
                  setProfileDraft(initialProfileDraft)
                  setPreferenceDraft(initialPreferenceDraft)
                }}
                type="button"
              >
                {"Reset"}
              </button>
              <button
                className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
                type="button"
              >
                {"Save Changes"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              {"Full Name"}
              <Input
                className="rounded-none border-slate-200 dark:border-white/10"
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                value={profileDraft.fullName}
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              {"Email"}
              <Input
                className="rounded-none border-slate-200 dark:border-white/10"
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                value={profileDraft.email}
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              {"Phone"}
              <Input
                className="rounded-none border-slate-200 dark:border-white/10"
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                value={profileDraft.phone}
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              {"License ID"}
              <Input
                className="rounded-none border-slate-200 dark:border-white/10"
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    licenseId: event.target.value,
                  }))
                }
                value={profileDraft.licenseId}
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 md:col-span-2">
              {"Focus Area"}
              <Input
                className="rounded-none border-slate-200 dark:border-white/10"
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    focusArea: event.target.value,
                  }))
                }
                value={profileDraft.focusArea}
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 md:col-span-2">
              {"Bio"}
              <Textarea
                className="min-h-32 rounded-none border-slate-200 dark:border-white/10"
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    bio: event.target.value,
                  }))
                }
                value={profileDraft.bio}
              />
            </label>
          </div>
        </article>

        <div className="space-y-6">
          <article className="border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-5 dark:border-white/10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {"Alerts"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {"Choose the notifications this agent should receive."}
              </p>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-white/10">
              {agentSettingsPreferences.map((preference) => (
                <div
                  key={preference.id}
                  className="flex items-start justify-between gap-4 px-5 py-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary">
                      {preference.icon}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {preference.label}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {preference.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferenceDraft[preference.id]}
                    onCheckedChange={(checked) =>
                      setPreferenceDraft((current) => ({
                        ...current,
                        [preference.id]: checked,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </article>

          <article className="border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-5 dark:border-white/10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {"Basic Account Details"}
              </h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              {agentSettingsAvailability.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 dark:border-white/10"
                >
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {item.value}
                    </p>
                  </div>
                  {item.label === "Password" ? (
                    <button
                      className="border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:text-slate-300"
                      type="button"
                    >
                      {"Change"}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
