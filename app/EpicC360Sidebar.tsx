type ActiveSection = "inbox" | "missed-calls" | "leads" | "customers" | "quote" | "call-recordings";

type Props = {
  active: ActiveSection;
  profileName: string;
  className: string;
  navClassName: string;
  activeClassName: string;
  footerClassName: string;
  canManage?: boolean;
};

const items: Array<{ key: ActiveSection; href: string; label: string }> = [
  { key: "inbox", href: "/inbox", label: "Inbox" },
  { key: "missed-calls", href: "/missed-calls", label: "Missed Calls" },
  { key: "leads", href: "/leads", label: "Abandoned Cart" },
  { key: "customers", href: "/customers", label: "C360" },
  { key: "quote", href: "/quote", label: "Quote Builder" },
  { key: "call-recordings", href: "/call-recordings", label: "Call Recordings" },
];

export default function EpicC360Sidebar({
  active,
  profileName,
  className,
  navClassName,
  activeClassName,
  footerClassName,
  canManage = false,
}: Props) {
  return (
    <aside className={className}>
      <div className="epicC360Brand">
        <img src="https://myepicreservation.com/epic-logo.png" alt="Epic 4X4 Adventures" />
        <div className="epicC360Product">EpicC360</div>
        <div className="epicC360Tagline">Every customer. One complete history.</div>
      </div>
      <nav className={navClassName}>
        {items.map((item) => (
          <a key={item.key} className={active === item.key ? activeClassName : undefined} href={item.href}>
            {item.label}
          </a>
        ))}
        {canManage ? <a href="/inbox/blocked-domains">Blocked Email Domains</a> : null}
      </nav>
      <div className={footerClassName}>
        <div>Signed in as</div>
        <strong>{profileName}</strong>
      </div>
    </aside>
  );
}
