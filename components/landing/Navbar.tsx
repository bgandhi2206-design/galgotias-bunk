"use client";

import { useState } from "react";
import { Icon } from "./Icon";

export function Navbar() {
  const [open, setOpen] = useState(false);
  return <header className="nav-wrap"><nav aria-label="Main navigation" className="container nav">
    <a className="brand" href="#top" onClick={() => setOpen(false)}><span className="brand-mark">GB</span>Galgotias Bunk</a>
    <div className={`nav-links${open ? " open" : ""}`}>
      <a href="#features" onClick={() => setOpen(false)}>Features</a>
      <a href="#how-it-works" onClick={() => setOpen(false)}>How It Works</a>
      <a href="#preview" onClick={() => setOpen(false)}>Preview</a>
    </div>
    <a className="nav-cta" href="/dashboard">Get Started <Icon name="arrow" size={14} /></a>
    <button aria-expanded={open} aria-label="Toggle navigation" className="menu-button" onClick={() => setOpen(!open)} type="button"><Icon name="menu" size={21} /></button>
  </nav></header>;
}