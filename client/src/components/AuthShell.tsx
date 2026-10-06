import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = { title: string; blurb: string; children: ReactNode };

export function AuthShell({ title, blurb, children }: Props) {
  return (
    <main className="grid min-h-dvh md:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col justify-between bg-field px-7 py-8 text-paper md:px-12 md:py-12">
        <Link to="/login" className="font-display text-xl tracking-tight">PostHarvest</Link>
        <div className="my-14 max-w-md md:my-0">
          <h1 className="font-display text-4xl leading-[1.05] font-medium md:text-5xl">{title}</h1>
          <p className="mt-5 text-lg text-paper/75">{blurb}</p>
        </div>
        <p className="font-mono text-sm text-paper/55">800 kg tomatoes → 500 kg matched → 300 kg left</p>
      </section>
      <section className="flex items-center px-7 py-10 md:px-14">
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </section>
    </main>
  );
}