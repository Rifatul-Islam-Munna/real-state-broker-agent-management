"use client"

import Link from "next/link"

import { ShowingFeedbackAutomationPanel } from "@/components/stitch/pages/agency-settings/sections/showing-feedback-automation-panel"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ShowingFeedbackAutomationPage() {
  return (
    <main className="min-h-full bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <Card className="shadow-none">
          <CardHeader className="gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-2xl">
                Weekly owner feedback automation
              </CardTitle>
              <CardDescription className="mt-2 max-w-3xl leading-6">
                Configure the weekly delivery day, channels, primary report,
                follow-up templates, sentiment classification, and report limits
                without mixing automation controls into the feedback registry.
              </CardDescription>
            </div>
            <Button
              render={<Link href="/dashboard/showing-feedback" />}
              size="lg"
              variant="outline"
            >
              <AppIcon name="rate_review" />
              Open feedback registry
            </Button>
          </CardHeader>
        </Card>

        <ShowingFeedbackAutomationPanel />
      </div>
    </main>
  )
}
