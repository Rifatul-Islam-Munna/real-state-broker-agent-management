export function MainContentAreaSection() {
  return (
    <main className="flex-1 flex flex-col h-screen overflow-y-auto">
      <header className="h-16 border-b border-primary/10 bg-white dark:bg-slate-900 flex items-center justify-between px-8 sticky top-0 z-10">
        <h2 className="text-lg font-bold text-primary uppercase tracking-tight">
          {"Agent & Team Management"}
        </h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm">
              {"search"}
            </span>
            <input
              className="pl-10 pr-4 py-2 bg-background-light dark:bg-slate-800 border border-primary/10 text-sm focus:ring-0 focus:border-primary w-64"
              placeholder="Search agents or teams..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-3 border-l border-primary/10 pl-6">
            <button className="text-secondary hover:text-primary transition-colors">
              <span className="material-symbols-outlined">
                {"notifications"}
              </span>
            </button>
            <div className="w-8 h-8 bg-primary flex items-center justify-center text-white text-xs font-bold">
              {"AD"}
            </div>
          </div>
        </div>
      </header>
      <div className="p-8 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-primary/10 p-6">
            <p className="text-xs font-bold text-secondary uppercase mb-2">
              {"Total Agents"}
            </p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-primary">
                {"48"}
              </span>
              <span className="text-xs text-green-600 font-bold mb-1">
                {"+4 this month"}
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-primary/10 p-6">
            <p className="text-xs font-bold text-secondary uppercase mb-2">
              {"Active Teams"}
            </p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-primary">
                {"06"}
              </span>
              <span className="text-xs text-slate-400 font-bold mb-1">
                {"Steady"}
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-primary/10 p-6">
            <p className="text-xs font-bold text-secondary uppercase mb-2">
              {"Total Listings"}
            </p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-primary">
                {"1,240"}
              </span>
              <span className="text-xs text-green-600 font-bold mb-1">
                {"↑ 12%"}
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-primary/10 p-6">
            <p className="text-xs font-bold text-secondary uppercase mb-2">
              {"YTD Revenue"}
            </p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-primary">
                {"$4.2M"}
              </span>
              <span className="text-xs text-green-600 font-bold mb-1">
                {"↑ 8.5%"}
              </span>
            </div>
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest border-l-4 border-accent pl-3">
              {"Team Structure"}
            </h3>
            <button className="text-xs font-bold text-primary border border-primary px-4 py-2 hover:bg-primary/5 transition-colors">
              {" CREATE NEW TEAM "}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-primary/10">
              <div className="p-5 border-b border-primary/5 bg-primary/5">
                <h4 className="font-bold text-primary">
                  {"Alpha Elite Residential"}
                </h4>
                <p className="text-xs text-secondary mt-1">
                  {"Specialization: High-End Residential"}
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {"TEAM LEADER"}
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 bg-slate-200 rounded-full"
                      data-alt="Headshot of Sarah Jenkins"
                      style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAJ6BZEy_n3lnwH4ImDpBzjWrwnz2vOGpeP1RxPL3PA8ZbZarUxSs9I0aisKFcY-R74kfRFjEVITCTLLT9_n1X5xnSxJ0fpl-onWdI3qDz515wf7aHCTsyo0EfZkFN2DvcoRr4Xw8KAHi9At7LSeqMtXIT3rhMWkxzyyJtBBWG7iowWX2nc2nsd9k4gR0tiTMt5vnaJvrFOqraTvm23ZdW1ABXt28Y_nl8XRcuyJN6FcHMdnXVqGZbhoV1BGTrgFGomX6qZw7C3FLQ')", backgroundSize: "cover" }}
                    >

                    </div>
                    <span className="text-xs font-bold">
                      {"Sarah Jenkins"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {"MEMBERS"}
                  </span>
                  <span className="text-xs font-bold">
                    {"12 Active"}
                  </span>
                </div>
                <div className="pt-2">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 border-2 border-white dark:border-slate-900 bg-slate-300 rounded-full overflow-hidden">
                      <div
                        className="w-full h-full"
                        data-alt="Team member portrait"
                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDV0qBjfGceK8VGeMZ6A3sy-csWesfzQiud-4zGaxhMJpJlZo3kR5AL64lu97gdH9js0MGZPi_UiJotZfrP48kdbIWs8nv1d90lIB_1GaB5FvjogoFjGQIBeejkowZN6D_Uwr4HYZLmSPtyJ4Yzp4IGla1DsZB61iX_lYPP19_AeqcQDaPS-KZ83XKrMMzMUMWTN3t5nmH9pg-rduCiQlz-6JOrGnG3AV__60JFtDfhh56ZuvIIvi7aiiMNkCgaoyhO0reL27aua6g')", backgroundSize: "cover" }}
                      >

                      </div>
                    </div>
                    <div className="w-7 h-7 border-2 border-white dark:border-slate-900 bg-slate-300 rounded-full overflow-hidden">
                      <div
                        className="w-full h-full"
                        data-alt="Team member portrait"
                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBFnjzlnuezDbs2DYgprohGGMs5YO1M-mTd-hEMNcBygDWMcv962h28fKFuK6lRAaeJnnh2OQQS7sj61zi358WNp9DrXvU5x01TF_ABaDp8GW_pzdhSef0CQhY7gZPVW4ulfIAm55vH0XyPVYZkZPKCTBWS1ZTQ7gJeBNgRJhzsItt8bhhGyM4rJskBlYFO6Kxc5Ju0SUEKaGLsfgp0bBaXOmDAL-wrMGmHg-hO6kytIEViG4_FV8LROiSp0J8MbBQ3IyrVwfbyZQ8')", backgroundSize: "cover" }}
                      >

                      </div>
                    </div>
                    <div className="w-7 h-7 border-2 border-white dark:border-slate-900 bg-slate-300 rounded-full overflow-hidden">
                      <div
                        className="w-full h-full"
                        data-alt="Team member portrait"
                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC4sFTdeBlg0zmto4rm7i12oYwYRVaz4kDgyxIRIa5TxJLkoQPUNNSTMyEVoIeUwLocp7LkxWxMuV-9M6sbKDQe6QG6WwT7UuBf4LY8xMI_EEjn_i-tDoQwvYSouhcrDbPzsuza__5mVUYwtsWwmF9SoUWuMoZ0uWwFhiilvIsbacTaPTJcL-MtAzDt-LJZhXZYsLfuYptuGXd-s7y23p_HsDh5UdzyjB-hc0ZwtNWUaLHLsVtM-Vzl7trZYw5sOI4ON2XTpuvYcmY')", backgroundSize: "cover" }}
                      >

                      </div>
                    </div>
                    <div className="w-7 h-7 border-2 border-white dark:border-slate-900 bg-primary/20 flex items-center justify-center rounded-full text-[10px] font-bold text-primary">
                      {"+9"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-primary/10">
              <div className="p-5 border-b border-primary/5 bg-primary/5">
                <h4 className="font-bold text-primary">
                  {"Metro Commercial Group"}
                </h4>
                <p className="text-xs text-secondary mt-1">
                  {"Specialization: Office & Industrial"}
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {"TEAM LEADER"}
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 bg-slate-200 rounded-full"
                      data-alt="Headshot of Michael Ross"
                      style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBbzsEM7mDpmUatdEjLRnmafoSwPbMYSNmm7QY4QTGRPBtVcYOVRSPe7jjuyrm621fYpvi38Hw5X9aF_4bCjWJMSPwkzfvdOn6u-qyd-Ri18SGTLfVZwTdaEqjEI5i7-FI0sasj95Tl6JbiuHBDm6xXfAxcuAvP8sW9mDIkf-T8MYf__sE98YVH9b0IJc2q3EjZfG-KihQ6s5RrjAGJ_nBGehLxU8wnbN7ucCpIej2iKXc5N191r_JzbPpgcbYeWWukiuOU3TNF3SQ')", backgroundSize: "cover" }}
                    >

                    </div>
                    <span className="text-xs font-bold">
                      {"Michael Ross"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {"MEMBERS"}
                  </span>
                  <span className="text-xs font-bold">
                    {"5 Active"}
                  </span>
                </div>
                <div className="pt-2">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 border-2 border-white dark:border-slate-900 bg-slate-300 rounded-full overflow-hidden">
                      <div
                        className="w-full h-full"
                        data-alt="Team member portrait"
                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCGZljGVLYYMB5HI0T0Ict8zRZnoZAAMw14hjeQy_mk0-92WEMSbN1ux7v9VX86RzlHHC3ux241Ckk5nTm0hKLu5YWKfsAkZ694qCLm-Jum1ncx3-9pBRkEQWyV3BN6Qj3zF4ddAlLNhbdJglQFGxDKybORWaZF8_8I7ZnruWGhL5T8KjV2_CzaBomYfm-sYSlqE7ZTMNyuhWNF_VzxVGVch9rjj2_kE4_idLma_iGLyslJNF6wLBjS8nX3oK2SyblEWrnbSjtrqqY')", backgroundSize: "cover" }}
                      >

                      </div>
                    </div>
                    <div className="w-7 h-7 border-2 border-white dark:border-slate-900 bg-slate-300 rounded-full overflow-hidden">
                      <div
                        className="w-full h-full"
                        data-alt="Team member portrait"
                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBE0pZpz4XNC2zNNZ_wv10P05g7USj2rq3dDekfGkQRs5XObWkxUPwMDi_wQZbouUB44LMeAMt8RIjZXWmCyCY5986KY4ogrSCd__rSc3ul29zgtfNGpIVTqmQQreBn8A00QrsrmxzTvCxjHmNRh-Xc4lbJSxoCLhFQTzorxOrgqNhX4P6nsBQqjq3U1TF7AbggWq78T27PI8d08nKE3mR1nVauNfSvfrQdQbPlFutZGbW9JKwnYs9YjrbTVcRpGVhdr8E0yRadfxI')", backgroundSize: "cover" }}
                      >

                      </div>
                    </div>
                    <div className="w-7 h-7 border-2 border-white dark:border-slate-900 bg-primary/20 flex items-center justify-center rounded-full text-[10px] font-bold text-primary">
                      {"+3"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-primary/10">
              <div className="p-5 border-b border-primary/5 bg-primary/5">
                <h4 className="font-bold text-primary">
                  {"Luxury Coastal Team"}
                </h4>
                <p className="text-xs text-secondary mt-1">
                  {"Specialization: Waterfront Properties"}
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {"TEAM LEADER"}
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 bg-slate-200 rounded-full"
                      data-alt="Headshot of Rachel Zane"
                      style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAXZYBWlZbBnU5T0aXCUlIk0d4bEplaZaq0SwDmpJxe5vzScqRdD7HQR-2HRJNKUf3c155DrheEsNU4zGfmjTDvUWGfOTIDYMzLWNwN2FPkXZQl2x9RiIUQBP4Yp5Ch8kPvPpATrZ9Iptk3BEF6LK5zKxlZSJAMGxb3V-GleUK2SkcltDNy7gjrPk-6F8_TgLK-e6nvn57I4AyOKMR23LThGXz4zJhx56NaSMbeKaVFCojwFnhGkBn85L6-VmvvIBW295k69QLyrzY')", backgroundSize: "cover" }}
                    >

                    </div>
                    <span className="text-xs font-bold">
                      {"Rachel Zane"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {"MEMBERS"}
                  </span>
                  <span className="text-xs font-bold">
                    {"8 Active"}
                  </span>
                </div>
                <div className="pt-2">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 border-2 border-white dark:border-slate-900 bg-slate-300 rounded-full overflow-hidden">
                      <div
                        className="w-full h-full"
                        data-alt="Team member portrait"
                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCGNxuHIEYFBA0pWTlo-yJ61xfni8um9QCSuub55NQiCeY313A_EoARi0DooGriQNeCYEk_uq9XCmeNSqX0bIZHR6KLhUL5DwyYOSAXWc8aHCeX3VDjqiXST1w1tjkiPRv8LVqlZ_tWK5mocuIfUq37S-l8X5RMWx9fwSd5D97iwgvE_-i4KQkVRZ7D9CcQAHWOALIGA69-RCSfcmig8Lnnj_xMYTfM0U-jdL8glsJR-x3DyEIzLdRS73ZtIeaq3aPKyxsUc7e3uLQ')", backgroundSize: "cover" }}
                      >

                      </div>
                    </div>
                    <div className="w-7 h-7 border-2 border-white dark:border-slate-900 bg-primary/20 flex items-center justify-center rounded-full text-[10px] font-bold text-primary">
                      {"+7"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest border-l-4 border-accent pl-3">
              {"Agent Directory"}
            </h3>
            <div className="flex items-center gap-2">
              <select className="text-xs border border-primary/10 bg-white dark:bg-slate-900 py-1.5 px-3 focus:ring-0">
                <option>
                  {"All Specializations"}
                </option>
                <option>
                  {"Residential"}
                </option>
                <option>
                  {"Commercial"}
                </option>
              </select>
              <select className="text-xs border border-primary/10 bg-white dark:bg-slate-900 py-1.5 px-3 focus:ring-0">
                <option>
                  {"Sort by Revenue"}
                </option>
                <option>
                  {"Sort by Name"}
                </option>
                <option>
                  {"Sort by Listings"}
                </option>
              </select>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-primary/10 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary/5 text-primary">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider border-b border-primary/10">
                    {"Agent"}
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider border-b border-primary/10">
                    {"Role"}
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider border-b border-primary/10">
                    {"Specialization"}
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider border-b border-primary/10 text-center">
                    {"Listings"}
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider border-b border-primary/10 text-center">
                    {"Sales"}
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider border-b border-primary/10 text-right">
                    {"Revenue"}
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider border-b border-primary/10 text-right">
                    {"Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 border border-primary/10"
                        data-alt="Portrait of Sarah Jenkins"
                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBNFH8vrP82_lBsLpHcE4G6enySky2XSlgNJD87nduoPAEoX4fgWFeGj2F1xlmEbaQqllnRXsTbAcsLkRV9KtFpJbA8smUQzZvjqfzy93AUO51a-UZwxQr4eZJE4Fel3kISFp0wzw9C9LmS1V_susXDhkof_7ZvC4AfqHvQ7F4meZQWTR6nxXQulgYhwsUejFryIcWIU1xBWgNuNb50iNfQuucSolGfhBAcz338_sb3_QwfmVKyZQeexl0UAbe0_mVXJ6xYYasHZiM')", backgroundSize: "cover" }}
                      >

                      </div>
                      <div>
                        <p className="text-sm font-bold">
                          {"Sarah Jenkins"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {"sarah.j@eliterealty.com"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2 py-1 text-[10px] font-bold bg-primary text-white uppercase tracking-tighter">
                      {"Team Leader"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-semibold">
                      {"Residential"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="text-sm font-bold text-primary">
                      {"42"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="text-sm font-bold text-primary">
                      {"18"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-bold text-accent">
                      {"$840k"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-secondary hover:text-primary">
                      <span className="material-symbols-outlined text-sm">
                        {"edit"}
                      </span>
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 border border-primary/10"
                        data-alt="Portrait of Michael Ross"
                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB2Y31yeuyIUnbR01kAdd7Adsil-RjIqoHQEm__252nTjAgu_iumwMgV8krPtAFXyx99eqMPmIlgpBxiyModVA-jLuEsx8vwInaQ38xDo8sLaeUNYkYqYfgYbPYI9ntcNI4fZT4GWMSYt3l1dvML3pPTlP3K3byHwOkfI3-J_Gts1BG8cF-8Pj1PVowZR2GKyzE8d4NfhGPGlMPRxD6BrrPErh_c5QsIKzvW75weW-5JSqcD7caVSO2iGFhlizshcyB-903Zu3Si_g')", backgroundSize: "cover" }}
                      >

                      </div>
                      <div>
                        <p className="text-sm font-bold">
                          {"Michael Ross"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {"m.ross@eliterealty.com"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2 py-1 text-[10px] font-bold bg-primary text-white uppercase tracking-tighter">
                      {"Team Leader"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-semibold">
                      {"Commercial"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="text-sm font-bold text-primary">
                      {"15"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="text-sm font-bold text-primary">
                      {"7"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-bold text-accent">
                      {"$1.2M"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-secondary hover:text-primary">
                      <span className="material-symbols-outlined text-sm">
                        {"edit"}
                      </span>
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 border border-primary/10"
                        data-alt="Portrait of Rachel Zane"
                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCuUFq0H-22Wdp5LFwF5QkCNnNvj6A1xNQeGw6mi6LP1IRW6L-4g6I7IyfakKxdIhFOPgj-vVCbGhb28qxQBQKLng_M8VKFz8CivIHshsin2SDetiXoFTdisRiPPlH6XHU4x145S9Rh1UvBdXJiylDgRFgXb3QF3KzzeuhmjeGU-7nKtvHzSqZOsjA9ENPurSnX3NjCwiJ1DIa193o_QKSUIEvvIbNPouigO5xFwLnVeL_FFH32f382AayVynu1ncu2-rL4nRLS2Cg')", backgroundSize: "cover" }}
                      >

                      </div>
                      <div>
                        <p className="text-sm font-bold">
                          {"Rachel Zane"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {"r.zane@eliterealty.com"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2 py-1 text-[10px] font-bold border border-primary text-primary uppercase tracking-tighter">
                      {"Agent"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-semibold">
                      {"Residential"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="text-sm font-bold text-primary">
                      {"28"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="text-sm font-bold text-primary">
                      {"14"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-bold text-accent">
                      {"$610k"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-secondary hover:text-primary">
                      <span className="material-symbols-outlined text-sm">
                        {"edit"}
                      </span>
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 border border-primary/10"
                        data-alt="Portrait of Harvey Specter"
                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAAS6HfOhOppB9jysa-La9bye1zpl1o6GDGrQvlW8IpmpaJnU_MKAq_6UzJmhC2VBe8N2OKRMryKf7Pl38HVwMcWJfUNJxG9EQYjOz90mmXdEG1wwJwxlpj67nB2JvnJJC5Rpi1YMLxZSd2doah-qCI9mCQaDTgfT43u0hPG05asPu0erHay9u3P0NYo12zgxXXJLyio0wKtRJjEuVmsbd3qphD9d1Mtb5OhMCWExKITOLcKD8S8In_6kcLGAl70XQYQr5GUMJmDvY')", backgroundSize: "cover" }}
                      >

                      </div>
                      <div>
                        <p className="text-sm font-bold">
                          {"Harvey Specter"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {"h.specter@eliterealty.com"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2 py-1 text-[10px] font-bold bg-accent text-white uppercase tracking-tighter">
                      {"Admin"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-semibold">
                      {"Multi-Asset"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="text-sm font-bold text-primary">
                      {"54"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="text-sm font-bold text-primary">
                      {"22"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-bold text-accent">
                      {"$1.8M"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-secondary hover:text-primary">
                      <span className="material-symbols-outlined text-sm">
                        {"edit"}
                      </span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="p-4 border-t border-primary/10 flex items-center justify-between bg-primary/5">
              <p className="text-xs font-semibold text-slate-500 uppercase">
                {"Showing 1 to 4 of 48 Agents"}
              </p>
              <div className="flex gap-1">
                <button className="w-8 h-8 flex items-center justify-center border border-primary/10 bg-white text-primary text-xs font-bold">
                  {"1"}
                </button>
                <button className="w-8 h-8 flex items-center justify-center border border-primary/10 bg-white text-secondary text-xs font-bold hover:bg-primary/5">
                  {"2"}
                </button>
                <button className="w-8 h-8 flex items-center justify-center border border-primary/10 bg-white text-secondary text-xs font-bold hover:bg-primary/5">
                  {"3"}
                </button>
                <button className="w-8 h-8 flex items-center justify-center border border-primary/10 bg-white text-secondary text-xs font-bold hover:bg-primary/5">
                  <span className="material-symbols-outlined text-sm">
                    {"chevron_right"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>
        <section className="bg-primary/5 border border-primary/10 p-6 flex flex-wrap items-center justify-between gap-6">
          <div>
            <h4 className="text-[10px] font-bold text-primary uppercase mb-3">
              {"Roles Legend"}
            </h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-accent">

                </span>
                <span className="text-xs font-bold text-slate-700 uppercase">
                  {"Admin"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-primary">

                </span>
                <span className="text-xs font-bold text-slate-700 uppercase">
                  {"Team Leader"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border border-primary">

                </span>
                <span className="text-xs font-bold text-slate-700 uppercase">
                  {"Agent"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-slate-300">

                </span>
                <span className="text-xs font-bold text-slate-700 uppercase">
                  {"Viewer"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="text-[10px] font-bold text-primary px-4 py-2 border border-primary uppercase">
              {"Manage Role Permissions"}
            </button>
          </div>
        </section>
      </div>
      <footer className="p-8 mt-auto border-t border-primary/10 text-center">
        <p className="text-[10px] text-secondary font-bold uppercase tracking-[0.2em]">
          {" 2024 Elite Realty Group - Internal Management System"}
        </p>
      </footer>
    </main>
  )
}
