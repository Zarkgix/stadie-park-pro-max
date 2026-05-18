import { FormEvent, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { apiUrl } from "@/lib/api";

type UserType = "driver" | "admin" | "parking_marshal";

const heroCards = [
  {
    title: "Swift entry",
    subtitle: "Priority access for urgent vehicles",
    src: "https://images.unsplash.com/photo-1509223197845-458d87318791?auto=format&fit=crop&w=1200&q=80",
    srcHover: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Secure control",
    subtitle: "Driver-focused registration flow",
    src: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=80",
    srcHover: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Smart parking",
    subtitle: "Realtime priorities with style",
    src: "https://images.unsplash.com/photo-1470506028280-3c56077beb19?auto=format&fit=crop&w=1200&q=80",
    srcHover: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
  },
];

const userTypeOptions: { value: UserType; label: string }[] = [
  { value: "driver", label: "Driver" },
  { value: "admin", label: "Admin" },
  { value: "parking_marshal", label: "Parking Marshal" },
];

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "register — stadie-park" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<UserType>("driver");
  const [showPassword, setShowPassword] = useState(false);
  const [plateNumber, setPlateNumber] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(apiUrl("/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          user_type: userType,
          plate_number: userType === "driver" ? plateNumber : undefined,
          category: userType === "driver" ? category : undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.detail || "Registration failed.");
        return;
      }

      setSuccess("Registration successful. You can now log in.");
      await router.navigate({ to: "/login" });
    } catch (err) {
      setError("Unable to reach backend. Make sure the server is running on port 8001.");
    } finally {
      setLoading(false);
    }
  }

  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <AppNavbar />
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <div className="grid gap-5 sm:grid-cols-3 mb-8">
              {heroCards.map((card, index) => {
                const isHovered = hoveredCard === index;
                return (
                  <div
                    key={card.title}
                    className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl bg-black/20"
                    style={{ perspective: 1100 }}
                    onMouseEnter={() => setHoveredCard(index)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div
                      className="relative h-52 transition-all duration-500"
                      style={{
                        transformStyle: "preserve-3d",
                        transform: isHovered ? "rotateY(14deg) scale(1.04)" : "rotateY(0deg) scale(1)",
                      }}
                    >
                      <img
                        src={isHovered ? card.srcHover : card.src}
                        alt={card.title}
                        className="h-full w-full object-cover brightness-90 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute left-4 bottom-4 z-10 text-left">
                        <p className="text-sm uppercase tracking-[0.35em] text-white/60">{card.subtitle}</p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{card.title}</h3>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Register</h1>
              <p className="mt-2 text-white/70">Create your account and register your vehicle with an immersive signup experience.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Account Type</label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value as UserType)}
                required
                className="w-full bg-neutral-900/90 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40"
              >
                {userTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-neutral-900/90 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-neutral-900/90 border border-white/10 rounded-lg px-4 py-3 pr-12 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
                  placeholder="Password"
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

            {userType === "driver" ? (
              <>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Plate Number</label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    required
                    className="w-full bg-neutral-900/90 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
                    placeholder="KCA 123A"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-1">Vehicle Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full bg-neutral-900/90 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40"
                  >
                    <option value="">Select category</option>
                    <option value="ambulance">Ambulance (Free)</option>
                    <option value="private">Private ($100)</option>
                    <option value="bus">Bus ($200)</option>
                    <option value="vip">VIP ($300)</option>
                  </select>
                </div>
              </>
            ) : null}

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {success && <p className="text-green-400 text-sm">{success}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black text-sm rounded-full px-6 py-3 hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link to="/login" className="text-white/70 hover:text-white transition-colors">
              Already have an account? Log in →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
