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

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <AppNavbar />
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <Logo className="mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Register</h1>
            <p className="text-white/70">Create your account and register your vehicle</p>
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
