type IconName = "chart" | "calculator" | "trend" | "calendar" | "arrow" | "menu" | "spark";

const paths: Record<IconName, React.ReactNode> = {
  chart: <><path d="M4 19V5" /><path d="M4 19h17" /><path d="m7 15 3-4 3 2 5-7" /></>,
  calculator: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h8" /></>,
  trend: <><path d="M4 17 10 11l4 4 6-8" /><path d="M15 7h5v5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  spark: <><path d="m12 3 1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7L12 3Z" /></>,
};

export function Icon({ name, size = 17 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width={size}>{paths[name]}</svg>;
}