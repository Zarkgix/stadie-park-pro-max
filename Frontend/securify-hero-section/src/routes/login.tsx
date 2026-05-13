import { FormEvent, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { apiUrl } from "@/lib/api";

type UserType = "driver" | "admin" | "parking_marshal";

const userTypeOptions: { value: UserType; label: string }[] = [
  { value: "driver", label: "Driver" },
  { value: "admin", label: "Admin" },
  { value: "parking_marshal", label: "Parking Marshal" },
];

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "sign in — stadie-park" }] }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<UserType>("driver");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const params = new URLSearchParams();
    params.append("username", email);
    params.append("password", password);
    params.append("user_type", userType);

    try {
      const response = await fetch(apiUrl("/auth/token"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.detail || "Login failed. Check your email and password.");
        return;
      }

      const data = await response.json();
      localStorage.setItem("stadie_park_token", data.access_token);
      localStorage.setItem("stadie_park_user_type", data.user_type);
      setSuccess("Login successful. Redirecting...");
      await router.navigate({ to: "/dashboard" });
    } catch (err) {
      setError("Unable to reach backend. Make sure the server is running on port 8001.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-black flex items-center justify-center px-6 pt-32 pb-12">
      <AppNavbar cta="home" ctaTo="/" />
      <div className="w-full max-w-md bg-neutral-900/90 backdrop-blur rounded-3xl p-8 border border-white/10">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <Logo />
          <span className="text-white text-sm tracking-tight">stadie-park</span>
        </Link>

        <h1 className="hero-title text-white font-medium text-4xl mb-2 lowercase">welcome back</h1>
        <p className="text-white/60 text-sm mb-8">sign in to manage stadium traffic</p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs text-white/70 lowercase">account type</label>
            <select
              value={userType}
              onChange={(event) => setUserType(event.currentTarget.value as UserType)}
              className="mt-1 w-full bg-neutral-800 border border-white/10 rounded-full px-5 py-3 text-sm text-white focus:outline-none focus:border-white/40"
              required
            >
              {userTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-white/70 lowercase">email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              placeholder="you@example.com"
              className="mt-1 w-full bg-neutral-800 border border-white/10 rounded-full px-5 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
              required
            />
          </div>
          <div>
            <label className="text-xs text-white/70 lowercase">password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                placeholder="Password"
                className="w-full bg-neutral-800 border border-white/10 rounded-full px-5 py-3 pr-12 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-white text-black text-sm rounded-full px-6 py-3 hover:bg-neutral-200 transition-colors mt-2"
            disabled={loading}
          >
            {loading ? "signing in..." : "sign in"}
          </button>
        </form>

        {error ? (
          <p className="text-red-400 text-sm mt-4">{error}</p>
        ) : success ? (
          <p className="text-emerald-400 text-sm mt-4">{success}</p>
        ) : null}

        <p className="text-white/60 text-xs mt-6 text-center">
          no account?{" "}
          <Link to="/register" className="text-white hover:text-white transition-colors underline underline-offset-4">
            create one
          </Link>
        </p>
      </div>
    </div>
  );
}
