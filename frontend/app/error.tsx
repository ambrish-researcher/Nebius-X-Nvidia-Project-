"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <span className="eyebrow">LAB RECOVERY</span>
      <h1>The workspace encountered an error.</h1>
      <p>Your saved projects remain in browser storage.</p>
      <button className="button button-primary" onClick={reset}>
        Reopen the lab
      </button>
    </main>
  );
}
