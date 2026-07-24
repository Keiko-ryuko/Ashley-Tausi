import React, { useState, useEffect } from "react";
import { 
  PiggyBank, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Users, 
  Activity, 
  ShieldCheck, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Send, 
  Bot, 
  Sparkles, 
  User as UserIcon, 
  DollarSign, 
  LogOut, 
  Lock, 
  FileText, 
  CreditCard, 
  Info,
  Smartphone,
  ChevronRight,
  PlusCircle,
  RefreshCw,
  UserPlus,
  RotateCcw,
  X,
  Phone,
  Mail,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Group, Contribution, Transaction, Payout, Notification } from "./types";

export default function App() {
  // Auth & Tab state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "contribute" | "members" | "ledger" | "approvals" | "ai-auditor">("dashboard");

  // Core Data state
  const [groups, setGroups] = useState<Group[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [contribAmount, setContribAmount] = useState("");
  const [contribMethod, setContribMethod] = useState<"EcoCash" | "Bank Transfer" | "Cash">("EcoCash");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutReason, setPayoutReason] = useState("");
  const [payoutMemberId, setPayoutMemberId] = useState("");

  // Add Member Form State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"Member" | "Chairperson" | "Treasurer">("Member");
  const [newMemberPassword, setNewMemberPassword] = useState("password");

  // AI state
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Safe JSON parser helper
  const safeParseJson = async (res: Response) => {
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  // Load initial data
  const fetchData = async () => {
    try {
      const [resGroups, resContribs, resTxs, resPayouts, resAlerts, resMebs] = await Promise.all([
        fetch("/api/groups"),
        fetch("/api/contributions"),
        fetch("/api/transactions"),
        fetch("/api/payouts"),
        fetch("/api/notifications"),
        fetch("/api/members")
      ]);

      if (resGroups.ok) {
        const data = await safeParseJson(resGroups);
        if (data) setGroups(data);
      }
      if (resContribs.ok) {
        const data = await safeParseJson(resContribs);
        if (data) setContributions(data);
      }
      if (resTxs.ok) {
        const data = await safeParseJson(resTxs);
        if (data) setTransactions(data);
      }
      if (resPayouts.ok) {
        const data = await safeParseJson(resPayouts);
        if (data) setPayouts(data);
      }
      if (resAlerts.ok) {
        const data = await safeParseJson(resAlerts);
        if (data) setNotifications(data);
      }
      if (resMebs.ok) {
        const data = await safeParseJson(resMebs);
        if (data) setMembers(data);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll data every 5 seconds to keep dashboard state perfectly in sync
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Reset database to clean fresh start
  const handleResetDatabase = async () => {
    if (!window.confirm("Are you sure you want to clear all data and start fresh?")) return;
    try {
      const response = await fetch("/api/db/reset", { method: "POST" });
      if (response.ok) {
        showToast("Database reset! Starting with 0 balance and clean ledger.", "success");
        fetchData();
      } else {
        showToast("Failed to reset database", "error");
      }
    } catch (err) {
      showToast("Network error resetting database", "error");
    }
  };

  // Quick Switch logins
  const handleQuickLogin = (email: string) => {
    setAuthEmail(email);
    setAuthPassword("password");
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await response.json();
      if (response.ok) {
        setCurrentUser(data.user);
        showToast(`Logged in successfully as ${data.user.fullname}`, "success");
      } else {
        setAuthError(data.error || "Login failed");
      }
    } catch (err) {
      setAuthError("Network error. Could not connect to the backend.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthEmail("");
    setAuthPassword("");
    showToast("Logged out successfully", "success");
  };

  // Add new member to Sacco cluster
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberEmail) {
      showToast("Please provide both name and email.", "error");
      return;
    }

    try {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: newMemberName,
          email: newMemberEmail,
          phone: newMemberPhone || "+263 77 000 0000",
          password: newMemberPassword || "password",
          role: newMemberRole
        })
      });
      const data = await response.json();
      if (response.ok) {
        showToast(`Member ${data.fullname} registered to Sacco!`, "success");
        setNewMemberName("");
        setNewMemberEmail("");
        setNewMemberPhone("");
        setNewMemberRole("Member");
        setShowAddMemberModal(false);
        fetchData();
      } else {
        showToast(data.error || "Failed to add member", "error");
      }
    } catch (err) {
      showToast("Network error adding member.", "error");
    }
  };

  // Submit new contribution request (any member or treasurer)
  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const amount = parseFloat(contribAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Please enter a valid contribution amount.", "error");
      return;
    }

    try {
      const response = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: 1,
          member_id: currentUser.user_id,
          member_name: currentUser.fullname,
          amount,
          payment_method: contribMethod,
          recorded_by: currentUser.fullname
        })
      });
      const data = await response.json();
      if (response.ok) {
        setContribAmount("");
        showToast("Contribution submitted! Awaiting Treasurer verification.", "success");
        fetchData();
        setActiveTab("ledger");
      } else {
        showToast(data.error || "Submission failed", "error");
      }
    } catch (err) {
      showToast("Network error submitting contribution.", "error");
    }
  };

  // Treasurer approves / verifies pending contribution
  const handleApproveContribution = async (id: number) => {
    if (!currentUser) return;
    try {
      const response = await fetch(`/api/contributions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved_by: currentUser.fullname })
      });
      const data = await response.json();
      if (response.ok) {
        showToast("Contribution successfully verified and posted to ledger!", "success");
        fetchData();
      } else {
        showToast(data.error || "Approval failed", "error");
      }
    } catch (err) {
      showToast("Network error verifying contribution.", "error");
    }
  };

  // Initiate payout request
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Please enter a valid payout amount.", "error");
      return;
    }

    const payeeId = payoutMemberId ? parseInt(payoutMemberId) : currentUser.user_id;
    const payeeObj = members.find(m => m.user_id === payeeId);
    const payeeName = payeeObj ? payeeObj.fullname : currentUser.fullname;

    try {
      const response = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: 1,
          member_id: payeeId,
          member_name: payeeName,
          amount,
          reason: payoutReason,
          requested_by_id: currentUser.user_id
        })
      });
      const data = await response.json();
      if (response.ok) {
        setPayoutAmount("");
        setPayoutReason("");
        setPayoutMemberId("");
        showToast("Payout request submitted. Initiated governance check.", "success");
        fetchData();
        setActiveTab("approvals");
      } else {
        showToast(data.error || "Request failed", "error");
      }
    } catch (err) {
      showToast("Network error requesting payout.", "error");
    }
  };

  // Co-sign / Approve Payout Request
  const handleApprovePayout = async (id: number) => {
    if (!currentUser) return;
    try {
      const response = await fetch(`/api/payouts/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approver_id: currentUser.user_id })
      });
      const data = await response.json();
      if (response.ok) {
        if (data.status === "Approved") {
          showToast("Payout completely approved and funds disbursed!", "success");
        } else {
          showToast("Co-signed payout. Awaiting additional signature.", "success");
        }
        fetchData();
      } else {
        showToast(data.error || "Error approving payout", "error");
      }
    } catch (err) {
      showToast("Network error approving payout.", "error");
    }
  };

  // Request AI Financial Audit
  const handleAiAudit = async () => {
    setAiLoading(true);
    setAiReport(null);
    try {
      const response = await fetch("/api/gemini/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (response.ok) {
        setAiReport(data.report);
        showToast("Independent AI audit report compiled successfully!", "success");
      } else {
        showToast("AI Audit failed to compile.", "error");
      }
    } catch (err) {
      showToast("Network error conducting audit.", "error");
    } finally {
      setAiLoading(false);
    }
  };

  const activeGroup = groups[0] || {
    group_name: "Chisipite Mukando Club",
    balance: 0.00,
    target_cycle_amount: 5000.00,
    meeting_frequency: "Weekly",
    description: "Harare Cooperative Savings & Credit Association."
  };

  // Totals calculations
  const totalContributionsVerified = transactions
    .filter(t => t.type === "Contribution")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDisbursedPayouts = Math.abs(
    transactions
      .filter(t => t.type === "Withdrawal")
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const pendingPayoutsCount = payouts.filter(p => p.status !== "Approved").length;
  const pendingContributions = contributions.filter(c => c.status === "Pending");

  return (
    <div id="app-root" className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md ${
              toast.type === "success" 
                ? "bg-zinc-900/95 border border-indigo-500/30 text-indigo-200" 
                : "bg-rose-950/95 border border-rose-500/30 text-rose-300"
            }`}
          >
            {toast.type === "success" ? <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            <span className="font-medium text-xs sm:text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!currentUser ? (
        // Authorization Page
        <div id="auth-container" className="flex-1 flex flex-col lg:flex-row min-h-screen bg-zinc-950">
          <div className="lg:w-1/2 bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 p-6 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-800">
            <div>
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                  <PiggyBank className="w-7 h-7 text-indigo-400" />
                </div>
                <span className="text-xl font-display font-bold text-indigo-400 tracking-wider uppercase">CoopFinance</span>
              </div>
              
              <div className="space-y-4 sm:space-y-6 mt-6 sm:mt-12">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-white leading-tight">
                  Modernizing <span className="text-indigo-400">Mukando</span> with absolute transparency.
                </h1>
                <p className="text-zinc-400 text-sm sm:text-lg max-w-lg leading-relaxed">
                  A mobile-first, role-based Sacco platform designed specifically to formalize traditional rotating savings groups in Harare. Track contributions, coordinate dual-leader approvals, and register new members.
                </p>
              </div>
            </div>

            <div className="mt-8 sm:mt-12 space-y-4 sm:space-y-6">
              <div className="p-4 sm:p-5 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 flex items-start gap-4">
                <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-medium text-sm sm:text-base">Prevent Absconding & Errors</h4>
                  <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">Multi-signature withdrawal triggers ensure no single official can touch co-op savings unilaterally.</p>
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 flex items-start gap-4">
                <Users className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-medium text-sm sm:text-base">Register & Manage Members</h4>
                  <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">Easily add new members directly into your Sacco cluster with phone numbers and assigned roles.</p>
                </div>
              </div>
            </div>

            <p className="text-zinc-500 text-xs mt-8 sm:mt-12">
              © 2026 Cooperative Finance & Contribution Transparency Platform. Harare, Zimbabwe.
            </p>
          </div>

          <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-zinc-950">
            <div className="w-full max-w-md space-y-6 sm:space-y-8">
              <div className="text-center lg:text-left">
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">Access the Co-op Portals</h2>
                <p className="text-zinc-400 text-xs sm:text-sm mt-2">Sign in using Sacco credentials or tap a user below to log in instantly.</p>
              </div>

              {authError && (
                <div className="p-4 bg-rose-950/50 border border-rose-500/30 text-rose-300 rounded-xl text-xs sm:text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Cooperative Email</label>
                  <input 
                    type="email" 
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    placeholder="e.g. chair@sacco.co.zw"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-indigo-500 focus:outline-none text-white text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Secret Code / Password</label>
                  <input 
                    type="password" 
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-indigo-500 focus:outline-none text-white text-sm transition"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <Lock className="w-4 h-4" />
                  Authenticate Session
                </button>
              </form>

              {/* Developer / Evaluator Quick Access Sandbox */}
              <div className="pt-6 border-t border-zinc-800">
                <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest text-center mb-4">Select Logged In User</h3>
                <div className="grid grid-cols-1 gap-2.5">
                  <button 
                    onClick={() => { handleQuickLogin("chair@sacco.co.zw"); }}
                    className="flex items-center justify-between p-3.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl transition group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                      <div>
                        <div className="text-sm font-semibold text-white">Ashley Tausi</div>
                        <div className="text-xs text-zinc-400">Chairperson • Primary Signatory</div>
                      </div>
                    </div>
                    <span className="text-xs text-indigo-400 font-mono group-hover:translate-x-1 transition flex items-center gap-1">Login <ChevronRight className="w-3 h-3" /></span>
                  </button>

                  <button 
                    onClick={() => { handleQuickLogin("treasurer@sacco.co.zw"); }}
                    className="flex items-center justify-between p-3.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl transition group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                      <div>
                        <div className="text-sm font-semibold text-white">Mr. Chikutsa</div>
                        <div className="text-xs text-zinc-400">Treasurer • Auditing & Verification</div>
                      </div>
                    </div>
                    <span className="text-xs text-indigo-400 font-mono group-hover:translate-x-1 transition flex items-center gap-1">Login <ChevronRight className="w-3 h-3" /></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Full Application Dashboard View
        <div className="flex-1 flex flex-col md:flex-row bg-zinc-950 text-zinc-100 min-h-screen">
          
          {/* Desktop Sidebar Navigation */}
          <aside className="hidden md:flex w-64 bg-zinc-900 border-r border-zinc-800 flex-col justify-between shrink-0 p-6">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                  <PiggyBank className="w-6 h-6 text-white" />
                </div>
                <span className="text-base font-display font-bold text-white tracking-widest uppercase">COOPFINANCE</span>
              </div>

              {/* Logged in User Status Box */}
              <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-800/80 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-indigo-600/15 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/20 shadow-inner">
                    {currentUser.fullname.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{currentUser.fullname}</h4>
                    <span className={`text-[10px] uppercase tracking-wider font-bold block ${
                      currentUser.role === "Chairperson" ? "text-purple-400" :
                      currentUser.role === "Treasurer" ? "text-indigo-400" : "text-emerald-400"
                    }`}>{currentUser.role}</span>
                  </div>
                </div>
              </div>

              {/* Desktop Navigation Links */}
              <nav className="space-y-1.5">
                <button 
                  onClick={() => setActiveTab("dashboard")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    activeTab === "dashboard" ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Overview
                </button>

                <button 
                  onClick={() => setActiveTab("contribute")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    activeTab === "contribute" ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Record Deposit / Payout
                </button>

                <button 
                  onClick={() => setActiveTab("members")}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition ${
                    activeTab === "members" ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4" />
                    Members
                  </div>
                  <span className="bg-zinc-800 text-zinc-300 font-mono text-[10px] px-2 py-0.5 rounded-full border border-zinc-700">
                    {members.length}
                  </span>
                </button>

                <button 
                  onClick={() => setActiveTab("ledger")}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition ${
                    activeTab === "ledger" ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4" />
                    Ledger Audit
                  </div>
                  {pendingContributions.length > 0 && currentUser.role === "Treasurer" && (
                    <span className="bg-amber-500 text-zinc-950 font-bold text-[10px] px-2 py-0.5 rounded-full">
                      {pendingContributions.length}
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => setActiveTab("approvals")}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition ${
                    activeTab === "approvals" ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4" />
                    Payout Approvals
                  </div>
                  {pendingPayoutsCount > 0 && (
                    <span className="bg-rose-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                      {pendingPayoutsCount}
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => setActiveTab("ai-auditor")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    activeTab === "ai-auditor" ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  AI Auditor
                  <span className="bg-indigo-500/20 text-indigo-300 font-semibold text-[9px] px-1.5 py-0.5 rounded border border-indigo-500/20 ml-auto shrink-0">Active</span>
                </button>
              </nav>
            </div>

            <div className="mt-8 space-y-2">
              <button 
                onClick={handleResetDatabase}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-amber-400 hover:bg-amber-500/10 rounded-xl transition border border-amber-500/20"
                title="Wipe database and start fresh with 0 balance"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Start Fresh (Reset DB)
              </button>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-500 hover:bg-rose-950/20 hover:text-rose-400 rounded-xl transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect Session
              </button>
            </div>
          </aside>

          {/* Main Workspace Frame */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24 md:pb-8">
            
            {/* Header Mobile & Desktop Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs text-indigo-400 font-mono tracking-widest uppercase">Harare Savings Cluster</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-semibold">Active Cycle</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-white mt-1">{activeGroup.group_name}</h1>
                </div>

                {/* Mobile logout/reset trigger */}
                <div className="flex items-center gap-2 md:hidden">
                  <button 
                    onClick={handleResetDatabase}
                    className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs"
                    title="Start Fresh"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl text-xs"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-xs font-semibold px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {activeGroup.meeting_frequency} Cycle
                </span>
                <button 
                  onClick={() => setShowAddMemberModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Member
                </button>
                <button 
                  onClick={fetchData}
                  className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl transition"
                  title="Force Sync"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tab 1: Overview Dashboard */}
            {activeTab === "dashboard" && (
              <div id="dashboard-tab" className="space-y-6">
                
                {/* Visual Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-zinc-900 p-5 sm:p-6 rounded-2xl sm:rounded-[32px] border border-zinc-800 relative overflow-hidden group shadow-lg">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:scale-125 transition duration-500" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Group Sacco Balance</span>
                      <PiggyBank className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-display font-bold text-white mt-3">${activeGroup.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
                      <span className="text-indigo-400 font-semibold">Target: ${activeGroup.target_cycle_amount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900 p-5 sm:p-6 rounded-2xl sm:rounded-[32px] border border-zinc-800 relative overflow-hidden group shadow-lg">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:scale-125 transition duration-500" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Verified Deposits</span>
                      <ArrowUpRight className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-display font-bold text-white mt-3">${totalContributionsVerified.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
                      <span>Total contributions recorded</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900 p-5 sm:p-6 rounded-2xl sm:rounded-[32px] border border-zinc-800 relative overflow-hidden group shadow-lg">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl group-hover:scale-125 transition duration-500" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Approved Disbursements</span>
                      <ArrowDownLeft className="w-5 h-5 text-rose-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-display font-bold text-white mt-3">${totalDisbursedPayouts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
                      <span>Withdrawn for member assistance</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900 p-5 sm:p-6 rounded-2xl sm:rounded-[32px] border border-zinc-800 relative overflow-hidden group shadow-lg">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:scale-125 transition duration-500" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Registered Members</span>
                      <Users className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-display font-bold text-white mt-3">{members.length}</div>
                    <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
                      <span className="text-indigo-400 font-semibold">{pendingContributions.length} pending deposits</span>
                    </div>
                  </div>
                </div>

                {/* Main Visual Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* SVG Chart or Empty State */}
                  <div className="lg:col-span-2 bg-zinc-900 p-5 sm:p-8 rounded-2xl sm:rounded-[32px] border border-zinc-800 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-white">Mukando Pool Balance Growth</h3>
                        <p className="text-zinc-400 text-xs mt-0.5">Real-time ledger progression for Chisipite Mukando</p>
                      </div>
                      <span className="text-xs text-indigo-400 font-semibold px-2.5 py-1 bg-indigo-500/10 rounded-xl border border-indigo-500/20">Audit-Ready</span>
                    </div>

                    {transactions.length === 0 ? (
                      <div className="h-56 bg-zinc-950/60 rounded-2xl border border-zinc-800/80 border-dashed flex flex-col items-center justify-center text-center p-6 space-y-3">
                        <div className="p-3 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                          <PiggyBank className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">Fresh Sacco Ledger Ready</h4>
                          <p className="text-xs text-zinc-400 mt-1 max-w-sm">No transactions posted yet. Start by adding new members or making your first deposit!</p>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <button 
                            onClick={() => setShowAddMemberModal(true)}
                            className="px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-500 transition"
                          >
                            + Add Members
                          </button>
                          <button 
                            onClick={() => setActiveTab("contribute")}
                            className="px-3.5 py-2 bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl hover:bg-zinc-700 transition border border-zinc-700"
                          >
                            Record Deposit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-56 sm:h-64 relative flex items-end">
                        <div className="absolute inset-x-0 top-0 border-b border-zinc-800/50" />
                        <div className="absolute inset-x-0 top-1/3 border-b border-zinc-800/50" />
                        <div className="absolute inset-x-0 top-2/3 border-b border-zinc-800/50" />
                        
                        <svg className="w-full h-full text-indigo-500 overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <path 
                             d="M0 200 Q 100 120 200 150 T 400 60 T 500 30 L 500 200 Z" 
                             fill="url(#gradient)" 
                          />
                          <path 
                             d="M0 200 Q 100 120 200 150 T 400 60 T 500 30" 
                             fill="none" 
                             stroke="#6366f1" 
                             strokeWidth="3.5" 
                             strokeLinecap="round"
                          />
                          <circle cx="100" cy="120" r="4.5" fill="#09090b" stroke="#6366f1" strokeWidth="2.5" />
                          <circle cx="200" cy="150" r="4.5" fill="#09090b" stroke="#6366f1" strokeWidth="2.5" />
                          <circle cx="400" cy="60" r="4.5" fill="#09090b" stroke="#6366f1" strokeWidth="2.5" />
                          <circle cx="500" cy="30" r="4.5" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
                        </svg>

                        <div className="absolute inset-x-0 -bottom-6 flex justify-between text-[10px] font-mono text-zinc-500 px-1">
                          <span>Start</span>
                          <span>Cycle Mid</span>
                          <span>Current</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Registered Members Widget */}
                  <div className="bg-zinc-900 p-5 sm:p-8 rounded-2xl sm:rounded-[32px] border border-zinc-800 shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-white">Sacco Members</h3>
                        <button 
                          onClick={() => setActiveTab("members")}
                          className="text-xs text-indigo-400 font-medium hover:underline"
                        >
                          View All ({members.length})
                        </button>
                      </div>

                      <div className="space-y-3 max-h-56 overflow-y-auto">
                        {members.map((m) => (
                          <div key={m.user_id} className="flex items-center justify-between p-2.5 hover:bg-zinc-800/40 rounded-xl transition">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-bold flex items-center justify-center">
                                {m.fullname.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-semibold text-white truncate max-w-[120px]">{m.fullname}</div>
                                <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[120px]">{m.phone}</div>
                              </div>
                            </div>
                            <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                              m.role === "Chairperson" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                              m.role === "Treasurer" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                              "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}>{m.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="mt-4 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-indigo-400 text-xs font-bold rounded-xl border border-zinc-700 transition flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add New Member
                    </button>
                  </div>
                </div>

                {/* SMS Alert / Log Panel */}
                <div className="bg-zinc-900 p-5 sm:p-8 rounded-2xl sm:rounded-[32px] border border-zinc-800 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-base font-bold text-white">Live SMS Transaction Ticker</h3>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">Auto-sent on deposit verification</span>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="text-xs text-zinc-500 font-mono py-6 text-center">No notifications generated yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-52 overflow-y-auto">
                      {notifications.slice().reverse().map((notif) => (
                        <div key={notif.id} className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 flex gap-3 text-xs">
                          <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full mt-1 animate-pulse shrink-0" />
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{notif.recipient} ({notif.contact})</span>
                              <span className="text-[9px] text-zinc-500 font-mono">{notif.timestamp}</span>
                            </div>
                            <p className="text-zinc-400 leading-relaxed font-mono text-[11px] break-words">{notif.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Add Member View */}
            {activeTab === "members" && (
              <div id="members-tab" className="space-y-6">
                <div className="bg-zinc-900 p-5 sm:p-8 rounded-2xl sm:rounded-[32px] border border-zinc-800 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
                    <div>
                      <h2 className="text-xl font-bold text-white">Mukando Sacco Members ({members.length})</h2>
                      <p className="text-xs text-zinc-400 mt-1">Register new co-op members, manage roles, and review contact phone numbers.</p>
                    </div>
                    <button 
                      onClick={() => setShowAddMemberModal(true)}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add New Member
                    </button>
                  </div>

                  {/* Members Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    {members.map((m) => (
                      <div key={m.user_id} className="p-5 bg-zinc-950 border border-zinc-800/80 rounded-2xl space-y-4 relative group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 font-bold text-sm flex items-center justify-center shadow-inner">
                              {m.fullname.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">{m.fullname}</h4>
                              <span className={`text-[10px] uppercase tracking-wider font-bold ${
                                m.role === "Chairperson" ? "text-purple-400" :
                                m.role === "Treasurer" ? "text-indigo-400" : "text-emerald-400"
                              }`}>{m.role}</span>
                            </div>
                          </div>
                          {currentUser.user_id === m.user_id && (
                            <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                              Active Session
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 text-xs text-zinc-400 pt-2 border-t border-zinc-900 font-mono">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="truncate">{m.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{m.phone}</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            setCurrentUser(m);
                            showToast(`Switched active user to ${m.fullname}`, "success");
                          }}
                          className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white font-medium text-xs rounded-xl border border-zinc-800 transition flex items-center justify-center gap-1.5"
                        >
                          <UserIcon className="w-3.5 h-3.5" />
                          Switch to this User
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Submit Deposits / Request Payout */}
            {activeTab === "contribute" && (
              <div id="contribute-tab" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Submit Contribution Deposit Form */}
                <div className="bg-zinc-900 p-6 sm:p-8 rounded-2xl sm:rounded-[32px] border border-zinc-800 space-y-6 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                      <PiggyBank className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Submit Contribution (Deposit)</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Submit your Sacco deposit. Requires verification by Treasurer.</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddContribution} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Contribution Amount (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm">$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={contribAmount}
                          onChange={(e) => setContribAmount(e.target.value)}
                          placeholder="e.g. 50.00"
                          className="w-full pl-8 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none font-mono transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Payment Method</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: "EcoCash", desc: "Mobile Wallet" },
                          { value: "Bank Transfer", desc: "EFT / Zipit" },
                          { value: "Cash", desc: "Physical Note" }
                        ].map((method) => (
                          <button
                            key={method.value}
                            type="button"
                            onClick={() => setContribMethod(method.value as any)}
                            className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                              contribMethod === method.value 
                                ? "bg-indigo-500/10 border-indigo-500 text-indigo-400" 
                                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                            }`}
                          >
                            <span className="text-xs font-semibold">{method.value}</span>
                            <span className="text-[8px] opacity-75">{method.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800 flex items-start gap-3">
                      <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-zinc-400 text-xs leading-relaxed font-sans">
                        Submitting this records it to the transparent audit ledger immediately as <span className="text-amber-400 font-bold">Pending</span>. The Treasurer will verify receipt on their physical Sacco ledger before releasing to the main co-op pool.
                      </p>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      <Send className="w-4 h-4" />
                      Submit to Audit Ledger
                    </button>
                  </form>
                </div>

                {/* Request Payout / Withdrawal Form */}
                <div className="bg-zinc-900 p-6 sm:p-8 rounded-2xl sm:rounded-[32px] border border-zinc-800 space-y-6 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                      <ArrowDownLeft className="w-6 h-6 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Request Payout Distribution</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Initiate a disbursement payout for a co-op member.</p>
                    </div>
                  </div>

                  <form onSubmit={handleRequestPayout} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Disbursement Recipient</label>
                      <select
                        value={payoutMemberId}
                        onChange={(e) => setPayoutMemberId(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition"
                      >
                        <option value="">Select Recipient Member</option>
                        {members.map((m) => (
                          <option key={m.user_id} value={m.user_id}>{m.fullname} ({m.role})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Payout Amount (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm">$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          required
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(e.target.value)}
                          placeholder="e.g. 150.00"
                          className="w-full pl-8 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none font-mono transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Justification / Reason</label>
                      <textarea 
                        rows={3}
                        required
                        value={payoutReason}
                        onChange={(e) => setPayoutReason(e.target.value)}
                        placeholder="e.g. School fees payment, micro-retail inventory restock, medical assistance"
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none resize-none transition"
                      />
                    </div>

                    <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800 flex items-start gap-3">
                      <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-zinc-400 text-xs leading-relaxed font-sans">
                        Governance Rule: Payouts require double-approvals. At least 2 distinct officials must approve before funds are disbursed.
                      </p>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 border border-zinc-700 shadow-lg"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Initiate Payout Check
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Tab 4: Ledger Audit / Verification */}
            {activeTab === "ledger" && (
              <div id="ledger-tab" className="space-y-6">
                
                {/* Pending Contributions Verification Area */}
                {currentUser.role === "Treasurer" && pendingContributions.length > 0 && (
                  <div className="p-5 sm:p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl sm:rounded-[32px] space-y-4">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <h3 className="text-sm font-bold text-amber-400">Treasurer Action Required: Pending Verifications</h3>
                        <p className="text-xs text-zinc-400">Members submitted deposits via EcoCash/Bank. Click Verify once funds are physically cleared.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pendingContributions.map((contrib) => (
                        <div key={contrib.contribution_id} className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl flex justify-between items-center gap-4">
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500">Deposit Requested</span>
                            <h4 className="text-sm font-semibold text-white mt-0.5">{contrib.member_name}</h4>
                            <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                              <span className="font-mono text-amber-400 font-bold">${contrib.amount}</span>
                              <span>•</span>
                              <span>{contrib.payment_method}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleApproveContribution(contrib.contribution_id)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-xl transition shadow-md"
                          >
                            Verify & Post
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ledger Log */}
                <div className="bg-zinc-900 p-5 sm:p-8 rounded-2xl sm:rounded-[32px] border border-zinc-800 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-base font-bold text-white">Transparent Transaction Ledger</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Immutable audit log of all validated co-op activity</p>
                    </div>
                  </div>

                  {transactions.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 font-mono text-xs">
                      No posted transactions in the ledger yet. Submit and verify deposits to build your transaction record.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-zinc-300">
                        <thead className="bg-zinc-950 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                          <tr>
                            <th className="p-3 sm:p-4 rounded-l-2xl">ID</th>
                            <th className="p-3 sm:p-4">Type</th>
                            <th className="p-3 sm:p-4">Member Name</th>
                            <th className="p-3 sm:p-4">Amount</th>
                            <th className="p-3 sm:p-4">Date</th>
                            <th className="p-3 sm:p-4">Status</th>
                            <th className="p-3 sm:p-4 rounded-r-2xl">Accumulated Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          {transactions.slice().reverse().map((tx) => (
                            <tr key={tx.transaction_id} className="hover:bg-zinc-800/30 transition">
                              <td className="p-3 sm:p-4 font-mono text-xs">#{tx.transaction_id}</td>
                              <td className="p-3 sm:p-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  tx.type === "Contribution" 
                                    ? "bg-indigo-500/10 text-indigo-400" 
                                    : "bg-rose-500/10 text-rose-400"
                                }`}>
                                  {tx.type === "Contribution" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                                  {tx.type}
                                </span>
                              </td>
                              <td className="p-3 sm:p-4 font-medium text-white">{tx.member_name}</td>
                              <td className={`p-3 sm:p-4 font-mono font-bold ${tx.amount > 0 ? "text-indigo-400" : "text-rose-400"}`}>
                                {tx.amount > 0 ? `+$${tx.amount}` : `-$${Math.abs(tx.amount)}`}
                              </td>
                              <td className="p-3 sm:p-4 text-zinc-400 font-mono text-xs">{tx.date}</td>
                              <td className="p-3 sm:p-4">
                                <span className="inline-flex items-center gap-1 text-indigo-400 text-xs font-medium">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Posted
                                </span>
                              </td>
                              <td className="p-3 sm:p-4 font-mono text-white">${tx.balance_after.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 5: Governance & Payout Approvals */}
            {activeTab === "approvals" && (
              <div id="approvals-tab" className="space-y-6">
                <div className="bg-zinc-900 p-5 sm:p-8 rounded-2xl sm:rounded-[32px] border border-zinc-800 shadow-lg">
                  <div>
                    <h3 className="text-base font-bold text-white">Dual-Leader Payout Co-Signatures</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Enforcing shared governance to guarantee co-op balance integrity</p>
                  </div>

                  <div className="mt-6 space-y-4">
                    {payouts.length === 0 ? (
                      <p className="text-zinc-500 text-sm py-8 text-center font-mono">No payout requests registered.</p>
                    ) : (
                      payouts.slice().reverse().map((payout) => {
                        const isApprovedByCurrent = payout.approvals.includes(currentUser.user_id);
                        const canApprove = (currentUser.role === "Chairperson" || currentUser.role === "Treasurer") && !isApprovedByCurrent && payout.status !== "Approved";
                        
                        return (
                          <div key={payout.payout_id} className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <span className="text-[10px] font-mono uppercase bg-zinc-800 px-2.5 py-1 rounded-xl text-zinc-400 tracking-wider">Request #{payout.payout_id}</span>
                                <h4 className="text-base font-bold text-white mt-2">{payout.member_name}</h4>
                                <p className="text-zinc-400 text-xs leading-relaxed mt-1 italic">Reason: "{payout.reason}"</p>
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-zinc-500 font-mono block">Requested Amount</span>
                                <span className="text-2xl font-display font-black text-rose-400 font-mono">${payout.amount}</span>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-850">
                              <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1">
                                  <span className="text-zinc-400">Status:</span>
                                  <span className={`font-semibold ${payout.status === 'Approved' ? 'text-indigo-400' : 'text-amber-400'}`}>{payout.status}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-zinc-400">Cosignatures:</span>
                                  <div className="flex items-center gap-1">
                                    <span className={`w-2.5 h-2.5 rounded-full ${payout.approvals.includes(1) ? 'bg-indigo-400' : 'bg-zinc-700'}`} title="Ashley Tausi (Chairperson)" />
                                    <span className={`w-2.5 h-2.5 rounded-full ${payout.approvals.includes(2) ? 'bg-indigo-400' : 'bg-zinc-700'}`} title="Mr. Chikutsa (Treasurer)" />
                                    <span className="text-[10px] text-zinc-500 font-mono">({payout.approvals.length}/2)</span>
                                  </div>
                                </div>
                              </div>

                              {canApprove ? (
                                <button
                                  onClick={() => handleApprovePayout(payout.payout_id)}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                  Co-Sign Request
                                </button>
                              ) : payout.status === "Approved" ? (
                                <span className="text-xs text-indigo-400 font-bold flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4" /> Fully Disbursed
                                </span>
                              ) : (
                                <span className="text-xs text-zinc-500 italic">Signed (Awaiting Co-signers)</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 6: AI Auditor */}
            {activeTab === "ai-auditor" && (
              <div id="ai-auditor-tab" className="space-y-6">
                
                {/* AI Executive Card */}
                <div className="bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-900 p-6 sm:p-8 rounded-2xl sm:rounded-[32px] border border-indigo-500/20 relative overflow-hidden shadow-lg">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="max-w-2xl space-y-4 sm:space-y-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-400/10 text-indigo-400 rounded-xl text-xs font-semibold border border-indigo-400/20">
                      <Sparkles className="w-3.5 h-3.5" />
                      Gemini Co-op Auditor
                    </div>

                    <h2 className="text-xl sm:text-2xl font-display font-bold text-white">Independent AI Financial Auditor & Advisor</h2>
                    <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                      Automatically reviews the Sacco transaction ledger, flags audit inconsistencies, verifies that dual-approval rules were respected, and builds customized advisory reviews.
                    </p>

                    <button
                      onClick={handleAiAudit}
                      disabled={aiLoading}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-xl text-xs sm:text-sm transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      <Bot className="w-4.5 h-4.5" />
                      {aiLoading ? "Reviewing Ledger Logs..." : "Initiate AI Audit Review"}
                    </button>
                  </div>
                </div>

                {/* Audit Results */}
                {aiLoading && (
                  <div className="p-8 sm:p-12 bg-zinc-900 rounded-2xl sm:rounded-[32px] border border-zinc-800 flex flex-col items-center justify-center text-center space-y-4 shadow-lg">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <div>
                      <h4 className="text-sm font-semibold text-white animate-pulse">Analyzing Harare Co-op Database Integrity</h4>
                      <p className="text-xs text-zinc-500 mt-1">Reading transaction blocks, testing multi-signature conditions...</p>
                    </div>
                  </div>
                )}

                {aiReport && !aiLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 sm:p-8 bg-zinc-900 rounded-2xl sm:rounded-[32px] border border-zinc-800 space-y-4 shadow-lg"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-sm font-bold text-white">Independent Compliance & Savings Audit</h3>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">Certified by Gemini AI</span>
                    </div>

                    <div className="text-zinc-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line space-y-2 font-sans">
                      {aiReport}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </main>

          {/* Fixed Mobile Bottom Navigation Bar */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 border-t border-zinc-800 backdrop-blur-xl px-2 py-2 flex justify-around items-center">
            <button 
              onClick={() => setActiveTab("dashboard")}
              className={`flex flex-col items-center gap-1 p-2 min-w-[50px] transition ${
                activeTab === "dashboard" ? "text-indigo-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Activity className="w-5 h-5" />
              <span className="text-[10px]">Overview</span>
            </button>

            <button 
              onClick={() => setActiveTab("contribute")}
              className={`flex flex-col items-center gap-1 p-2 min-w-[50px] transition ${
                activeTab === "contribute" ? "text-indigo-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <PlusCircle className="w-5 h-5" />
              <span className="text-[10px]">Deposit</span>
            </button>

            <button 
              onClick={() => setActiveTab("members")}
              className={`flex flex-col items-center gap-1 p-2 min-w-[50px] transition relative ${
                activeTab === "members" ? "text-indigo-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px]">Members</span>
            </button>

            <button 
              onClick={() => setActiveTab("ledger")}
              className={`flex flex-col items-center gap-1 p-2 min-w-[50px] transition relative ${
                activeTab === "ledger" ? "text-indigo-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-[10px]">Ledger</span>
              {pendingContributions.length > 0 && currentUser.role === "Treasurer" && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>

            <button 
              onClick={() => setActiveTab("approvals")}
              className={`flex flex-col items-center gap-1 p-2 min-w-[50px] transition relative ${
                activeTab === "approvals" ? "text-indigo-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px]">Approvals</span>
              {pendingPayoutsCount > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>

            <button 
              onClick={() => setActiveTab("ai-auditor")}
              className={`flex flex-col items-center gap-1 p-2 min-w-[50px] transition ${
                activeTab === "ai-auditor" ? "text-indigo-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Bot className="w-5 h-5" />
              <span className="text-[10px]">AI Audit</span>
            </button>
          </nav>

          {/* Modal for Registering a New Member */}
          <AnimatePresence>
            {showAddMemberModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-3xl w-full max-w-md space-y-6 shadow-2xl relative"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <UserPlus className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Register New Member</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">Add a new member to Chisipite Mukando</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowAddMemberModal(false)}
                      className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleAddMember} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Full Name</label>
                      <input 
                        type="text"
                        required
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="e.g. Memory Chidza"
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Email Address</label>
                      <input 
                        type="email"
                        required
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        placeholder="e.g. memory@sacco.co.zw"
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Mobile Phone (EcoCash/SMS)</label>
                      <input 
                        type="tel"
                        value={newMemberPhone}
                        onChange={(e) => setNewMemberPhone(e.target.value)}
                        placeholder="e.g. +263 77 999 0000"
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none font-mono transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Assigned Role</label>
                      <select 
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value as any)}
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition"
                      >
                        <option value="Member">Member (Standard Depositor)</option>
                        <option value="Treasurer">Treasurer (Audit & Verification)</option>
                        <option value="Chairperson">Chairperson (Primary Signatory)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Default Password</label>
                      <input 
                        type="text"
                        value={newMemberPassword}
                        onChange={(e) => setNewMemberPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none font-mono transition"
                      />
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setShowAddMemberModal(false)}
                        className="w-1/2 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="w-1/2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="w-4 h-4" />
                        Save Member
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}
    </div>
  );
}
