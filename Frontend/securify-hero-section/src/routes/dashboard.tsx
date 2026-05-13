import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Car,
  CheckCircle2,
  CreditCard,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Map,
  Megaphone,
  Plus,
  Receipt,
  Route as RouteIcon,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  Warehouse,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { StatBlock } from "@/components/ui-ext/StatBlock";
import { apiUrl } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "operations dashboard - stadie-park" }] }),
  component: DashboardPage,
});

type UserType = "driver" | "admin" | "parking_marshal";
type TabKey =
  | "overview"
  | "profile"
  | "vehicle-registration"
  | "availability"
  | "payments"
  | "queue"
  | "navigation"
  | "history"
  | "help"
  | "intake"
  | "marshal-payments"
  | "marshal-queue"
  | "slots"
  | "monitoring"
  | "incidents"
  | "communications"
  | "limited-users"
  | "users"
  | "zones"
  | "priority"
  | "reports"
  | "settings";

type User = {
  id: number;
  email: string;
  user_type: UserType;
  is_admin: boolean;
  is_active: boolean;
};

type Vehicle = {
  id: number;
  user_id: number;
  plate_number: string;
  category: string;
  urgency: number;
  payment_status: string;
  status: string;
  priority_score: number;
  parking_slot_id: number | null;
};

type TabDefinition = { key: TabKey; label: string; icon: typeof LayoutDashboard };
type DemoVehicle = {
  id: number;
  plate: string;
  category: "General" | "VVIP" | "Emergency";
  score: number;
  zone: string;
  status: string;
  wait: number;
};

type DemoZone = {
  id: string;
  name: string;
  capacity: number;
  occupied: number;
  kind: "general" | "vvip" | "emergency" | "overflow";
};

const zones = [
  { id: "A", name: "North gate", free: 72, capacity: 120, wait: "4 min", state: "Open" },
  { id: "B", name: "VIP", free: 19, capacity: 60, wait: "7 min", state: "Priority" },
  { id: "C", name: "East stand", free: 22, capacity: 200, wait: "15 min", state: "Busy" },
  { id: "D", name: "Buses", free: 18, capacity: 40, wait: "8 min", state: "Open" },
  { id: "E", name: "Emergency", free: 16, capacity: 20, wait: "0 min", state: "Reserved" },
  { id: "F", name: "Overflow", free: 204, capacity: 300, wait: "3 min", state: "Open" },
];

const categories = [
  { name: "Emergency", weight: 10, fee: 0, exempt: true },
  { name: "VIP", weight: 8, fee: 300, exempt: false },
  { name: "Public transport", weight: 6, fee: 200, exempt: false },
  { name: "Private", weight: 3, fee: 100, exempt: false },
];

const queueRows = [
  { plate: "KCA 001A", score: 98, position: 1, status: "next", zone: "E" },
  { plate: "KBZ 555V", score: 86, position: 2, status: "priority", zone: "B" },
  { plate: "KTW 220P", score: 64, position: 3, status: "waiting", zone: "D" },
  { plate: "KDJ 901M", score: 42, position: 4, status: "waiting", zone: "F" },
];

const incidents = [
  { time: "19:44", plate: "KXE 117R", type: "blocked lane", status: "assistance dispatched" },
  { time: "19:37", plate: "KDJ 901M", type: "payment dispute", status: "recorded" },
];

const initialDemoZones: DemoZone[] = [
  { id: "G", name: "General zone", capacity: 100, occupied: 0, kind: "general" },
  { id: "V", name: "VVIP zone", capacity: 50, occupied: 0, kind: "vvip" },
  { id: "E", name: "Emergency zone", capacity: 20, occupied: 0, kind: "emergency" },
  { id: "O", name: "Overflow zone", capacity: 120, occupied: 0, kind: "overflow" },
];

function roleLabel(userType: UserType) {
  if (userType === "parking_marshal") return "Parking marshal account";
  if (userType === "admin") return "Admin account";
  return "Driver account";
}

function firstLetter(email: string) {
  return email.trim().charAt(0).toUpperCase() || "U";
}

