"use client"
import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const num=(v:string)=>Number(v.replace(/[^0-9.-]/g,""))||0
const money=(v:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v)
function Field({label,value,set}:{label:string;value:string;set:(v:string)=>void}){return <div className="space-y-2"><Label>{label}</Label><Input inputMode="decimal" value={value} onChange={e=>set(e.target.value)}/></div>}
function Result({label,value,strong=false}:{label:string;value:number;strong?:boolean}){return <div className={`flex justify-between rounded-xl border p-3 ${strong?"bg-primary text-primary-foreground":"bg-muted/35"}`}><span>{label}</span><b>{money(value)}</b></div>}
export default function CalculatorsPage(){
 const [price,setPrice]=useState("500000"),[rate,setRate]=useState("3"),[split,setSplit]=useState("20"),[expenses,setExpenses]=useState("1500"),[loan,setLoan]=useState("250000"),[closing,setClosing]=useState("2")
 const c=useMemo(()=>{const p=num(price),gross=p*num(rate)/100,broker=gross*num(split)/100,other=p*num(closing)/100;return{gross,broker,agent:gross-broker-num(expenses),other,seller:p-num(loan)-gross-other}},[price,rate,split,expenses,loan,closing])
 return <div className="space-y-6 p-4 md:p-6"><div><h1 className="text-3xl font-bold">Real-estate Calculators</h1><p className="text-muted-foreground">Fast estimates for agents and sellers.</p></div><div className="grid gap-4 lg:grid-cols-2">
 <Card><CardHeader><CardTitle>Commission calculator</CardTitle><CardDescription>Estimate gross commission, brokerage split, expenses, and agent net.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Sale price" value={price} set={setPrice}/><Field label="Commission rate (%)" value={rate} set={setRate}/><Field label="Brokerage split (%)" value={split} set={setSplit}/><Field label="Transaction expenses" value={expenses} set={setExpenses}/></div><Result label="Gross commission" value={c.gross}/><Result label="Brokerage share" value={c.broker}/><Result label="Estimated agent net" value={c.agent} strong/></CardContent></Card>
 <Card><CardHeader><CardTitle>Seller net sheet</CardTitle><CardDescription>Estimate proceeds before local taxes, prorations, repairs, or concessions.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Sale price" value={price} set={setPrice}/><Field label="Loan payoff" value={loan} set={setLoan}/><Field label="Commission rate (%)" value={rate} set={setRate}/><Field label="Other closing costs (%)" value={closing} set={setClosing}/></div><Result label="Commission" value={c.gross}/><Result label="Other closing costs" value={c.other}/><Result label="Estimated seller proceeds" value={c.seller} strong/></CardContent></Card>
 </div></div>
}
