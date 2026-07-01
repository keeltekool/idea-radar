import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#faf9f7", color: "#1a1a1a", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold tracking-tighter mb-2" style={{ color: "#8B5CF6" }}>404</div>
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="mb-8 opacity-50">This page doesn&apos;t exist or has been moved.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold no-underline text-white transition-colors"
          style={{ background: "#8B5CF6" }}
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  )
}
