import { ScheduleAViewingPage } from "@/components/stitch/pages/schedule-a-viewing/page"
import { scheduleAViewingPageMeta } from "@/data/page-metadata/public"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(scheduleAViewingPageMeta)

export default function Page() {
  return <ScheduleAViewingPage />
}
