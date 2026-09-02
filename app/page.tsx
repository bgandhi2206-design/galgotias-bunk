import { Icon } from "@/components/landing/Icon";
import { Navbar } from "@/components/landing/Navbar";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

const features = [
  ["01", "ATTENDANCE", "78.4%", "Current attendance"],
  ["02", "BUNK CALCULATOR", "1 class", "→ 76.9%"],
  ["03", "TIMETABLE", "", "Your week, sorted"],
  ["04", "PREDICTION", "Next Friday", "81.2%"],
] as const;

function MiniWeek() {
  return <div className="mini-week" aria-label="Miniature timetable"><span /><i /><i /><i /><i /></div>;
}

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? "/dashboard" : "/login");

  return <div className="site-shell" id="top"><Navbar /><main>
    <section className="hero"><div className="container"><div className="hero-heading"><div className="hero-copy"><div className="eyebrow">GB / ATTENDANCE</div><h1>Wanna skip?<br /><span>Check your attendance</span><br />first.</h1><p>See your timetable, attendance, and how many classes you can safely miss.</p><div className="hero-actions"><a className="button-primary" href="/dashboard">Check My Attendance <Icon name="arrow" size={15} /></a><a className="button-secondary" href="#how-it-works">See How It Works <Icon name="arrow" size={15} /></a></div></div><div className="hero-aside"><span>STATUS / ONLINE</span><strong>78.4%</strong><small>overall attendance</small></div></div><ProductPreview /></div></section>
    <section className="section feature-section" id="features"><div className="container"><div className="section-intro"><div><div className="section-label">ATTENDANCE, SORTED.</div><h2 className="section-title">Everything you need before you skip.</h2></div><p>Classes, numbers, and the answer to the only question that matters.</p></div><div className="feature-grid">{features.map(([number, title, value, detail], index) => <article className={`feature-card feature-${index + 1}`} key={title}><span className="feature-number">{number}</span><div className="feature-content"><h3>{title}</h3>{index === 2 ? <MiniWeek /> : <strong className="feature-value">{value}</strong>}<span className="feature-detail">{detail}</span></div></article>)}</div></div></section>
    <section className="section steps-section" id="how-it-works"><div className="container"><div className="section-label">HOW IT WORKS</div><h2 className="section-title">Three things. That&apos;s it.</h2><div className="steps"><div className="step"><span>01</span><h3>Add your courses</h3></div><div className="step"><span>02</span><h3>Add your timetable</h3></div><div className="step"><span>03</span><h3>Check before you skip</h3></div></div></div></section>
    <section className="section calculator-section"><div className="container calculator-layout"><div><div className="section-label">BUNK CALCULATOR</div><h2 className="section-title">Can I skip tomorrow?</h2><p className="calc-description">Check first. Regret later never.</p></div><div className="calc-card"><div className="calc-card-top"><span>DBMS / ATTENDANCE CHECK</span><span>75% TARGET</span></div><div className="calc-subject">DBMS</div><div className="calc-controls"><button aria-label="Remove one class" type="button">−</button><span>1 class</span><button aria-label="Add one class" type="button">+</button></div><div className="calc-values"><div className="calc-value"><span>CURRENT</span><strong>78.4%</strong></div><div className="calc-arrow">→</div><div className="calc-value"><span>AFTER SKIPPING</span><strong>76.9%</strong></div></div><div className="calc-result"><span>YES, YOU&apos;RE SAFE.</span><Icon name="spark" size={18} /></div><div className="muted calc-note">Your attendance stays above the 75% target.</div></div></div></section>
    <section className="final-cta" id="get-started"><div className="container"><h2>Before you bunk,<br /><span>check GB.</span></h2><a className="button-primary" href="/dashboard">Check My Attendance →</a></div></section>
  </main><footer className="footer"><div className="container"><div className="footer-row"><div><a className="brand" href="#top"><span className="brand-mark">GB</span>Galgotias Bunk</a><div className="footer-tagline">Know your attendance. Plan your bunks.</div></div><div className="footer-links"><a href="#features">Features</a><a href="#how-it-works">How It Works</a><a href="#">Privacy</a><a href="mailto:hello@galgotiasbunk.com">Contact</a></div></div><div className="footer-bottom"><span>© 2026 Galgotias Bunk</span></div></div></footer></div>;
}
