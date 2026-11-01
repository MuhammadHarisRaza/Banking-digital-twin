import { ArrowLeft, Bot, Building, Layers, MapPin, Users, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import hqImage from "../../assets/images/hq-tower.jpg";
import { DEPARTMENTS, BANK_TOTALS, HEADQUARTERS, HQ_ACTIVITY } from "../../data/headquarters";
import { formatNumber } from "../../lib/seeded";
import ActivityList from "../common/ActivityList";
import NetworkSnapshot from "./NetworkSnapshot";
import OperationalTrends from "./OperationalTrends";

const SECTION = "rounded-xl border border-line bg-panel p-5 sm:p-6";
const HEADING = "text-[21px] leading-tight font-semibold";

function Headline({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3.5 border-gold/50 sm:border-l sm:pl-6 sm:first:border-l-0 sm:first:pl-0">
      <Icon className="size-7 text-gold" strokeWidth={1.4} aria-hidden="true" />
      <div>
        <div className="text-[30px] leading-none font-semibold">{value}</div>
        <div className="mt-1 text-[15.5px] leading-none text-soft">{label}</div>
      </div>
    </div>
  );
}

function DepartmentOverview() {
  const largest = DEPARTMENTS[0].headcount;

  return (
    <section className={SECTION}>
      <h2 className={HEADING}>Department overview</h2>
      <p className="mt-0.5 text-[15px] text-soft">Headquarters headcount by department</p>
      <ul className="mt-4 space-y-3">
        {DEPARTMENTS.map((d) => (
          <li key={d.name}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="truncate text-[16px]">{d.name}</span>
              <span className="text-[16px] font-semibold tabular-nums">{formatNumber(d.headcount)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-r bg-line-soft">
              <div className="h-full rounded-r bg-gold" style={{ width: `${(d.headcount / largest) * 100}%` }} />
            </div>
            <div className="mt-1 truncate text-[14px] text-mute">
              {d.head} · {d.focus}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function HeadquartersOverview() {
  return (
    <main className="flex-1 pb-8">
      <section className="relative isolate overflow-hidden">
        <img src={hqImage} alt="Headquarters tower at dusk" className="absolute inset-0 -z-20 size-full object-cover object-[50%_70%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-page via-page/70 to-page/25" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-page/90 via-page/40 to-transparent" />

        <div className="px-4 pt-5 pb-7 sm:px-6 desk:px-11">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-page/50 px-4 py-1.5 text-[15.5px] transition-colors hover:border-gold hover:text-gold-bright"
          >
            <ArrowLeft className="size-4.5" aria-hidden="true" />
            Back to dashboard
          </Link>

          <div className="mt-16 sm:mt-24">
            <div className="text-[15.5px] tracking-[0.14em] text-gold uppercase">Headquarters Overview</div>
            <h1 className="mt-1 text-[46px] leading-none font-bold tracking-tight sm:text-[58px]">{HEADQUARTERS.name}</h1>
            <p className="mt-2 inline-flex items-center gap-2 text-[18px] text-soft">
              <MapPin className="size-4.5 text-gold" aria-hidden="true" />
              {HEADQUARTERS.location}
            </p>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-5 sm:flex sm:gap-6 desk:gap-8">
            <Headline icon={Users} label="Total staff" value={formatNumber(HEADQUARTERS.staff)} />
            <Headline icon={Building} label="Departments" value={String(DEPARTMENTS.length)} />
            <Headline icon={Layers} label="Applications" value={String(BANK_TOTALS.applications)} />
            <Headline icon={Bot} label="AI agents" value={String(BANK_TOTALS.agents)} />
          </div>
        </div>
      </section>

      <div className="grid gap-5 px-4 sm:px-6 desk:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] desk:px-11">
        <DepartmentOverview />
        <div className="flex min-w-0 flex-col gap-5">
          <section className={SECTION}>
            <OperationalTrends headingClass={HEADING} />
          </section>
          <section className={SECTION}>
            <NetworkSnapshot headingClass={HEADING} />
          </section>
        </div>
        <section className={`${SECTION} desk:col-span-2`}>
          <h2 className={HEADING}>Recent activity</h2>
          <div className="mt-2">
            <ActivityList events={HQ_ACTIVITY} />
          </div>
        </section>
      </div>

      <p className="mt-4 px-4 text-[13px] text-mute sm:px-6 desk:px-11">All headquarters and network figures are illustrative demo data. Network scale is modelled on a large Pakistani bank; the provincial split is an estimate.</p>
    </main>
  );
}
