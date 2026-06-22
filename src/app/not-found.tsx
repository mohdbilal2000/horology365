import Link from "next/link";

export default function NotFound() {
  return (
    <div className="band-light">
      <div className="shell flex min-h-[70vh] flex-col items-center justify-center gap-6 py-20 text-center">
        <span className="font-serif text-7xl text-gold sm:text-8xl">404</span>
        <h1 className="font-serif text-3xl sm:text-4xl">This page slipped a gear</h1>
        <p className="max-w-md text-ink-500">
          The page you’re looking for doesn’t exist or has moved. Let’s get you
          back to the showroom.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-gold">
            Back to home
          </Link>
          <Link
            href="/category/mens-watches"
            className="btn-outline border-ink/20"
          >
            Browse watches
          </Link>
        </div>
      </div>
    </div>
  );
}
