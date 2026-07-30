type Section1SectionProps = {
  onAddLeadClick: () => void
  onSearchChange: (value: string) => void
  searchTerm: string
}

export function Section1Section({}: Section1SectionProps) {
  return (
    <section className="bg-[var(--ether-surface)] px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
      <div className="mx-auto max-w-[1600px]">
        <h1 className="ether-display-lg text-[var(--ether-on-surface)]">Lead Pipeline Board</h1>
        <p className="mt-2 text-base text-[var(--ether-on-surface-variant)]">
          Track every buyer and seller from first touch to signed deal.
        </p>
      </div>
    </section>
  )
}
