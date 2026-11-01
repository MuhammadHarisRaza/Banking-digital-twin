import { ArrowLeft, MapPin, type LucideIcon } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { APP_LINKS } from "../../config/appLinks";
import { getBranch } from "../../data/branches";
import type { AppLinkKey } from "../../types";

type Accent = "blue" | "green" | "gold";

const ACCENTS: Record<Accent, { glow: string; icon: string; rule: string }> = {
  blue: { glow: "from-[#17324f]", icon: "text-steel", rule: "border-steel/40" },
  green: { glow: "from-[#17463a]", icon: "text-ok", rule: "border-ok/40" },
  gold: { glow: "from-[#3b3120]", icon: "text-gold", rule: "border-gold/40" },
};

interface Props {
  appKey: AppLinkKey;
  envVar: string;
  title: string;
  tagline: string;
  icon: LucideIcon;
  accent: Accent;
  capabilities: string[];
}

/** Standalone landing screen shown until the real application is deployed. */
export default function AppLandingShell({ appKey, envVar, title, tagline, icon: Icon, accent, capabilities }: Props) {
  const [params] = useSearchParams();
  const branchId = params.get("branch");
  const branch = getBranch(branchId);
  const { glow, icon, rule } = ACCENTS[accent];
  const back = branch ? `/?branch=${branch.id}` : "/";

  return (
    <div className={`flex min-h-screen flex-col bg-gradient-to-b ${glow} to-page to-60%`}>
      <header className="flex h-[70px] shrink-0 items-center justify-between border-b border-white/10 px-4 sm:px-6 desk:px-11">
        <div className="flex items-center gap-3">
          <Icon className={`size-7 ${icon}`} strokeWidth={1.5} aria-hidden="true" />
          <span className="text-[23px] font-semibold tracking-tight">{title}</span>
        </div>
        <Link
          to={back}
          className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-1.5 text-[15.5px] transition-colors hover:bg-white/8"
        >
          <ArrowLeft className="size-4.5" aria-hidden="true" />
          <span className="max-sm:hidden">Back to Bank Operations</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className={`border-l-2 pl-6 ${rule}`}>
          <p className="text-[15.5px] tracking-[0.12em] text-soft uppercase">Placeholder application</p>
          <h1 className="mt-1 text-[42px] leading-tight font-bold tracking-tight sm:text-[52px]">{title}</h1>
          <p className="text-[20px] leading-snug text-soft">{tagline}</p>
        </div>

        {branch && (
          <div className="mt-8 flex items-center gap-3 text-[17px]">
            <MapPin className={`size-5 ${icon}`} strokeWidth={1.6} aria-hidden="true" />
            Opened for <span className="font-semibold">{branch.name}</span>
            <span className="text-mute">{branch.id}</span>
          </div>
        )}

        <ul className="mt-7 divide-y divide-white/10 border-y border-white/10">
          {capabilities.map((c) => (
            <li key={c} className="py-2.5 text-[17px] text-soft">
              {c}
            </li>
          ))}
        </ul>

        <p className="mt-7 text-[15.5px] leading-relaxed text-mute">
          {APP_LINKS[appKey].name} isn’t connected yet. Set <code className="text-soft">{envVar}</code> or update{" "}
          <code className="text-soft">src/config/appLinks.ts</code> to open the deployed application instead.
        </p>
      </main>
    </div>
  );
}
