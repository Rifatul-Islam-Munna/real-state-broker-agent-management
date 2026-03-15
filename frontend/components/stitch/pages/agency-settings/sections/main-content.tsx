
import { AppIcon } from "@/components/ui/app-icon"

export function MainContentSection() {
  return (
    <main className="flex-1 overflow-y-auto">
      <header className="h-16 border-b border-primary/10 flex items-center justify-between px-8 bg-white dark:bg-slate-900">
        <h2 className="text-lg font-bold text-primary">
          {"Settings"}
        </h2>
        <div className="flex items-center gap-4">
          <button className="text-primary/60 hover:text-primary transition-colors">
            <AppIcon name="notifications" />
          </button>
          <button className="bg-primary text-white px-4 py-1.5 rounded text-sm font-semibold no-shadow hover:bg-primary/90">
            {"Save Changes"}
          </button>
        </div>
      </header>
      <div className="p-8 max-w-6xl mx-auto space-y-12 pb-24">
        <section>
          <div className="flex items-center gap-2 mb-6 border-b border-primary/10 pb-2">
            <AppIcon className="text-accent" name="business" />
            <h3 className="text-xl font-bold uppercase tracking-tight text-neutral-base">
              {"Agency Profile"}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-primary/70 mb-1">
                  {"Agency Name"}
                </label>
                <input
                  className="w-full border-2 border-secondary/20 focus:border-primary outline-none px-3 py-2 bg-white"
                  type="text"
                  defaultValue="Skyline Real Estate Group"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-primary/70 mb-1">
                    {"Tax ID"}
                  </label>
                  <input
                    className="w-full border-2 border-secondary/20 focus:border-primary outline-none px-3 py-2 bg-white"
                    placeholder="XX-XXXXXXX"
                    type="text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-primary/70 mb-1">
                    {"Standard Commission (%)"}
                  </label>
                  <input
                    className="w-full border-2 border-secondary/20 focus:border-primary outline-none px-3 py-2 bg-white"
                    type="number"
                    defaultValue="3.0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-primary/70 mb-1">
                  {"Agency Logo"}
                </label>
                <div className="border-2 border-dashed border-secondary/30 p-6 flex flex-col items-center justify-center bg-white">
                  <AppIcon className="text-4xl text-secondary/40" name="upload_file" />
                  <p className="text-xs text-secondary mt-2">
                    {"Drag and drop or click to upload"}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-primary/70 mb-1">
                  {"Office Locations"}
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border-2 border-secondary/20 focus:border-primary outline-none px-3 py-2 bg-white"
                      type="text"
                      defaultValue="123 Main St, New York, NY"
                    />
                    <button className="p-2 text-red-500 hover:bg-red-50">
                      <AppIcon name="delete" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 border-2 border-secondary/20 focus:border-primary outline-none px-3 py-2 bg-white"
                      placeholder="Add another location..."
                      type="text"
                    />
                    <button className="bg-secondary text-white px-3 py-1 rounded-sm no-shadow">
                      <AppIcon className="text-sm" name="add" />
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-primary/70 mb-1">
                  {"Contact Email"}
                </label>
                <input
                  className="w-full border-2 border-secondary/20 focus:border-primary outline-none px-3 py-2 bg-white"
                  type="email"
                  defaultValue="contact@skyline-re.com"
                />
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="flex items-center gap-2 mb-6 border-b border-primary/10 pb-2">
            <AppIcon className="text-accent" name="mail" />
            <h3 className="text-xl font-bold uppercase tracking-tight text-neutral-base">
              {"Communication Templates"}
            </h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white border-2 border-secondary/10 p-4">
              <h4 className="text-sm font-bold border-b border-secondary/10 pb-2 mb-3">
                {"Available Templates"}
              </h4>
              <ul className="space-y-1">
                <li className="bg-primary/5 text-primary p-2 text-sm font-semibold rounded cursor-pointer">
                  {"New Lead Welcome"}
                </li>
                <li className="p-2 text-sm hover:bg-secondary/5 rounded cursor-pointer transition-colors">
                  {"Showing Confirmation"}
                </li>
                <li className="p-2 text-sm hover:bg-secondary/5 rounded cursor-pointer transition-colors">
                  {"Contract Executed"}
                </li>
                <li className="p-2 text-sm hover:bg-secondary/5 rounded cursor-pointer transition-colors">
                  {"Closing Reminder"}
                </li>
              </ul>
            </div>
            <div className="lg:col-span-2 space-y-4 bg-white border-2 border-secondary/10 p-6">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold uppercase text-primary">
                  {"Edit: New Lead Welcome"}
                </h4>
                <div className="flex gap-2">
                  <span className="bg-accent/10 text-accent text-[10px] font-bold px-2 py-1 uppercase rounded-full border border-accent/20">
                    {"Email"}
                  </span>
                  <span className="bg-secondary/10 text-secondary text-[10px] font-bold px-2 py-1 uppercase rounded-full border border-secondary/20">
                    {"SMS"}
                  </span>
                </div>
              </div>
              <input
                className="w-full border-2 border-secondary/20 focus:border-primary outline-none px-3 py-2 mb-4 font-bold"
                type="text"
                defaultValue="Welcome to Skyline Real Estate, {{client_name}}!"
              />
              <textarea
                className="w-full border-2 border-secondary/20 focus:border-primary outline-none px-3 py-2 resize-none"
                rows={6}
              >
                {"Hello {{client_name}}, Thank you for your interest in {{property_address}}. My name is {{agent_name}} and I'll be your primary point of contact. When is a good time for a quick call? Best regards, {{agency_name}}"}
              </textarea>
              <div className="flex gap-2 flex-wrap mt-4">
                <span className="text-[10px] bg-secondary/10 px-2 py-1 text-primary font-mono cursor-copy hover:bg-secondary/20">
                  {"{{client_name}}"}
                </span>
                <span className="text-[10px] bg-secondary/10 px-2 py-1 text-primary font-mono cursor-copy hover:bg-secondary/20">
                  {"{{property_address}}"}
                </span>
                <span className="text-[10px] bg-secondary/10 px-2 py-1 text-primary font-mono cursor-copy hover:bg-secondary/20">
                  {"{{agent_name}}"}
                </span>
                <span className="text-[10px] bg-secondary/10 px-2 py-1 text-primary font-mono cursor-copy hover:bg-secondary/20">
                  {"{{agency_name}}"}
                </span>
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="flex items-center gap-2 mb-6 border-b border-primary/10 pb-2">
            <AppIcon className="text-accent" name="hub" />
            <h3 className="text-xl font-bold uppercase tracking-tight text-neutral-base">
              {"Integrations"}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white border-2 border-secondary/10 p-5 flex flex-col items-center text-center">
              <div className="size-12 bg-primary/5 rounded flex items-center justify-center mb-3">
                <AppIcon className="text-primary text-3xl" name="database" />
              </div>
              <h4 className="font-bold text-sm">
                {"MLS Direct Connect"}
              </h4>
              <p className="text-xs text-primary/60 mt-1 mb-4">
                {"Live synchronization with regional MLS listings."}
              </p>
              <button className="w-full py-2 bg-primary text-white text-xs font-bold uppercase tracking-wide no-shadow">
                {"Connected"}
              </button>
            </div>
            <div className="bg-white border-2 border-secondary/10 p-5 flex flex-col items-center text-center">
              <div className="size-12 bg-accent/5 rounded flex items-center justify-center mb-3">
                <AppIcon className="text-accent text-3xl" name="sync" />
              </div>
              <h4 className="font-bold text-sm">
                {"Zillow Premier Sync"}
              </h4>
              <p className="text-xs text-primary/60 mt-1 mb-4">
                {"Pull leads directly from your Zillow profile."}
              </p>
              <button className="w-full py-2 bg-primary text-white text-xs font-bold uppercase tracking-wide no-shadow">
                {"Connected"}
              </button>
            </div>
            <div className="bg-white border-2 border-secondary/10 p-5 flex flex-col items-center text-center">
              <div className="size-12 bg-slate-100 rounded flex items-center justify-center mb-3">
                <AppIcon className="text-slate-500 text-3xl" name="mail" />
              </div>
              <h4 className="font-bold text-sm">
                {"SendGrid"}
              </h4>
              <p className="text-xs text-primary/60 mt-1 mb-4">
                {"Infrastructure for high-volume email delivery."}
              </p>
              <button className="w-full py-2 border-2 border-primary text-primary text-xs font-bold uppercase tracking-wide no-shadow hover:bg-primary/5">
                {"Configure"}
              </button>
            </div>
            <div className="bg-white border-2 border-secondary/10 p-5 flex flex-col items-center text-center">
              <div className="size-12 bg-red-50 rounded flex items-center justify-center mb-3">
                <AppIcon className="text-red-600 text-3xl" name="sms" />
              </div>
              <h4 className="font-bold text-sm">
                {"Twilio"}
              </h4>
              <p className="text-xs text-primary/60 mt-1 mb-4">
                {"Powers SMS automation and click-to-call."}
              </p>
              <button className="w-full py-2 border-2 border-primary text-primary text-xs font-bold uppercase tracking-wide no-shadow hover:bg-primary/5">
                {"Configure"}
              </button>
            </div>
            <div className="bg-white border-2 border-secondary/10 p-5 flex flex-col items-center text-center">
              <div className="size-12 bg-blue-50 rounded flex items-center justify-center mb-3">
                <AppIcon className="text-blue-700 text-3xl" name="payments" />
              </div>
              <h4 className="font-bold text-sm">
                {"Stripe Payments"}
              </h4>
              <p className="text-xs text-primary/60 mt-1 mb-4">
                {"Accept earnest money and application fees."}
              </p>
              <button className="w-full py-2 border-2 border-primary text-primary text-xs font-bold uppercase tracking-wide no-shadow hover:bg-primary/5">
                {"Configure"}
              </button>
            </div>
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between mb-6 border-b border-primary/10 pb-2">
            <div className="flex items-center gap-2">
              <AppIcon className="text-accent" name="group" />
              <h3 className="text-xl font-bold uppercase tracking-tight text-neutral-base">
                {"User Management"}
              </h3>
            </div>
            <button className="bg-accent text-white px-4 py-1.5 text-xs font-bold uppercase tracking-widest no-shadow hover:bg-accent/90 flex items-center gap-1">
              <AppIcon className="text-sm" name="person_add" />
              {" Add User "}
            </button>
          </div>
          <div className="bg-white border-2 border-secondary/10 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary/5 border-b-2 border-secondary/10">
                  <th className="px-6 py-4 text-xs font-bold uppercase text-primary/70">
                    {"Name"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-primary/70">
                    {"Email"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-primary/70">
                    {"Role"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-primary/70">
                    {"Status"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-primary/70 text-right">
                    {"Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary/5">
                <tr className="hover:bg-secondary/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-primary rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                        {"JD"}
                      </div>
                      <span className="text-sm font-semibold">
                        {"John Doe"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-primary/70">
                    {"john@skyline-re.com"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded-sm border border-primary/10">
                      {"Admin"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <span className="size-2 bg-green-500 rounded-full">

                      </span>
                      {" Active "}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary/40 hover:text-primary p-1">
                      <AppIcon className="text-lg" name="edit" />
                    </button>
                    <button className="text-primary/40 hover:text-red-500 p-1">
                      <AppIcon className="text-lg" name="delete" />
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-secondary/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-secondary rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                        {"AS"}
                      </div>
                      <span className="text-sm font-semibold">
                        {"Alice Smith"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-primary/70">
                    {"alice@skyline-re.com"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-[10px] font-bold uppercase rounded-sm border border-secondary/10">
                      {"Team Leader"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <span className="size-2 bg-green-500 rounded-full">

                      </span>
                      {" Active "}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary/40 hover:text-primary p-1">
                      <AppIcon className="text-lg" name="edit" />
                    </button>
                    <button className="text-primary/40 hover:text-red-500 p-1">
                      <AppIcon className="text-lg" name="delete" />
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-secondary/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 bg-accent rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                        {"MJ"}
                      </div>
                      <span className="text-sm font-semibold">
                        {"Mike Jones"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-primary/70">
                    {"mike@skyline-re.com"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-sm border border-slate-200">
                      {"Agent"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-xs text-orange-600 font-medium">
                      <span className="size-2 bg-orange-400 rounded-full">

                      </span>
                      {" Pending "}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary/40 hover:text-primary p-1">
                      <AppIcon className="text-lg" name="edit" />
                    </button>
                    <button className="text-primary/40 hover:text-red-500 p-1">
                      <AppIcon className="text-lg" name="delete" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
