export default function BugReportPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-8 pb-16">
      <div className="mb-10 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">Report a bug</h1>
        <p className="text-zinc-400">
          Found something off? Email the details and screenshots to
          support@realdealkickz.com.
        </p>
      </div>

      <a
        href="mailto:support@realdealkickz.com?subject=Bug%20report"
        className="inline-flex rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
      >
        Email support
      </a>
    </div>
  );
}
