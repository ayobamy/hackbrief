export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">hackr</h1>
      <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        Which hackathons to join, and how to win them, without reading ten pages of rules for
        each one.
      </p>
      <p className="text-zinc-600 dark:text-zinc-400">
        Early work in progress. Follow it on{" "}
        <a
          className="font-medium text-zinc-950 underline underline-offset-4 dark:text-zinc-50"
          href="https://github.com/ayobamy/hackr"
        >
          GitHub
        </a>
        .
      </p>
    </main>
  );
}
