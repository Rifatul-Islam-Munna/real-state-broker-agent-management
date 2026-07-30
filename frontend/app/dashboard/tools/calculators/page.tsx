"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Calculator, CircleDollarSign, Landmark, TrendingUp } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const num = (value: string) => Number(value.replace(/[^0-9.-]/g, "")) || 0
const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)

function Field({
  label,
  value,
  set,
  suffix,
}: {
  label: string
  value: string
  set: (value: string) => void
  suffix?: string
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-[0.05em] text-[#464555]">{label}</Label>
      <div className="relative">
        <Input
          className="h-12 rounded-xl border-[#c7c4d7] bg-[#f8f9ff] pr-12 text-sm shadow-none focus-visible:ring-[#4343d5]/20"
          inputMode="decimal"
          onChange={(event) => set(event.target.value)}
          value={value}
        />
        {suffix ? (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#767586]">{suffix}</span>
        ) : null}
      </div>
    </div>
  )
}

function Result({
  label,
  value,
  strong = false,
}: {
  label: string
  value: number
  strong?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
        strong
          ? "border-[#4343d5] bg-[#4343d5] text-white shadow-lg shadow-[#4343d5]/20"
          : "border-[#dce0e8] bg-[#f8f9ff]"
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      <b className="text-base">{money(value)}</b>
    </div>
  )
}

export default function CalculatorsPage() {
  const [price, setPrice] = useState("500000")
  const [rate, setRate] = useState("3")
  const [split, setSplit] = useState("20")
  const [expenses, setExpenses] = useState("1500")
  const [loan, setLoan] = useState("250000")
  const [closing, setClosing] = useState("2")

  const calculations = useMemo(() => {
    const salePrice = num(price)
    const gross = (salePrice * num(rate)) / 100
    const broker = (gross * num(split)) / 100
    const other = (salePrice * num(closing)) / 100
    return {
      gross,
      broker,
      agent: gross - broker - num(expenses),
      other,
      seller: salePrice - num(loan) - gross - other,
    }
  }, [price, rate, split, expenses, loan, closing])

  return (
    <main className="min-h-full bg-[#f8f9ff] px-4 py-6 text-[#0b1c30] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <header className="mb-10">
          <Link className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#4343d5]" href="/dashboard/tools">
            <ArrowLeft className="size-4" /> Back to Tools
          </Link>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#4343d5]">
                <Calculator className="size-4" /> Financial utilities
              </div>
              <h1 className="text-[36px] font-bold leading-tight tracking-[-0.03em]">Real-estate Calculators</h1>
              <p className="mt-2 text-[15px] text-[#464555]">Fast estimates for agents and sellers using live inputs.</p>
            </div>
            <div className="rounded-2xl border border-[#c7c4d7] bg-white px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#006b5f]">Live calculation</p>
              <p className="mt-1 text-sm text-[#464555]">Results update instantly as values change.</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="overflow-hidden rounded-[24px] border border-[#c7c4d7] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-3 border-b border-[#c7c4d7] bg-[#eff4ff] px-6 py-5">
              <span className="flex size-11 items-center justify-center rounded-xl bg-[#e1e0ff] text-[#4343d5]">
                <TrendingUp className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold">Commission calculator</h2>
                <p className="text-xs text-[#464555]">Gross commission, brokerage split, expenses, and agent net.</p>
              </div>
            </div>
            <div className="space-y-6 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sale price" set={setPrice} value={price} />
                <Field label="Commission rate" set={setRate} suffix="%" value={rate} />
                <Field label="Brokerage split" set={setSplit} suffix="%" value={split} />
                <Field label="Transaction expenses" set={setExpenses} value={expenses} />
              </div>
              <div className="space-y-3 border-t border-[#e5e7eb] pt-5">
                <Result label="Gross commission" value={calculations.gross} />
                <Result label="Brokerage share" value={calculations.broker} />
                <Result label="Estimated agent net" strong value={calculations.agent} />
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-[24px] border border-[#c7c4d7] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-3 border-b border-[#c7c4d7] bg-[#eff4ff] px-6 py-5">
              <span className="flex size-11 items-center justify-center rounded-xl bg-[#d9fff8] text-[#006b5f]">
                <Landmark className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold">Seller net sheet</h2>
                <p className="text-xs text-[#464555]">Estimated proceeds before taxes, repairs, prorations, or concessions.</p>
              </div>
            </div>
            <div className="space-y-6 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sale price" set={setPrice} value={price} />
                <Field label="Loan payoff" set={setLoan} value={loan} />
                <Field label="Commission rate" set={setRate} suffix="%" value={rate} />
                <Field label="Other closing costs" set={setClosing} suffix="%" value={closing} />
              </div>
              <div className="space-y-3 border-t border-[#e5e7eb] pt-5">
                <Result label="Commission" value={calculations.gross} />
                <Result label="Other closing costs" value={calculations.other} />
                <Result label="Estimated seller proceeds" strong value={calculations.seller} />
              </div>
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Metric label="Sale price" value={money(num(price))} />
          <Metric label="Estimated commission" value={money(calculations.gross)} />
          <Metric label="Projected seller proceeds" value={money(calculations.seller)} icon />
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value, icon = false }: { label: string; value: string; icon?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#c7c4d7] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#464555]">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-[-0.03em]">{value}</p>
        </div>
        {icon ? (
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#d9fff8] text-[#006b5f]">
            <CircleDollarSign className="size-5" />
          </span>
        ) : null}
      </div>
    </div>
  )
}
