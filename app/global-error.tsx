"use client";

export default function GlobalError({ error, reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Inter, Arial, sans-serif", background: "#f8f7ff", color: "#111936" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ width: "min(100%, 440px)", borderRadius: 24, background: "white", padding: 28, boxShadow: "0 20px 60px rgba(17,41,143,.12)" }}>
            <h1 style={{ margin: 0, fontSize: 24 }}>Daily Hisab could not finish loading</h1>
            <p style={{ color: "#59627a", lineHeight: 1.6 }}>Your account data is safe. Try loading again after the app recovers the older saved record.</p>
            <button type="button" onClick={reset} style={{ width: "100%", border: 0, borderRadius: 14, background: "#11298f", color: "white", padding: 14, fontWeight: 800 }}>Try again</button>
            <details style={{ marginTop: 16, fontSize: 12, color: "#69718a" }}><summary>Technical details</summary><p style={{ overflowWrap: "anywhere" }}>{error.message || "Unknown application error"}</p></details>
          </section>
        </main>
      </body>
    </html>
  );
}
