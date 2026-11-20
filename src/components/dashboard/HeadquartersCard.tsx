import { ArrowRight, Landmark } from "lucide-react";
import { Link } from "react-router";
import { useBrand } from "../../config/useBrand";
import { useBankData } from "../../data/bankData";
import { useConfig } from "../../store/settingsStore";

export default function HeadquartersCard() {
  const { headquarters } = useBankData();
  const { hqImageUrl } = useBrand();
  const { modules } = useConfig();

  return (
    <Link
      to="/headquarters"
      aria-label="Open Headquarters Overview"
      className="group relative flex min-h-[150px] items-center overflow-hidden rounded-xl border border-line bg-brand-bright text-white"
    >
      {hqImageUrl ? (
        <img
          src={hqImageUrl}
          alt=""
          className="absolute inset-y-0 right-0 h-full w-[64%] object-cover object-[50%_30%] transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <Landmark
          className="absolute -right-4 -bottom-6 size-44 text-white/15 transition-transform duration-500 group-hover:scale-[1.04]"
          strokeWidth={1}
          aria-hidden="true"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-bright from-36% via-brand-bright/70 via-48% to-transparent to-66%" />
      <div className="relative ml-6 border-l-2 border-white pl-5">
        <div className="text-[15.5px] tracking-wide uppercase">{modules.hqCard.label}</div>
        <div className="text-[26px] leading-tight font-bold">{headquarters.name}</div>
        <div className="text-[14.5px] text-white/90">{headquarters.location}</div>
      </div>
      <span className="absolute right-4 bottom-4 grid size-11 place-items-center rounded-full border border-white/70 bg-black/30 transition-colors group-hover:bg-brand group-hover:text-white">
        <ArrowRight className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
    </Link>
  );
}
