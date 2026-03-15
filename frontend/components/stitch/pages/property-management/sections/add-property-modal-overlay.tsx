type AddPropertyModalOverlaySectionProps = {
  onClose: () => void
}

export function AddPropertyModalOverlaySection({
  onClose,
}: AddPropertyModalOverlaySectionProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-full max-h-[90vh] rounded-2xl overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {"Add New Property"}
            </h3>
            <p className="text-slate-500 text-sm">
              {"Fill in the details to list a new property on the market."}
            </p>
          </div>
          <button
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-3xl">
              {"close"}
            </span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <form className="space-y-10">
            <section>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {"info"}
                </span>
                {" Basic Information "}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {"Property Type"}
                  </label>
                  <select className="form-select rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary">
                    <option>
                      {"Select Type"}
                    </option>
                    <option>
                      {"Single Family Home"}
                    </option>
                    <option>
                      {"Apartment"}
                    </option>
                    <option>
                      {"Condo"}
                    </option>
                    <option>
                      {"Commercial"}
                    </option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {"Listing Price (USD)"}
                  </label>
                  <input
                    className="form-input rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary"
                    placeholder="e.g. 500000"
                    type="number"
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {"Street Address"}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-2.5 text-slate-400">
                      {"location_on"}
                    </span>
                    <input
                      className="form-input w-full pl-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary"
                      placeholder="Start typing address for autocomplete..."
                      type="text"
                    />
                  </div>
                </div>
              </div>
            </section>
            <section>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {"straighten"}
                </span>
                {" Specifications & Layout "}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {"Bedrooms"}
                  </label>
                  <input
                    className="form-input rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary"
                    type="number"
                    defaultValue="0"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {"Bathrooms"}
                  </label>
                  <input
                    className="form-input rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary"
                    type="number"
                    defaultValue="0"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {"Sq Ft"}
                  </label>
                  <input
                    className="form-input rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary"
                    placeholder="0"
                    type="number"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {"Year Built"}
                  </label>
                  <input
                    className="form-input rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary"
                    placeholder="2024"
                    type="number"
                  />
                </div>
              </div>
            </section>
            <section>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {"description"}
                </span>
                {" Property Description "}
              </h4>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden">
                <div className="flex gap-2 p-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <button
                    className="p-1 hover:bg-slate-100 rounded"
                    type="button"
                  >
                    <span className="material-symbols-outlined">
                      {"format_bold"}
                    </span>
                  </button>
                  <button
                    className="p-1 hover:bg-slate-100 rounded"
                    type="button"
                  >
                    <span className="material-symbols-outlined">
                      {"format_italic"}
                    </span>
                  </button>
                  <button
                    className="p-1 hover:bg-slate-100 rounded"
                    type="button"
                  >
                    <span className="material-symbols-outlined">
                      {"format_list_bulleted"}
                    </span>
                  </button>
                  <button
                    className="p-1 hover:bg-slate-100 rounded"
                    type="button"
                  >
                    <span className="material-symbols-outlined">
                      {"link"}
                    </span>
                  </button>
                </div>
                <textarea
                  className="form-textarea w-full border-none bg-transparent h-32 focus:ring-0 p-4"
                  placeholder="Write a compelling description of the property..."
                >

                </textarea>
              </div>
            </section>
            <section>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {"checklist"}
                </span>
                {" Amenities "}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary"
                    type="checkbox"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                    {"Swimming Pool"}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary"
                    type="checkbox"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                    {"Gym / Fitness Center"}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary"
                    type="checkbox"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                    {"Central Cooling"}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary"
                    type="checkbox"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                    {"Smart Home"}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary"
                    type="checkbox"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                    {"Garage"}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary"
                    type="checkbox"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                    {"Garden"}
                  </span>
                </label>
              </div>
            </section>
            <section>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {"upload_file"}
                </span>
                {" Media & Documents "}
              </h4>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 hover:border-primary transition-colors cursor-pointer group">
                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-4xl">
                    {"cloud_upload"}
                  </span>
                </div>
                <p className="text-slate-900 dark:text-white font-bold text-lg text-center">
                  {"Click to upload or drag and drop"}
                </p>
                <p className="text-slate-500 text-sm text-center">
                  {"Photos, floor plans, and legal documents (PDF, JPG, PNG)"}
                </p>
              </div>
            </section>
            <section>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {"search_check"}
                </span>
                {" SEO & Marketing "}
              </h4>
              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {"Meta Title"}
                  </label>
                  <input
                    className="form-input rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary"
                    placeholder="Enter SEO optimized title"
                    type="text"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {"Keywords (Comma separated)"}
                  </label>
                  <input
                    className="form-input rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary"
                    placeholder="luxury house, beverly hills, pool..."
                    type="text"
                  />
                </div>
              </div>
            </section>
          </form>
        </div>
        <div className="px-8 py-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-4">
          <button
            className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            onClick={onClose}
            type="button"
          >
            {" Cancel "}
          </button>
          <button
            className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
            onClick={onClose}
            type="button"
          >
            {" Create Property Listing "}
          </button>
        </div>
      </div>
    </div>
  )
}
