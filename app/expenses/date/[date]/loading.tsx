export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f8faff] px-4 py-20">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-8 w-56 rounded-lg bg-[#e8edf8]" />
        <div className="mt-3 h-4 w-40 rounded bg-[#edf1f8]" />
        <div className="mt-8 grid gap-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-24 rounded-2xl bg-white shadow-sm" />)}
        </div>
      </div>
    </main>
  );
}
