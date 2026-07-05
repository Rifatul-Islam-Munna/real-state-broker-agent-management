import { NestPublicRequestForm } from "./nest-public-request-form"
import { PublicStatusPanel } from "./public-status-panel"

export function PublicRequestExperience({ token }: { token: string }) {
  return <>
    <div className="mx-auto max-w-3xl bg-muted/20 px-4 pt-4 md:px-8 md:pt-8">
      <PublicStatusPanel token={token} />
    </div>
    <NestPublicRequestForm token={token} />
  </>
}
