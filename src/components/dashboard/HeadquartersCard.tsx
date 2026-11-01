import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import hqImage from "../../assets/images/hq-tower.jpg";
import { HEADQUARTERS } from "../../data/headquarters";

export default function HeadquartersCard() {
  return (
    <Link
      to="/headquarters"
      aria-label="Open Headquarters Overview"
      className="group relative flex min-h-[150px] items-center overflow-hidden rounded-xl border border-line"
    >
      <img
        src={hqImage}
        alt=""
        className="absolute inset-0 size-full object-cover object-[50%_100%] transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#e0963f]/60 via-[#a8623a]/20 to-transparent mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b1d30] from-22% via-[#0b1d30]/80 via-46% to-transparent to-80%" />
      <div className="relative ml-6 border-l-2 border-gold pl-5">
        <div className="text-[15.5px] tracking-wide text-ink uppercase">Headquarters</div>
        <div className="text-[31px] leading-tight font-bold">{HEADQUARTERS.name}</div>
        <div className="text-[16.5px] text-soft">{HEADQUARTERS.location}</div>
      </div>
      <span className="absolute right-4 bottom-4 grid size-11 place-items-center rounded-full border border-white/70 bg-black/30 transition-colors group-hover:bg-gold group-hover:text-page">
        <ArrowRight className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
    </Link>
  );
}