function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [myVehicles, setMyVehicles] = useState<Vehicle[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffType, setStaffType] = useState<"admin" | "parking_marshal">("parking_marshal");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDemoMode, setShowDemoMode] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("stadie_park_token") : null;
  const isAdmin = currentUser?.user_type === "admin" && currentUser.is_admin;
  const isMarshal = currentUser?.user_type === "parking_marshal";
  const isDriver = currentUser?.user_type === "driver";
  const visibleVehicles = isAdmin || isMarshal ? allVehicles : myVehicles;
  const pendingUsers = allUsers.filter((user) => !user.is_active && user.user_type !== "driver");

  const tabs = useMemo<TabDefinition[]>(() => {
    if (isAdmin) {
      return [
        { key: "overview", label: "Overview", icon: LayoutDashboard },
        { key: "users", label: "Users", icon: UsersRound },
        { key: "vehicles", label: "Vehicles", icon: Car },
        { key: "zones", label: "Zones", icon: Warehouse },
        { key: "priority", label: "Priority", icon: SlidersHorizontal },
        { key: "payments", label: "Payments", icon: CreditCard },
        { key: "reports", label: "Reports", icon: BarChart3 },
        { key: "settings", label: "Settings", icon: Settings },
        { key: "profile", label: "Profile", icon: UserRound },
      ];
    }
    if (isMarshal) {
      return [
        { key: "overview", label: "Overview", icon: LayoutDashboard },
        { key: "intake", label: "Intake", icon: Plus },
        { key: "marshal-payments", label: "Payment", icon: CreditCard },
        { key: "marshal-queue", label: "Queue", icon: RouteIcon },
        { key: "slots", label: "Slots", icon: Warehouse },
        { key: "monitoring", label: "Monitoring", icon: BarChart3 },
        { key: "incidents", label: "Incidents", icon: AlertTriangle },
        { key: "communications", label: "Messages", icon: Megaphone },
        { key: "limited-users", label: "Driver Access", icon: ShieldCheck },
        { key: "profile", label: "Profile", icon: UserRound },
      ];
    }
    return [
      { key: "overview", label: "Overview", icon: LayoutDashboard },
      { key: "profile", label: "Profile", icon: UserRound },
      { key: "vehicle-registration", label: "Vehicle", icon: Car },
      { key: "availability", label: "Availability", icon: Warehouse },
      { key: "payments", label: "Payment", icon: CreditCard },
      { key: "queue", label: "Queue", icon: Bell },
      { key: "navigation", label: "Navigation", icon: Map },
      { key: "history", label: "History", icon: Receipt },
      { key: "help", label: "Help", icon: HelpCircle },
    ];
  }, [isAdmin, isMarshal]);

  async function loadDashboard() {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setError("");
      const meResponse = await fetch(apiUrl("/auth/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meResponse.ok) {
        setError("Please log in again.");
        setLoading(false);
        return;
      }

      const user: User = await meResponse.json();
      setCurrentUser(user);

      const myVehiclesResponse = await fetch(apiUrl("/auth/my-vehicles"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (myVehiclesResponse.ok) setMyVehicles(await myVehiclesResponse.json());

      if (user.user_type === "admin" || user.user_type === "parking_marshal") {
        const vehicleResponse = await fetch(apiUrl("/vehicles/"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (vehicleResponse.ok) setAllVehicles(await vehicleResponse.json());
      }

      if (user.user_type === "admin" || user.user_type === "parking_marshal") {
        const usersResponse = await fetch(apiUrl("/auth/users"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (usersResponse.ok) setAllUsers(await usersResponse.json());
      }
    } catch {
      setError("Unable to reach backend. Make sure the server is running on port 8001.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function handleLogout() {
    localStorage.removeItem("stadie_park_token");
    localStorage.removeItem("stadie_park_user_type");
    window.location.href = "/login";
  }

  async function approveUser(userId: number) {
    await postAction(apiUrl(`/auth/users/${userId}/approve`), "Account approved.");
  }

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError("");
    setMessage("");
    const response = await fetch(apiUrl("/auth/users"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: staffEmail, password: staffPassword, user_type: staffType }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.detail || "Could not create staff account.");
      return;
    }
    setStaffEmail("");
    setStaffPassword("");
    setMessage("Staff account created and approved.");
    await loadDashboard();
  }

  async function updateUser(userId: number, changes: Partial<Pick<User, "email" | "user_type" | "is_active">>) {
    if (!token) return;
    setError("");
    setMessage("");
    const response = await fetch(apiUrl(`/auth/users/${userId}`), {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.detail || "Could not update user.");
      return;
    }
    setMessage("User account updated.");
    await loadDashboard();
  }

  async function deactivateUser(userId: number) {
    await postAction(apiUrl(`/auth/users/${userId}/deactivate`), "User account deactivated.");
  }

  async function postAction(url: string, success: string) {
    if (!token) return;
    setError("");
    setMessage("");
    const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.detail || "Action failed.");
      return;
    }
    setMessage(success);
    await loadDashboard();
  }

  const totalFree = zones.reduce((sum, zone) => sum + zone.free, 0);
  const totalCapacity = zones.reduce((sum, zone) => sum + zone.capacity, 0);
  const occupiedPct = Math.round(((totalCapacity - totalFree) / totalCapacity) * 100);

  return (
    <PageShell title="operations dashboard" description="role-based account, parking, and operations controls">
      {loading ? (
        <div className="text-white/70">Loading dashboard...</div>
      ) : currentUser ? (
        <>
          <ProfileHeader user={currentUser} onLogout={handleLogout} />
          {isAdmin ? (
            <div className="mb-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDemoMode((value) => !value)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              >
                Demo Mode
              </button>
            </div>
          ) : null}

          {isAdmin && showDemoMode ? <DemoModePanel /> : null}

          <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
                    selected ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {message ? <p className="mb-4 rounded-lg bg-emerald-500/15 px-4 py-3 text-sm text-emerald-300">{message}</p> : null}
          {error ? <p className="mb-4 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-300">{error}</p> : null}

          {activeTab === "overview" ? (
            <OverviewTab
              role={currentUser.user_type}
              occupiedPct={occupiedPct}
              vehicleCount={visibleVehicles.length}
              totalFree={totalFree}
            />
          ) : null}

          {activeTab === "profile" ? (
            <ProfileTab user={currentUser} vehicles={myVehicles} updateUser={updateUser} />
          ) : null}

          {isDriver && activeTab === "vehicle-registration" ? <DriverVehicleTab vehicles={myVehicles} /> : null}
          {isDriver && activeTab === "availability" ? <AvailabilityTab /> : null}
          {isDriver && activeTab === "payments" ? <DriverPaymentTab vehicles={myVehicles} /> : null}
          {isDriver && activeTab === "queue" ? <DriverQueueTab vehicles={myVehicles} /> : null}
          {isDriver && activeTab === "navigation" ? <NavigationTab /> : null}
          {isDriver && activeTab === "history" ? <HistoryTab /> : null}
          {isDriver && activeTab === "help" ? <HelpTab /> : null}

          {isMarshal && activeTab === "intake" ? <MarshalIntakeTab /> : null}
          {isMarshal && activeTab === "marshal-payments" ? <MarshalPaymentTab vehicles={allVehicles} /> : null}
          {isMarshal && activeTab === "marshal-queue" ? <MarshalQueueTab /> : null}
          {isMarshal && activeTab === "slots" ? <SlotManagementTab /> : null}
          {isMarshal && activeTab === "monitoring" ? <MonitoringTab /> : null}
          {isMarshal && activeTab === "incidents" ? <IncidentsTab /> : null}
          {isMarshal && activeTab === "communications" ? <CommunicationsTab /> : null}
          {isMarshal && activeTab === "limited-users" ? (
            <LimitedUsersTab users={allUsers} deactivateUser={deactivateUser} />
          ) : null}

          {activeTab === "vehicles" && isAdmin ? <VehiclesTable vehicles={allVehicles} title="all registered vehicles" /> : null}
          {activeTab === "users" && isAdmin ? (
            <UsersTab
              users={allUsers}
              pendingUsers={pendingUsers}
              staffEmail={staffEmail}
              staffPassword={staffPassword}
              staffType={staffType}
              setStaffEmail={setStaffEmail}
              setStaffPassword={setStaffPassword}
              setStaffType={setStaffType}
              createStaff={createStaff}
              approveUser={approveUser}
              updateUser={updateUser}
              deactivateUser={deactivateUser}
            />
          ) : null}
          {activeTab === "zones" && isAdmin ? <AdminControlTab type="zones" /> : null}
          {activeTab === "priority" && isAdmin ? <AdminControlTab type="priority" /> : null}
          {activeTab === "payments" && isAdmin ? <AdminControlTab type="payments" /> : null}
          {activeTab === "reports" && isAdmin ? <AdminControlTab type="reports" /> : null}
          {activeTab === "settings" && isAdmin ? <AdminControlTab type="settings" /> : null}
        </>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/90 p-6 text-white/70">
          No user data available. Please <Link to="/login" className="text-white underline">log in</Link>.
        </div>
      )}
    </PageShell>
  );
}

function ProfileHeader({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <section className="mb-8 flex flex-col gap-5 rounded-2xl border border-white/10 bg-neutral-900/90 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-semibold text-black">
          {firstLetter(user.email)}
        </div>
        <div>
          <h2 className="text-lg font-medium text-white">{user.email}</h2>
          <p className="text-sm text-white/70">{roleLabel(user.user_type)}</p>
          <p className={user.is_active ? "text-xs text-emerald-300" : "text-xs text-amber-300"}>
            {user.is_active ? "Approved and active" : "Pending approval"}
          </p>
        </div>
      </div>
      <button onClick={onLogout} className="rounded-full bg-white px-5 py-2 text-sm text-black hover:bg-neutral-200">
        Logout
      </button>
    </section>
  );
}

function DemoModePanel() {
  const [demoVehicles, setDemoVehicles] = useState<DemoVehicle[]>([]);
  const [demoZones, setDemoZones] = useState<DemoZone[]>(initialDemoZones);
  const [demoAlert, setDemoAlert] = useState("");
  const [activeStep, setActiveStep] = useState(1);
  const [reportReady, setReportReady] = useState(false);
  const [log, setLog] = useState<string[]>(["Step 1: Monitoring dashboard opened. All demo zones are empty."]);

  function addLog(text: string) {
    setLog((current) => [text, ...current].slice(0, 8));
  }

  function sortQueue(vehicles: DemoVehicle[]) {
    return [...vehicles].sort((a, b) => b.score - a.score || a.id - b.id);
  }

  function registerGeneral() {
    const vehicle: DemoVehicle = {
      id: Date.now(),
      plate: `GEN-${demoVehicles.length + 1}`,
      category: "General",
      score: 1,
      zone: "General zone",
      status: "queued at back",
      wait: 0,
    };
    setDemoVehicles((current) => sortQueue([...current, vehicle]));
    setActiveStep(2);
    addLog("Step 2: General vehicle registered. Score = 1. It joins the back of the queue.");
  }

  function registerVvip() {
    const vvipFull = demoZones.find((zone) => zone.kind === "vvip" && zone.occupied / zone.capacity >= 0.86);
    const vehicle: DemoVehicle = {
      id: Date.now(),
      plate: `VVIP-${demoVehicles.length + 1}`,
      category: "VVIP",
      score: vvipFull ? 7 : 8,
      zone: vvipFull ? "Overflow zone" : "VVIP zone",
      status: vvipFull ? "redirected from VVIP, zone adjustment -1" : "assigned VVIP zone",
      wait: 0,
    };
    setDemoVehicles((current) => sortQueue([...current, vehicle]));
    setDemoZones((current) =>
      current.map((zone) => {
        if (!vvipFull && zone.kind === "vvip") return { ...zone, occupied: Math.min(zone.capacity, zone.occupied + 1) };
        if (vvipFull && zone.kind === "overflow") return { ...zone, occupied: zone.occupied + 1 };
        return zone;
      }),
    );
    setActiveStep(vvipFull ? 5 : 3);
    addLog(vvipFull ? "Step 5: VVIP redirected to overflow. Score adjusts by -1." : "Step 3: VVIP registered. Score = 8. It jumps above General.");
  }

  function registerAmbulance() {
    const vehicle: DemoVehicle = {
      id: Date.now(),
      plate: `AMB-${demoVehicles.length + 1}`,
      category: "Emergency",
      score: 20,
      zone: "Emergency zone",
      status: "emergency alert fired",
      wait: 0,
    };
    setDemoAlert("Emergency vehicle detected. Priority override active.");
    setDemoVehicles((current) => sortQueue([...current, vehicle]));
    setActiveStep(4);
    addLog("Step 4: Emergency registered. Score = 20. Alert fired and slot assignment started.");
    window.setTimeout(() => {
      setDemoZones((current) =>
        current.map((zone) => zone.kind === "emergency" ? { ...zone, occupied: Math.min(zone.capacity, zone.occupied + 1) } : zone),
      );
      setDemoVehicles((current) =>
        current.map((item) => item.id === vehicle.id ? { ...item, status: "assigned in under 2 seconds" } : item),
      );
      addLog("Emergency slot assigned in under 2 seconds. Zone update completed.");
    }, 1200);
  }

  function fillVvipZone() {
    setDemoZones((current) =>
      current.map((zone) => zone.kind === "vvip" ? { ...zone, occupied: Math.ceil(zone.capacity * 0.86) } : zone),
    );
    setActiveStep(5);
    addLog("Step 5: VVIP zone filled to 86%. Next VVIP will redirect to overflow.");
  }

  function waitTwentyMinutes() {
    setDemoVehicles((current) => {
      const existingGeneral = current.find((vehicle) => vehicle.category === "General");
      if (!existingGeneral) {
        return sortQueue([
          ...current,
          {
            id: Date.now(),
            plate: "GEN-AGED",
            category: "General",
            score: 3,
            zone: "General zone",
            status: "aged 20 minutes",
            wait: 20,
          },
        ]);
      }
      return sortQueue(current.map((vehicle) => vehicle.id === existingGeneral.id ? { ...vehicle, score: 3, wait: 20, status: "aged 20 minutes" } : vehicle));
    });
    setActiveStep(6);
    addLog("Step 6: General vehicle fast-forwarded 20 minutes. Ageing raises score to 3.0.");
  }

  function generateReport() {
    setReportReady(true);
    setActiveStep(7);
    addLog("Step 7: Post-event report generated.");
  }

  function resetDemo() {
    setDemoVehicles([]);
    setDemoZones(initialDemoZones);
    setDemoAlert("");
    setActiveStep(1);
    setReportReady(false);
    setLog(["Step 1: Monitoring dashboard opened. All demo zones are empty."]);
  }

  const steps = [
    "Open monitoring dashboard. All zones empty. Logged in as Operations Manager.",
    "Register General vehicle. Score = 1. It joins the queue.",
    "Register VVIP vehicle. Score = 8. Queue reorders live.",
    "Register Emergency vehicle. Score = 20. Alert fires and slot assigns.",
    "Fill VVIP zone to 86%. Another VVIP redirects to overflow with -1 score adjustment.",
    "Fast-forward General vehicle by 20 minutes. Score climbs to 3.0.",
    "Generate post-event report with accuracy, utilisation, and waiting time.",
  ];

  return (
    <section className="mb-8 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5">
      {demoAlert ? (
        <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/20 px-4 py-3 text-sm text-red-100">
          {demoAlert}
        </div>
      ) : null}

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-medium text-white">Demo Mode control panel</h2>
          <p className="text-sm text-white/60">Operations Manager simulator for priority scoring, alerts, redirects, ageing, and reports.</p>
        </div>
        <button type="button" onClick={resetDemo} className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/70 hover:bg-white/10">
          Reset demo
        </button>
      </div>

      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <DemoButton label="General vehicle arrives" onClick={registerGeneral} />
        <DemoButton label="VVIP arrives" onClick={registerVvip} />
        <DemoButton label="Ambulance arrives" onClick={registerAmbulance} danger />
        <DemoButton label="Fill VVIP zone to 86%" onClick={fillVvipZone} />
        <DemoButton label="Wait 20 minutes" onClick={waitTwentyMinutes} />
        <DemoButton label="Generate report" onClick={generateReport} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr_0.9fr]">
        <Panel title="demo steps">
          <ol className="space-y-2 text-sm text-white/70">
            {steps.map((step, index) => (
              <li key={step} className={activeStep === index + 1 ? "rounded-lg bg-white/10 p-2 text-white" : "p-2"}>
                Step {index + 1}: {step}
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="live queue scoring">
          {demoVehicles.length ? (
            <div className="space-y-2">
              {demoVehicles.map((vehicle, index) => (
                <div key={vehicle.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg bg-white/5 p-3">
                  <span className="text-xs text-white/50">#{index + 1}</span>
                  <div>
                    <p className="text-sm text-white">{vehicle.plate} - {vehicle.category}</p>
                    <p className="text-xs text-white/55">{vehicle.zone} - {vehicle.status}{vehicle.wait ? ` - waited ${vehicle.wait} min` : ""}</p>
                  </div>
                  <span className={vehicle.score >= 20 ? "text-lg font-semibold text-red-300" : vehicle.score >= 8 ? "text-lg font-semibold text-cyan-200" : "text-lg font-semibold text-white"}>
                    {vehicle.score}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/60">No demo vehicles yet. Start with General vehicle arrives.</p>
          )}
        </Panel>

        <Panel title="zone status and report">
          <div className="mb-4 space-y-2">
            {demoZones.map((zone) => {
              const pct = Math.round((zone.occupied / zone.capacity) * 100);
              return (
                <div key={zone.id} className="rounded-lg bg-white/5 p-3">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-white">{zone.name}</span>
                    <span className={pct >= 86 ? "text-amber-300" : zone.kind === "emergency" && zone.occupied ? "text-red-300" : "text-white/60"}>{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className={pct >= 86 ? "h-full bg-amber-300" : zone.kind === "emergency" && zone.occupied ? "h-full bg-red-300" : "h-full bg-emerald-300"} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {reportReady ? (
            <div className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
              <p>Allocation accuracy: 98%</p>
              <p>Slot utilisation rate: 71%</p>
              <p>Avg wait: Emergency 0m, VVIP 2m, General 9m</p>
            </div>
          ) : (
            <SimpleRows rows={log} />
          )}
        </Panel>
      </div>
    </section>
  );
}

function DemoButton({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={danger ? "rounded-xl bg-red-400 px-3 py-3 text-sm text-black hover:bg-red-300" : "rounded-xl bg-white px-3 py-3 text-sm text-black hover:bg-neutral-200"}
    >
      {label}
    </button>
  );
}

function OverviewTab({
  role,
  occupiedPct,
  vehicleCount,
  totalFree,
}: {
  role: UserType;
  occupiedPct: number;
  vehicleCount: number;
  totalFree: number;
}) {
  const label = role === "driver" ? "my vehicles" : "vehicles visible";
  return (
    <>
      <div className="mb-8 grid grid-cols-2 gap-6 md:grid-cols-4">
        <StatBlock value={`${occupiedPct}%`} label="overall occupancy" divider="right" />
        <StatBlock value={`${vehicleCount}`} label={label} divider="right" />
        <StatBlock value={`${totalFree}`} label="spaces free" divider="right" />
        <StatBlock value={`${queueRows.length}`} label="queue length" divider="right" />
      </div>
      <AvailabilityTab compact />
    </>
  );
}

function ProfileTab({
  user,
  vehicles,
  updateUser,
}: {
  user: User;
  vehicles: Vehicle[];
  updateUser: (userId: number, changes: Partial<Pick<User, "email" | "user_type" | "is_active">>) => void;
}) {
  const [email, setEmail] = useState(user.email);
  return (
    <Panel title="self-service profile management">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl font-semibold text-black">
          {firstLetter(user.email)}
        </div>
        <div>
          <p className="text-white">{user.email}</p>
          <p className="text-sm text-white/70">{roleLabel(user.user_type)}</p>
          <p className="text-sm text-white/60">{vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} linked</p>
        </div>
      </div>
      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          updateUser(user.id, { email });
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-w-0 rounded-lg border border-white/10 bg-neutral-950 px-4 py-3 text-sm text-white"
          required
        />
        <button type="submit" className="rounded-full bg-white px-5 py-3 text-sm text-black hover:bg-neutral-200">
          Save profile
        </button>
      </form>
    </Panel>
  );
}

function DriverVehicleTab({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Panel title="vehicle registration">
        <div className="space-y-3">
          <input className="field" placeholder="Plate number" />
          <select className="field" defaultValue="">
            <option value="" disabled>Vehicle type</option>
            {categories.map((category) => <option key={category.name}>{category.name}</option>)}
          </select>
          <select className="field" defaultValue="">
            <option value="" disabled>Intended gate or entrance</option>
            <option>Gate 1 - North</option>
            <option>Gate 2 - VIP</option>
            <option>Gate 3 - East</option>
          </select>
          <button className="rounded-full bg-white px-5 py-3 text-sm text-black hover:bg-neutral-200">Register vehicle</button>
        </div>
      </Panel>
      <VehiclesTable vehicles={vehicles} title="my vehicles" />
    </div>
  );
}

function AvailabilityTab({ compact = false }: { compact?: boolean }) {
  return (
    <Panel title={compact ? "availability lookup" : "availability lookup by zone"}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {zones.map((zone) => (
          <div key={zone.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-white">{zone.name}</p>
              <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-white/70">{zone.state}</span>
            </div>
            <p className="text-2xl font-medium text-white">{zone.free} free</p>
            <p className="text-xs text-white/60">Estimated wait {zone.wait}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function DriverPaymentTab({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <Panel title="nfc and mobile wallet payment">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <VehiclesTable vehicles={vehicles} title="payment status" />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-white text-black">
            <CreditCard size={32} />
          </div>
          <p className="text-sm text-white/70">Exempt categories such as Emergency can proceed without payment.</p>
          <button className="mt-5 rounded-full bg-white px-5 py-3 text-sm text-black hover:bg-neutral-200">Pay now</button>
        </div>
      </div>
    </Panel>
  );
}

function DriverQueueTab({ vehicles }: { vehicles: Vehicle[] }) {
  const plate = vehicles[0]?.plate_number || "Your vehicle";
  return (
    <Panel title="queue status and notifications">
      <div className="grid gap-4 md:grid-cols-3">
        <InfoTile title="Queue position" value="3" note={`${plate} is waiting`} />
        <InfoTile title="Next alert" value="2 min" note="Proceed notification pending" />
        <InfoTile title="Assigned zone" value="F" note="May change if priority updates" />
      </div>
    </Panel>
  );
}

function NavigationTab() {
  return (
    <Panel title="slot navigation">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
        <div className="grid grid-cols-8 gap-2 rounded-2xl border border-white/10 bg-white/5 p-5">
          {Array.from({ length: 64 }, (_, index) => (
            <div key={index} className={`aspect-square rounded ${index === 18 ? "bg-emerald-300" : index % 5 === 0 ? "bg-white/30" : "bg-white/10"}`} />
          ))}
        </div>
        <div>
          <p className="text-sm text-white/70">Assigned slot F-19. Follow Gate 3, turn left after the east stand, then proceed to overflow lane F.</p>
          <button className="mt-5 rounded-full bg-white px-5 py-3 text-sm text-black hover:bg-neutral-200">Mark arrived</button>
        </div>
      </div>
    </Panel>
  );
}

function HistoryTab() {
  return (
    <Panel title="history and receipts">
      <SimpleRows rows={["KCA 123A - Private - Paid 100 - Receipt #SP-1021", "KBZ 411V - VIP - Paid 300 - Receipt #SP-0988"]} />
    </Panel>
  );
}

function HelpTab() {
  return (
    <Panel title="help and feedback">
      <p className="mb-4 text-sm text-white/70">Use the floating assistant at the bottom-right to ask questions like where to enter, payment status, or assigned slot directions.</p>
      <textarea className="field min-h-28" placeholder="Share feedback about your parking experience" />
      <button className="mt-3 rounded-full bg-white px-5 py-3 text-sm text-black hover:bg-neutral-200">Send feedback</button>
    </Panel>
  );
}

function MarshalIntakeTab() {
  return (
    <Panel title="vehicle intake and registration">
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="field" placeholder="Scan QR/NFC token or enter plate" />
        <select className="field" defaultValue=""><option value="" disabled>Category</option><option>Emergency</option><option>VIP</option><option>Private</option></select>
        <input className="field" placeholder="Driver contact" />
        <select className="field" defaultValue=""><option value="" disabled>Gate</option><option>Gate 1</option><option>Gate 2</option><option>Gate 3</option></select>
      </div>
      <button className="mt-4 rounded-full bg-white px-5 py-3 text-sm text-black hover:bg-neutral-200">Verify and add to queue</button>
    </Panel>
  );
}

function MarshalPaymentTab({ vehicles }: { vehicles: Vehicle[] }) {
  return <VehiclesTable vehicles={vehicles} title="payment validation at gate" />;
}

function MarshalQueueTab() {
  return (
    <Panel title="priority queue management">
      <div className="space-y-2">
        {queueRows.map((row) => (
          <div key={row.plate} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
            <div>
              <p className="text-sm text-white">{row.position}. {row.plate}</p>
              <p className="text-xs text-white/60">Score {row.score} - {row.status}</p>
            </div>
            <button className="rounded-full bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15">Move up</button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SlotManagementTab() {
  return (
    <Panel title="slot assignment and release">
      <div className="grid grid-cols-8 gap-2">
        {Array.from({ length: 48 }, (_, index) => (
          <button key={index} className={`aspect-square rounded ${index % 9 === 0 ? "bg-red-400/50" : index % 4 === 0 ? "bg-white" : "bg-white/10"}`} />
        ))}
      </div>
    </Panel>
  );
}

function MonitoringTab() {
  return (
    <Panel title="monitoring and shift reports">
      <div className="grid gap-4 md:grid-cols-4">
        <InfoTile title="Waiting" value="24" note="vehicles in queue" />
        <InfoTile title="Emergency" value="2" note="active cases" />
        <InfoTile title="Avg wait" value="8m" note="current shift" />
        <InfoTile title="Occupied" value="68%" note="all zones" />
      </div>
      <button className="mt-5 rounded-full bg-white px-5 py-3 text-sm text-black hover:bg-neutral-200">Pull shift report</button>
    </Panel>
  );
}

function IncidentsTab() {
  return (
    <Panel title="incident handling">
      <SimpleRows rows={incidents.map((incident) => `${incident.time} - ${incident.plate} - ${incident.type} - ${incident.status}`)} />
      <button className="mt-4 rounded-full bg-white px-5 py-3 text-sm text-black hover:bg-neutral-200">Record incident</button>
    </Panel>
  );
}

function CommunicationsTab() {
  return (
    <Panel title="communications and notifications">
      <textarea className="field min-h-28" placeholder="Broadcast to queue, e.g. Gate 2 is full, redirect to Gate 3" />
      <button className="mt-3 flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm text-black hover:bg-neutral-200">
        <Megaphone size={16} />
        Broadcast message
      </button>
    </Panel>
  );
}

function LimitedUsersTab({ users, deactivateUser }: { users: User[]; deactivateUser: (userId: number) => void }) {
  return (
    <Panel title="limited driver access management">
      <p className="mb-4 text-sm text-white/60">Marshals can temporarily disable driver access for breaches and notify admins for final action.</p>
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
            <div>
              <p className="text-sm text-white">{user.email}</p>
              <p className="text-xs text-white/60">{user.is_active ? "Active driver" : "Disabled driver"}</p>
            </div>
            <button onClick={() => deactivateUser(user.id)} className="rounded-full bg-red-500/15 px-3 py-2 text-xs text-red-300 hover:bg-red-500/25">Disable</button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function VehiclesTable({ vehicles, title }: { vehicles: Vehicle[]; title: string }) {
  return (
    <Panel title={title}>
      {vehicles.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="text-xs lowercase text-white/50">
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left font-normal">plate</th>
                <th className="px-4 py-3 text-left font-normal">category</th>
                <th className="px-4 py-3 text-left font-normal">status</th>
                <th className="px-4 py-3 text-left font-normal">payment</th>
                <th className="px-4 py-3 text-left font-normal">urgency</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-white">{vehicle.plate_number}</td>
                  <td className="px-4 py-3 text-white/70">{vehicle.category}</td>
                  <td className="px-4 py-3 text-white/70">{vehicle.status}</td>
                  <td className="px-4 py-3 text-white/70">{vehicle.payment_status}</td>
                  <td className="px-4 py-3 text-white/70">{vehicle.urgency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-white/60">No vehicles found.</p>
      )}
    </Panel>
  );
}

function UsersTab(props: {
  users: User[];
  pendingUsers: User[];
  staffEmail: string;
  staffPassword: string;
  staffType: "admin" | "parking_marshal";
  setStaffEmail: (value: string) => void;
  setStaffPassword: (value: string) => void;
  setStaffType: (value: "admin" | "parking_marshal") => void;
  createStaff: (event: FormEvent<HTMLFormElement>) => void;
  approveUser: (userId: number) => void;
  updateUser: (userId: number, changes: Partial<Pick<User, "email" | "user_type" | "is_active">>) => void;
  deactivateUser: (userId: number) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Panel title="create admin or marshal">
        <form onSubmit={props.createStaff} className="space-y-4">
          <select value={props.staffType} onChange={(event) => props.setStaffType(event.target.value as "admin" | "parking_marshal")} className="field">
            <option value="parking_marshal">Parking Marshal</option>
            <option value="admin">Admin</option>
          </select>
          <input type="email" value={props.staffEmail} onChange={(event) => props.setStaffEmail(event.target.value)} placeholder="staff@email.com" className="field" required />
          <input type="password" value={props.staffPassword} onChange={(event) => props.setStaffPassword(event.target.value)} placeholder="Password" className="field" required />
          <button type="submit" className="flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm text-black hover:bg-neutral-200">
            <Plus size={16} />
            Create and approve
          </button>
        </form>
      </Panel>

      <Panel title="user management and approvals">
        {props.pendingUsers.length ? (
          <div className="mb-5 rounded-lg border border-amber-400/20 bg-amber-500/10 p-4">
            <h3 className="mb-3 text-sm font-medium text-amber-200">Pending approval</h3>
            <div className="space-y-2">
              {props.pendingUsers.map((user) => (
                <div key={user.id} className="flex flex-col gap-3 rounded-lg bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-white">{user.email}</p>
                    <p className="text-xs text-white/60">{roleLabel(user.user_type)}</p>
                  </div>
                  <button type="button" onClick={() => props.approveUser(user.id)} className="flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-black hover:bg-neutral-200">
                    <CheckCircle2 size={16} />
                    Approve
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          {props.users.map((user) => (
            <div key={user.id} className="flex flex-col gap-3 rounded-lg bg-white/5 p-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <input
                  type="email"
                  defaultValue={user.email}
                  onBlur={(event) => {
                    const nextEmail = event.currentTarget.value.trim();
                    if (nextEmail && nextEmail !== user.email) props.updateUser(user.id, { email: nextEmail });
                  }}
                  className="w-full min-w-[220px] rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm text-white"
                />
                <p className="text-xs text-white/60">{roleLabel(user.user_type)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={user.user_type} onChange={(event) => props.updateUser(user.id, { user_type: event.target.value as UserType })} className="rounded-full border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-white">
                  <option value="driver">Driver</option>
                  <option value="parking_marshal">Parking Marshal</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="button" onClick={() => props.updateUser(user.id, { is_active: !user.is_active })} className={`rounded-full px-3 py-2 text-xs ${user.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                  {user.is_active ? "Approved" : "Pending"}
                </button>
                <button type="button" onClick={() => props.deactivateUser(user.id)} className="rounded-full bg-red-500/15 px-3 py-2 text-xs text-red-300 hover:bg-red-500/25">
                  Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function AdminControlTab({ type }: { type: "zones" | "priority" | "payments" | "reports" | "settings" }) {
  const content = {
    zones: {
      title: "parking zone management",
      summary: "Create, edit, retire parking zones, set capacities, and configure VIP or emergency zones.",
      rows: ["Create zone", "Edit capacity", "Retire zone", "Mark VIP or emergency"],
    },
    priority: {
      title: "vehicle category and priority settings",
      summary: "Define vehicle categories, priority weights, exemptions, and algorithm settings.",
      rows: categories.map((category) => `${category.name} weight ${category.weight}`),
    },
    payments: {
      title: "payment and fee configuration",
      summary: "Configure providers, parking fees, discounts, exemptions, and refund policy.",
      rows: categories.map((category) => `${category.name} fee ${category.exempt ? "exempt" : category.fee}`),
    },
    reports: {
      title: "analytics and reporting",
      summary: "Full utilisation, waiting-time, revenue, and historical reports.",
      rows: ["Utilisation report", "Waiting time report", "Revenue report", "Historical audit"],
    },
    settings: {
      title: "system settings and maintenance",
      summary: "Control maintenance mode, holidays, notifications, LLM assistant integration, and backups.",
      rows: ["Maintenance mode", "System holidays", "Notifications", "Backups"],
    },
  }[type];
  return (
    <Panel title={content.title}>
      <p className="mb-5 text-sm leading-6 text-white/65">{content.summary}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {content.rows.map((row) => (
          <button key={row} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4 text-left text-sm text-white hover:bg-white/10">
            <span>{row}</span>
            <ShieldCheck size={16} />
          </button>
        ))}
      </div>
    </Panel>
  );
}

function InfoTile({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-white/50">{title}</p>
      <p className="mt-2 text-2xl font-medium text-white">{value}</p>
      <p className="mt-1 text-xs text-white/60">{note}</p>
    </div>
  );
}

function SimpleRows({ rows }: { rows: string[] }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row} className="rounded-lg bg-white/5 p-3 text-sm text-white/80">{row}</div>
      ))}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-900/90 p-6">
      <h2 className="mb-4 text-sm lowercase text-white/70">{title}</h2>
      {children}
    </section>
  );
}
