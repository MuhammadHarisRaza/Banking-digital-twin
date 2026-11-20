import { useBrand } from "../../config/useBrand";

export default function DashboardHeader() {
  const { dashboardTitle, shortName, country } = useBrand();
  return (
    <div>
      <h1 className="text-[34px] leading-tight font-bold tracking-tight sm:text-[42px]">{dashboardTitle}</h1>
      <p className="mt-1 text-[17px] leading-snug text-soft sm:text-[19px]">
        A connected view of {shortName}’s branches, people, applications, agents and operations across {country}.
      </p>
    </div>
  );
}
