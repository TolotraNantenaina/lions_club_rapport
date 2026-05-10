// ─── Sub-components ───────────────────────────────────────────────────────────

export function ProcessingLoader({ label = `Conversion du document…` }) {

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5 animate-fade-in-up">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-border" />
        <div className={`absolute inset-0 rounded-full border-4 border-t-black border-t-black border-r-transparent border-b-transparent border-l-transparent animate-spin`} />
        <div className="absolute inset-3 rounded-full bg-secondary flex items-center justify-center">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground mb-1 text-center">{label}</p>
        <p className="text-xs text-muted-foreground text-center">Cela peut prendre quelques secondes</p>
      </div>
      <div className="w-48 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full w-full animate-shimmer rounded-full" />
      </div>
    </div>
  );
}