import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { apiUrl } from "@/lib/api";

const publicNavLinks = [
  { to: "/", label: "home" },
  { to: "/ai-support", label: "ai support" },
  { to: "/about", label: "about" },
] as const;

const authNavLinks = [
  { to: "/", label: "home" },
  { to: "/dashboard", label: "dashboard" },
  { to: "/ai-support", label: "ai support" },
  { to: "/about", label: "about" },
] as const;

export function AppNavbar({ cta = "get started", ctaTo = "/login" }: { cta?: string; ctaTo?: string }) {
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userType, setUserType] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("stadie_park_token");
    setIsLoggedIn(!!token);
    if (!token) return;

    fetch(apiUrl("/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((user) => {
        if (!user) return;
        setUserEmail(user.email);
        setUserType(user.user_type);
      })
      .catch(() => undefined);
  }, []);

  const navLinks = isLoggedIn ? authNavLinks : [...publicNavLinks, { to: "/login", label: "log in" }];
  const initial = (userEmail.charAt(0) || "U").toUpperCase();

  return (
    <nav className="absolute top-0 left-0 right-0 z-20 px-4 md:px-10 pt-6 flex items-center justify-between gap-3">
      <Link to="/" className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-full pl-4 pr-5 py-3 border border-white/10">
        <Logo />
        <span className="text-white text-sm font-normal tracking-tight">stadie-park</span>
      </Link>

      <div className="hidden md:flex items-center gap-1 bg-white/10 backdrop-blur rounded-full px-3 py-2 border border-white/10">
        {navLinks.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="text-neutral-200 hover:text-white transition-colors text-sm px-4 py-2 rounded-full"
            activeOptions={{ exact: l.to === "/" }}
            activeProps={{ className: "text-white bg-white/15 transition-colors text-sm px-4 py-2 rounded-full" }}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="hidden md:block">
        {!isLoggedIn ? (
          <Link
            to="/register"
            className="bg-white text-black text-sm font-normal rounded-full px-6 py-3 hover:bg-neutral-200 transition-colors"
          >
            register
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              title={userType ? userType.replace("_", " ") : "profile"}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-black"
            >
              {initial}
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem("stadie_park_token");
                localStorage.removeItem("stadie_park_user_type");
                window.location.href = "/login";
              }}
              className="bg-white/10 text-white text-sm font-normal rounded-full px-5 py-3 border border-white/10 hover:bg-white/15 transition-colors"
            >
              logout
            </button>
          </div>
        )}
      </div>

      {/* Mobile toggle */}
      <button
        type="button"
        aria-label="toggle menu"
        onClick={() => setOpen((o) => !o)}
        className="md:hidden bg-white/10 backdrop-blur border border-white/10 rounded-full h-11 w-11 flex items-center justify-center text-white"
      >
        <span className="sr-only">menu</span>
        <div className="flex flex-col gap-1">
          <span className="block h-px w-5 bg-white" />
          <span className="block h-px w-5 bg-white" />
          <span className="block h-px w-5 bg-white" />
        </div>
      </button>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden absolute top-full mt-3 right-4 left-4 bg-neutral-900/95 backdrop-blur rounded-3xl border border-white/10 p-4 flex flex-col gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="text-neutral-200 hover:text-white text-sm px-4 py-3 rounded-2xl hover:bg-white/5"
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "text-white bg-white/10 text-sm px-4 py-3 rounded-2xl" }}
            >
              {l.label}
            </Link>
          ))}
          {isLoggedIn && (
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 text-neutral-200 hover:text-white text-sm px-4 py-3 rounded-2xl hover:bg-white/5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-black">
                {initial}
              </span>
              profile
            </Link>
          )}
          {isLoggedIn && (
            <button
              onClick={() => {
                localStorage.removeItem("stadie_park_token");
                localStorage.removeItem("stadie_park_user_type");
                window.location.href = "/login";
                setOpen(false);
              }}
              className="text-neutral-200 hover:text-white text-sm px-4 py-3 rounded-2xl hover:bg-white/5 text-left"
            >
              logout
            </button>
          )}
          {!isLoggedIn && (
            <Link
              to="/register"
              onClick={() => setOpen(false)}
              className="text-neutral-200 hover:text-white text-sm px-4 py-3 rounded-2xl hover:bg-white/5"
            >
              register
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
