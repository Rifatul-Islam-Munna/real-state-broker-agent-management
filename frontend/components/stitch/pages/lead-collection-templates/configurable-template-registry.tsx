import Link from "next/link"

import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LeadCollectionTemplatesPage } from "./page"

export function ConfigurableTemplateRegistryPage() {
  return (
    <div>
      <div className="px-4 pt-4 md:px-6 md:pt-6">
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AppIcon name="link" />
                <h2 className="font-bold">Provider emails with contact details behind a link</h2>
              </div>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
                Create one template for Zillow or any other provider. Choose a real sample email,
                allow that provider&apos;s website, load its detail page, and map the name, phone,
                email, or property directly. Future matching emails run automatically.
              </p>
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                Public HTTPS detail links are supported. A page requiring a separate interactive
                login or browser challenge cannot be read by normal mailbox sync.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button render={<Link href="/dashboard/lead-collection-templates/new?preset=zillow" />}>
                <AppIcon name="home_work" />
                Create Zillow template
              </Button>
              <Button
                render={<Link href="/dashboard/lead-collection-templates/new" />}
                variant="outline"
              >
                <AppIcon name="add" />
                Other provider
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <LeadCollectionTemplatesPage />
    </div>
  )
}
