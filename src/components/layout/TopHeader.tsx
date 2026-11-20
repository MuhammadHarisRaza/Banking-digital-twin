import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Building2, Camera, Landmark, MapPin, Menu, RotateCcw, Search, Settings, Users, X } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useBrand } from "../../config/useBrand";
import { useBankData } from "../../data/bankData";
import { useBranches } from "../../data/branches";
import { useConfig } from "../../store/settingsStore";
import { useAppLauncher } from "../../hooks/useAppLauncher";
import { useDismiss } from "../../hooks/useDismiss";
import type { Notification } from "../../types";

const ICON_BUTTON =
  "relative grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-brand/10";

function BranchSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { all } = useBranches();
  const { headquarters } = useBankData();

  const dismiss = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);
  const ref = useDismiss<HTMLDivElement>(open, dismiss);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const branches = all
      .filter((b) => `${b.name} ${b.city} ${b.province} ${b.id}`.toLowerCase().includes(q))
      .slice(0, 60)
      .map((b) => ({ id: b.id, name: b.name, meta: b.id, href: `/?branch=${b.id}` }));
    const hq = { id: "hq", name: headquarters.name, meta: "Headquarters", href: "/headquarters" };
    return `${headquarters.name} headquarters ${headquarters.location}`.toLowerCase().includes(q) ? [hq, ...branches] : branches;
  }, [query, all, headquarters]);

  useEffect(() => {
    document.getElementById(`search-result-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (href: string) => {
    navigate(href);
    dismiss();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      choose(results[active].href);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label="Search branches" aria-expanded={open} className={ICON_BUTTON} onClick={() => setOpen(!open)}>
        <Search className="size-6" strokeWidth={1.6} />
      </button>
      {open && (
        <div className="pop-enter absolute top-12 right-0 z-[1200] w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-ink/15 max-sm:-right-24">
          <div className="flex items-center gap-2.5 border-b border-line px-4">
            <Search className="size-4.5 text-mute" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search by branch, city, province or ID"
              aria-label="Search by branch, city, province or ID"
              className="h-12 w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-mute"
            />
            {query && (
              <button type="button" aria-label="Clear search" className="text-mute hover:text-ink" onClick={() => setQuery("")}>
                <X className="size-4" />
              </button>
            )}
          </div>
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-[15px] text-mute">No branches match “{query}”.</p>
          ) : (
            <ul className="thin-scroll max-h-[340px] overflow-y-auto py-1.5">
              {results.map((b, i) => (
                <li key={b.id}>
                  <button
                    id={`search-result-${i}`}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(b.href)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left ${i === active ? "bg-brand/10" : ""}`}
                  >
                    {b.id === "hq" ? (
                      <Landmark className="size-4 shrink-0 text-brand" strokeWidth={1.7} aria-hidden="true" />
                    ) : (
                      <MapPin className="size-4 shrink-0 text-brand" strokeWidth={1.7} aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-[15.5px]">{b.name}</span>
                    <span className="text-[14px] text-mute">{b.meta}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const dismiss = useCallback(() => setOpen(false), []);
  const ref = useDismiss<HTMLDivElement>(open, dismiss);
  const { notifications: NOTIFICATIONS } = useBankData();
  const unread = NOTIFICATIONS.filter((n) => !read.has(n.id)).length;

  const openItem = (n: Notification) => {
    setRead((prev) => new Set(prev).add(n.id));
    navigate(n.href ?? `/?branch=${n.branchId}`);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        className={ICON_BUTTON}
        onClick={() => setOpen(!open)}
      >
        <Bell className="size-6" strokeWidth={1.6} />
        {unread > 0 && <span className="absolute top-1 right-1 size-2.5 rounded-full bg-brand ring-2 ring-page" />}
      </button>
      {open && (
        <div className="pop-enter absolute top-12 right-0 z-[1200] w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-ink/15 max-sm:-right-12">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-[16px] font-semibold">Notifications</span>
            <button
              type="button"
              disabled={unread === 0}
              onClick={() => setRead(new Set(NOTIFICATIONS.map((n) => n.id)))}
              className="text-[14px] text-brand enabled:hover:text-brand-bright disabled:text-mute"
            >
              Mark all as read
            </button>
          </div>
          <ul>
            {NOTIFICATIONS.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className="flex w-full gap-3 border-b border-line-soft px-4 py-3 text-left transition-colors last:border-0 hover:bg-brand/10"
                >
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${read.has(n.id) ? "bg-transparent" : "bg-brand"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15.5px] leading-snug">{n.title}</span>
                    <span className="block text-[14px] leading-snug text-soft">{n.detail}</span>
                    <span className="mt-0.5 block text-[13px] text-mute">{n.time}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const navigate = useNavigate();
  const launch = useAppLauncher();
  const [open, setOpen] = useState(false);
  const dismiss = useCallback(() => setOpen(false), []);
  const ref = useDismiss<HTMLDivElement>(open, dismiss);
  const { user } = useConfig();

  const items = [
    { label: "Headquarters Overview", icon: Building2, run: () => navigate("/headquarters") },
    { label: "Open Digital Eye", icon: Camera, run: () => launch("digitalEye") },
    { label: "Open Customer 360", icon: Users, run: () => launch("customer360") },
    { label: "Settings", icon: Settings, run: () => navigate("/settings") },
    { label: "Reset dashboard view", icon: RotateCcw, run: () => navigate("/") },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Open profile menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="grid size-11 place-items-center rounded-full bg-brand text-[16px] font-semibold text-white transition-colors hover:bg-brand-bright"
      >
        {user.initials}
      </button>
      {open && (
        <div className="pop-enter absolute top-13 right-0 z-[1200] w-72 overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-ink/15">
          <div className="border-b border-line px-4 py-3">
            <div className="text-[16px] font-semibold">{user.name}</div>
            <div className="text-[14px] text-soft">{user.role}</div>
            <div className="mt-1 text-[13px] text-mute">Demo profile</div>
          </div>
          <ul className="py-1.5">
            {items.map(({ label, icon: Icon, run }) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => {
                    run();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-[15.5px] text-soft transition-colors hover:bg-brand/10 hover:text-ink"
                >
                  <Icon className="size-4.5 text-brand" strokeWidth={1.6} aria-hidden="true" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function TopHeader({ onMenu, menuOpen }: { onMenu?: () => void; menuOpen?: boolean }) {
  const brand = useBrand();
  return (
    <header className="sticky top-0 z-[1100] flex h-[70px] shrink-0 items-center justify-between border-b border-line bg-panel px-4 sm:px-6 desk:px-8">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        {onMenu && (
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={onMenu}
            className={`${ICON_BUTTON} -ml-1.5 shrink-0`}
          >
            <Menu className="size-6" strokeWidth={1.6} />
          </button>
        )}
        <Link to="/" aria-label={`${brand.shortName} ${brand.dashboardTitle} home`} className="flex min-w-0 items-center gap-2.5">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={`${brand.bankName}${brand.tagline ? `, ${brand.tagline}` : ""}`} className="h-[52px] w-auto max-w-[200px] object-contain" />
          ) : (
            <span className="truncate text-[22px] font-bold tracking-tight text-brand">{brand.shortName}</span>
          )}
        </Link>
        <span className="h-9 w-px shrink-0 bg-line max-sm:hidden" aria-hidden="true" />
        <span className="text-[20px] leading-none font-semibold tracking-tight text-soft max-sm:hidden">{brand.productName}</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <BranchSearch />
        <span className="h-8 w-px bg-line" aria-hidden="true" />
        <Notifications />
        <ProfileMenu />
      </div>
    </header>
  );
}
