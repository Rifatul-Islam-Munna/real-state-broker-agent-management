
import { AppIcon } from "@/components/ui/app-icon"
import { Input } from "@/components/ui/input"

export function MainContentSection() {
  return (
    <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
      <header className="h-16 border-b border-primary/10 flex items-center justify-between px-8 bg-white dark:bg-background-dark/50">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-96">
            <AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" name="search" />
            <Input
              className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
              placeholder="Search files, folders or templates..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-secondary hover:bg-background-light rounded-full relative">
            <AppIcon name="notifications" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full">

            </span>
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-primary/10">
            <div className="text-right">
              <p className="text-xs font-bold">
                {"Alex Sterling"}
              </p>
              <p className="text-[10px] text-secondary">
                {"Senior Agent"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              {"AS"}
            </div>
          </div>
        </div>
      </header>
      <div className="p-8 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-primary">
              {"Document Repository"}
            </h2>
            <p className="text-secondary font-medium">
              {"Manage agency assets, client agreements, and e-signatures."}
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-white border-2 border-primary text-primary px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/5 transition-colors">
              <AppIcon className="text-lg" name="library_books" />
              {" Template Library "}
            </button>
            <button className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
              <AppIcon className="text-lg" name="upload_file" />
              {" Upload Document "}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-primary/10 hover:border-primary transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                <AppIcon className="text-3xl" name="folder_shared" />
              </div>
              <span className="text-xs font-bold text-secondary bg-background-light px-2 py-1 rounded">
                {"Admin Only"}
              </span>
            </div>
            <h3 className="font-bold text-lg mb-1">
              {"Contracts"}
            </h3>
            <p className="text-sm text-secondary mb-4">
              {"42 active files Ãƒâ€šÃ‚Â· 1.2GB"}
            </p>
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full border-2 border-white bg-accent text-[8px] flex items-center justify-center text-white">
                {"JD"}
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-white bg-primary text-[8px] flex items-center justify-center text-white">
                {"MK"}
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-white bg-secondary text-[8px] flex items-center justify-center text-white">
                {"+3"}
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-primary/10 hover:border-primary transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                <AppIcon className="text-3xl" name="architecture" />
              </div>
              <span className="text-xs font-bold text-secondary bg-background-light px-2 py-1 rounded">
                {"Agent Access"}
              </span>
            </div>
            <h3 className="font-bold text-lg mb-1">
              {"Floor Plans"}
            </h3>
            <p className="text-sm text-secondary mb-4">
              {"128 files Ãƒâ€šÃ‚Â· 3.4GB"}
            </p>
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-400 text-[8px] flex items-center justify-center text-white">
                <AppIcon className="text-xs" name="person" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-primary/10 hover:border-primary transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                <AppIcon className="text-3xl" name="history_edu" />
              </div>
              <span className="text-xs font-bold text-secondary bg-background-light px-2 py-1 rounded">
                {"Public"}
              </span>
            </div>
            <h3 className="font-bold text-lg mb-1">
              {"Agreements"}
            </h3>
            <p className="text-sm text-secondary mb-4">
              {"86 files Ãƒâ€šÃ‚Â· 450MB"}
            </p>
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full border-2 border-white bg-primary text-[8px] flex items-center justify-center text-white">
                {"AS"}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-primary/10 overflow-hidden">
            <div className="p-6 border-b border-primary/5 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <AppIcon className="text-accent" name="draw" />
                {" E-Signature Status Tracker "}
              </h3>
              <button className="text-primary text-sm font-bold hover:underline">
                {"View All"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-background-light dark:bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold uppercase text-secondary">
                      {"Document Name"}
                    </th>
                    <th className="px-6 py-3 text-xs font-bold uppercase text-secondary">
                      {"Recipient"}
                    </th>
                    <th className="px-6 py-3 text-xs font-bold uppercase text-secondary">
                      {"Status"}
                    </th>
                    <th className="px-6 py-3 text-xs font-bold uppercase text-secondary">
                      {"Last Activity"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  <tr>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <AppIcon className="text-primary" name="picture_as_pdf" />
                        <span className="text-sm font-medium">
                          {"Rental_Agreement_V4.pdf"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {"Sarah Jenkins"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-[10px] font-bold uppercase bg-yellow-100 text-yellow-700 rounded">
                        {"Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-secondary">
                      {"Sent 2h ago"}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <AppIcon className="text-primary" name="picture_as_pdf" />
                        <span className="text-sm font-medium">
                          {"Sales_Commission_Form.pdf"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {"Brokerage Admin"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-[10px] font-bold uppercase bg-green-100 text-green-700 rounded">
                        {"Signed"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-secondary">
                      {"Signed 1d ago"}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <AppIcon className="text-primary" name="picture_as_pdf" />
                        <span className="text-sm font-medium">
                          {"Listing_Exclusivity.pdf"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {"Mark Thompson"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-[10px] font-bold uppercase bg-red-100 text-red-700 rounded">
                        {"Expired"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-secondary">
                      {"Expired 3d ago"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-primary/5 dark:bg-slate-800 border-2 border-dashed border-primary/30 rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
              <AppIcon className="text-3xl text-primary" name="cloud_upload" />
            </div>
            <h4 className="font-bold text-lg mb-2">
              {"Upload Files"}
            </h4>
            <p className="text-sm text-secondary mb-6">
              {"Drag and drop documents here or click to browse files from your computer."}
            </p>
            <button className="bg-primary text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors">
              {"Select Files"}
            </button>
            <p className="text-[10px] text-secondary mt-4">
              {"Supported formats: PDF, DOCX, JPG, PNG (Max 50MB)"}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-primary/10 overflow-hidden">
          <div className="p-6 border-b border-primary/5 flex justify-between items-center">
            <h3 className="font-bold text-lg">
              {"Recent Documents"}
            </h3>
            <div className="flex gap-2">
              <button className="p-2 border border-primary/10 rounded-lg text-secondary">
                <AppIcon name="filter_list" />
              </button>
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-background-light dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-xs font-bold uppercase text-secondary">
                  {"Name"}
                </th>
                <th className="px-6 py-3 text-xs font-bold uppercase text-secondary">
                  {"Version"}
                </th>
                <th className="px-6 py-3 text-xs font-bold uppercase text-secondary">
                  {"Access"}
                </th>
                <th className="px-6 py-3 text-xs font-bold uppercase text-secondary">
                  {"Last Modified"}
                </th>
                <th className="px-6 py-3 text-xs font-bold uppercase text-secondary text-right">
                  {"Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              <tr className="hover:bg-primary/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <AppIcon className="text-primary" name="article" />
                    <div>
                      <p className="text-sm font-bold">
                        {"Residential_Lease_Template.docx"}
                      </p>
                      <p className="text-[10px] text-secondary">
                        {"Templates / Leasing"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-secondary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {"v2.4.1"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-[10px] font-bold uppercase bg-slate-100 text-slate-600 rounded">
                    {"Agent"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-secondary">
                  {"Oct 24, 2023"}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="p-2 text-secondary hover:text-primary transition-colors"
                      title="Download"
                    >
                      <AppIcon className="text-lg" name="download" />
                    </button>
                    <button
                      className="p-2 text-secondary hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <AppIcon className="text-lg" name="edit" />
                    </button>
                    <button
                      className="p-2 text-secondary hover:text-primary transition-colors"
                      title="Share"
                    >
                      <AppIcon className="text-lg" name="share" />
                    </button>
                    <button
                      className="p-2 text-secondary hover:text-accent transition-colors"
                      title="Sign"
                    >
                      <AppIcon className="text-lg" name="signature" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-primary/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <AppIcon className="text-primary" name="description" />
                    <div>
                      <p className="text-sm font-bold">
                        {"Floorplan_Unit_405_B.pdf"}
                      </p>
                      <p className="text-[10px] text-secondary">
                        {"Properties / Azure Heights"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-secondary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {"v1.0.0"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-[10px] font-bold uppercase bg-slate-100 text-slate-600 rounded">
                    {"Client"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-secondary">
                  {"Oct 22, 2023"}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="p-2 text-secondary hover:text-primary transition-colors"
                      title="Download"
                    >
                      <AppIcon className="text-lg" name="download" />
                    </button>
                    <button
                      className="p-2 text-secondary hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <AppIcon className="text-lg" name="edit" />
                    </button>
                    <button
                      className="p-2 text-secondary hover:text-primary transition-colors"
                      title="Share"
                    >
                      <AppIcon className="text-lg" name="share" />
                    </button>
                    <button
                      className="p-2 text-secondary hover:text-accent transition-colors"
                      title="Sign"
                    >
                      <AppIcon className="text-lg" name="signature" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-primary/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <AppIcon className="text-primary" name="article" />
                    <div>
                      <p className="text-sm font-bold">
                        {"Confidentiality_Agreement_Global.pdf"}
                      </p>
                      <p className="text-[10px] text-secondary">
                        {"Agreements / Legal"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-secondary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {"v3.2.0"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-[10px] font-bold uppercase bg-red-50 text-red-700 rounded">
                    {"Admin Only"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-secondary">
                  {"Oct 15, 2023"}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="p-2 text-secondary hover:text-primary transition-colors"
                      title="Download"
                    >
                      <AppIcon className="text-lg" name="download" />
                    </button>
                    <button
                      className="p-2 text-secondary hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <AppIcon className="text-lg" name="edit" />
                    </button>
                    <button
                      className="p-2 text-secondary hover:text-primary transition-colors"
                      title="Share"
                    >
                      <AppIcon className="text-lg" name="share" />
                    </button>
                    <button
                      className="p-2 text-secondary hover:text-accent transition-colors"
                      title="Sign"
                    >
                      <AppIcon className="text-lg" name="signature" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="p-4 bg-background-light dark:bg-slate-900/30 flex items-center justify-between">
            <p className="text-xs text-secondary">
              {"Showing 1-3 of 256 documents"}
            </p>
            <div className="flex gap-1">
              <button className="w-8 h-8 rounded border border-primary/10 flex items-center justify-center text-primary bg-white">
                {"1"}
              </button>
              <button className="w-8 h-8 rounded border border-primary/10 flex items-center justify-center text-secondary hover:bg-white transition-colors">
                {"2"}
              </button>
              <button className="w-8 h-8 rounded border border-primary/10 flex items-center justify-center text-secondary hover:bg-white transition-colors">
                {"3"}
              </button>
              <button className="w-8 h-8 rounded border border-primary/10 flex items-center justify-center text-secondary hover:bg-white transition-colors">
                <AppIcon className="text-sm" name="chevron_right" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
