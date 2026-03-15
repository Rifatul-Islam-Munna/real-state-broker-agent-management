/* eslint-disable @next/next/no-img-element */

import Link from "next/link"

export function MeetTheTeamSection() {
  return (
    <section className="py-20 bg-background-light">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16">
          <div>
            <span className="text-accent font-bold tracking-widest uppercase text-xs">
              {"Our Professionals"}
            </span>
            <h2 className="text-4xl font-black text-primary mt-2">
              {"Meet Our Expert Team"}
            </h2>
          </div>
          <Link
            className="mt-6 md:mt-0 px-8 py-3 border-2 border-primary text-primary font-bold uppercase text-xs hover:bg-primary hover:text-white transition-all"
            href="/agents"
          >
            {"View All Agents"}
          </Link>
        </div>
        <div className="grid md:grid-cols-4 gap-8">
          <div className="bg-white border border-slate-200">
            <img
              alt="Male Agent"
              className="w-full h-80 object-cover grayscale hover:grayscale-0 transition-all"
              data-alt="Professional male real estate agent in a suit"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7PCts2KbpN_YMj7ebDY3LIJLX_8iU4WUHfZJqBKEyU2BBUxSz_2jEzjg7OX821nKDecd359LiqHTe7MgVrZRUQnjefZs4DrjVDPeAczLj6CtffuKKlPv4S_aLQoh5Dy-vDkb_QGV35Kd_EnZK_nmg8j-YTjua2V43hYzMzFytME6HKpiH8wlVq8LSUpInMRpdscd1fQnlEhR-yTK-lPVhjX03ywuIhd08ta-6aPultVPp1YUnKz4YyqEXXCeOOYVgxDc95QTSxnI"
            />
            <div className="p-6 text-center">
              <h4 className="text-lg font-black text-primary uppercase">
                {"Marcus Sterling"}
              </h4>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                {"Founding Partner"}
              </p>
            </div>
          </div>
          <div className="bg-white border border-slate-200">
            <img
              alt="Female Agent"
              className="w-full h-80 object-cover grayscale hover:grayscale-0 transition-all"
              data-alt="Professional female real estate agent smiling"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGs5yHWrD9uy5U4rHbFibxVit9DX3zHjrfQoJ8DVzN5_Xq-3K65cOK4S48nBYsfJ7tN1gvLHgpW1-9BTQM6y8c6HaAr-t2Opu9F_PW6gLOKNarTEgczAUialpeiO582C0s3Yyr9-PRXHZipZk4MMLC2xlrCMxehNgcRucDETbNCCgY3UecXycGPAdaTJRTOHmfEGrdDlpTqF0ofxXNUjdXSouFTrKj7FVBl5HeZ3OnahUEzJtvphEKKt5Xd_EiTiswjf59WkKbVL8"
            />
            <div className="p-6 text-center">
              <h4 className="text-lg font-black text-primary uppercase">
                {"Elena Rodriguez"}
              </h4>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                {"Luxury Sales Director"}
              </p>
            </div>
          </div>
          <div className="bg-white border border-slate-200">
            <img
              alt="Male Agent"
              className="w-full h-80 object-cover grayscale hover:grayscale-0 transition-all"
              data-alt="Male real estate specialist standing confidently"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuADWqIMo0m2xY621m87CEtKPoZCwBxFjG9ZQIj4tmHFPccpCpu7ceQlY7UdGJ6lcAMsi3FHvBZZGCWGU6ShJOYvgUdH0bCVsYJnojuJ7ScUFd49AsRYYWFgyey90Don4_0P0_DLcpJtKqOq8Qrva1kM342hFCL_1RFfBqZW1Vdf52aKTcqOB-0eI3g1ugPmaUZU0Is8YFYjt1E_ZEq3vApUlL5MI_FrAEE_59Ig4YIj_aPTiSZelq4Bencp_GCbv0XDVcuAhWg7Zag"
            />
            <div className="p-6 text-center">
              <h4 className="text-lg font-black text-primary uppercase">
                {"David Chen"}
              </h4>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                {"Commercial Specialist"}
              </p>
            </div>
          </div>
          <div className="bg-white border border-slate-200">
            <img
              alt="Female Agent"
              className="w-full h-80 object-cover grayscale hover:grayscale-0 transition-all"
              data-alt="Experienced female real estate consultant"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBehni2i3Sc1sIU5eesgg_Q4jADYM051iBDlMxP9IwSCEBTV-eLpJVDUmq-L65ej8aRTPSBYkd3WwpX9JCErg0sSPndXyG71NNXCwdd432DkA5-9PvHxxtyL9uKRZ5M1PbQHaKquJK190uoNs6BorzEtyC3qNzhLNPSYZTatr_LVuZ6dCw2EawE6l7r5nf5L8wMucnYS9hk_tFCLGPY6n3ljv_XvFoV0f3REE4lzHkR0bawKL-nd2bk9kFetwQaWUiUCmblktX2TE0"
            />
            <div className="p-6 text-center">
              <h4 className="text-lg font-black text-primary uppercase">
                {"Sarah Jenkins"}
              </h4>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                {"Relocation Expert"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
