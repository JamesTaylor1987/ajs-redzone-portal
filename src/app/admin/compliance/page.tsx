export const dynamic = "force-dynamic";

export default function CompliancePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-ajs-dark">Compliance</h1>
        <p className="text-sm text-ajs-muted mt-1">Plug-and-play compliance modules for your Redzone-connected lines.</p>
      </div>

      <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
        <div className="bg-gradient-to-r from-ajs-dark to-ajs-primary px-6 py-8 text-white text-center">
          <div className="text-4xl mb-3">🔜</div>
          <h2 className="text-2xl font-extrabold tracking-tight">Coming Soon</h2>
          <p className="mt-2 text-white/80 text-sm max-w-md mx-auto">
            Plug-and-play modules designed and built to connect your checkweigher data to Redzone.
          </p>
        </div>
        <div className="px-6 py-6 space-y-4">
          <p className="text-sm text-ajs-text leading-relaxed">
            The compliance module will give you a direct bridge between your checkweigher line data and
            the Redzone platform — making it simple to capture, store and report on weight compliance
            without manual data entry.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: "Checkweigher integration", desc: "Direct data feed from your existing equipment" },
              { title: "Automated reporting", desc: "Compliance reports generated automatically" },
              { title: "Redzone connected", desc: "Live data flowing into your Redzone dashboard" },
            ].map((f) => (
              <div key={f.title} className="bg-slate-50 rounded-lg p-4 border border-ajs-light">
                <p className="text-xs font-bold text-ajs-dark mb-1">{f.title}</p>
                <p className="text-xs text-ajs-muted">{f.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-ajs-muted">
            Contact the AJS team for availability and pricing.
          </p>
        </div>
      </div>
    </div>
  );
}
