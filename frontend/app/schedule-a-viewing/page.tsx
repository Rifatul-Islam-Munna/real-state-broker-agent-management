import { ScheduleAViewingPage } from "@/components/stitch/pages/schedule-a-viewing/page"
import { scheduleAViewingPageMeta } from "@/static-data/pages/schedule-a-viewing/meta"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(scheduleAViewingPageMeta)

export default function Page() {
  return <ScheduleAViewingPage />
}
