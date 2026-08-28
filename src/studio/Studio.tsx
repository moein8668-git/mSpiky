import { studioChrome } from "../shell/shell";

export function Studio() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-3 px-8">
      <h1 className="text-2xl font-semibold tracking-tight">{studioChrome.heading}</h1>
      <p className="text-mute">{studioChrome.body}</p>
    </main>
  );
}
