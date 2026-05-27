import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-void p-6 text-center text-white">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-[0.2em] text-paper">Table Closed</h1>
        <p className="mt-3 text-white/60">That arcade route is not available.</p>
        <Link href="/" className="mt-6 inline-block border border-paper/50 px-4 py-2 text-paper">
          Return to lobby
        </Link>
      </div>
    </main>
  );
}
