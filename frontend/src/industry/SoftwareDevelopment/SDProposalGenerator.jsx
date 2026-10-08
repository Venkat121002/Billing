import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config/api";
import toast from "react-hot-toast";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import {
  Sparkles,
  Bot,
  Send,
  CheckCircle2,
  Calendar,
  Layers,
  Code2,
  Server,
  Cloud,
  ArrowRight,
  Loader2,
  Copy,
  Check,
  Receipt,
  Users,
  ChevronRight,
  FileText
} from "lucide-react";

const PRESET_PROMPTS = [
  {
    title: "SaaS Multi-Tenant MVP",
    prompt: "Build a multi-tenant B2B SaaS web application with Next.js, Stripe subscriptions, role-based access control, and PostgreSQL.",
    budget: 85000,
    weeks: 6,
    category: "Web Development"
  },
  {
    title: "Cross-Platform Mobile App",
    prompt: "Create a cross-platform mobile app using React Native, real-time push notifications, offline cache, and REST APIs.",
    budget: 95000,
    weeks: 8,
    category: "Mobile Development"
  },
  {
    title: "DevOps & Cloud Migration",
    prompt: "Migrate existing monolithic Node.js backend to Docker microservices on AWS ECS, setup GitHub Actions CI/CD and monitoring.",
    budget: 60000,
    weeks: 4,
    category: "DevOps"
  },
  {
    title: "Custom AI & ML Integration",
    prompt: "Integrate custom AI assistant with vector search (RAG), document indexing, Python FastAPI backend, and React dashboard.",
    budget: 120000,
    weeks: 8,
    category: "AI & Data Science"
  }
];

export default function SDProposalGenerator() {
  const navigate = useNavigate();

  // Form states
  const [prompt, setPrompt] = useState("");
  const [clientName, setClientName] = useState("");
  const [budget, setBudget] = useState(75000);
  const [timelineWeeks, setTimelineWeeks] = useState(6);
  const [category, setCategory] = useState("Web Development");
  const [clientEmail, setClientEmail] = useState("");
  const [clientMobile, setClientMobile] = useState("");

  // UI & Response states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [copied, setCopied] = useState(false);
  const [deploymentSuccess, setDeploymentSuccess] = useState(null);

  // Client update generator modal state
  const [clientUpdateDraft, setClientUpdateDraft] = useState("");
  const [isDraftingUpdate, setIsDraftingUpdate] = useState(false);

  const applyPreset = (preset) => {
    setPrompt(preset.prompt);
    setBudget(preset.budget);
    setTimelineWeeks(preset.weeks);
    setCategory(preset.category);
  };

  // Phase 1: Generate AI Proposal
  const handleGenerateProposal = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) {
      toast.error("Please enter project requirements or choose a preset.");
      return;
    }

    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication required. Please login.");
      return;
    }

    setIsGenerating(true);
    setProposal(null);
    setDeploymentSuccess(null);

    try {
      const res = await axios.post(
        `${API_URL}/software/generate-proposal`,
        {
          prompt,
          clientName: clientName.trim() || "Valued Client",
          budget: Number(budget) || 50000,
          timelineWeeks: Number(timelineWeeks) || 4,
          category
        },
        {
          headers: {
            "x-auth-token": token,
            Authorization: `Bearer ${token}`
          },
          timeout: 25000
        }
      );

      if (res.data && res.data.success && res.data.proposal) {
        setProposal(res.data.proposal);
        toast.success("AI project scope & milestones generated!");
      } else {
        toast.error("Could not generate proposal. Please try again.");
      }
    } catch (err) {
      console.error("Proposal error:", err);
      toast.error(err.response?.data?.msg || "Failed to generate proposal.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Phase 2: Convert to Client & Milestones in Database
  const handleDeployProject = async () => {
    if (!proposal) return;

    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication required.");
      return;
    }

    setIsDeploying(true);

    try {
      const res = await axios.post(
        `${API_URL}/software/convert-proposal`,
        {
          proposal,
          clientEmail,
          clientMobile,
          companyName: clientName.trim() || proposal.clientName
        },
        {
          headers: {
            "x-auth-token": token,
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (res.data && res.data.success) {
        setDeploymentSuccess(res.data);
        toast.success(res.data.msg || "Project & milestones created successfully!");
      }
    } catch (err) {
      console.error("Deploy error:", err);
      toast.error(err.response?.data?.msg || "Failed to deploy project.");
    } finally {
      setIsDeploying(false);
    }
  };

  // Phase 4: Draft Weekly Progress Update
  const handleDraftWeeklyUpdate = async () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) return;

    setIsDraftingUpdate(true);
    try {
      const res = await axios.post(
        `${API_URL}/software/draft-client-update`,
        {
          clientName: clientName.trim() || proposal?.clientName || "Client",
          weekNumber: 1
        },
        {
          headers: {
            "x-auth-token": token,
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (res.data && res.data.success && res.data.draft) {
        setClientUpdateDraft(res.data.draft);
        toast.success("Weekly progress update drafted!");
      }
    } catch (err) {
      toast.error("Failed to draft update.");
    } finally {
      setIsDraftingUpdate(false);
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <BillingLayout>
      <div className="min-h-screen bg-slate-50/50 -m-4 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200/60">
                <Sparkles className="w-3.5 h-3.5" />
                AI Agency Automation Engine • 500+ User High Concurrency
              </div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                AI Project Scoper & Proposal Generator
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Transform client briefs into technical architectures, sprint milestones, rate estimations, and 1-click contracts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/milestones")}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Layers className="w-4 h-4 text-emerald-600" />
                View Milestones
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Requirements Input & Presets */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-600" />
                Project Parameters
              </h2>

              <form onSubmit={handleGenerateProposal} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Client or Company Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Acme Corp, John Doe"
                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Client Requirements / Project Brief <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what the client wants built: features, technologies, user roles, integrations..."
                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Target Budget (₹)
                    </label>
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Timeline (Weeks)
                    </label>
                    <input
                      type="number"
                      value={timelineWeeks}
                      onChange={(e) => setTimelineWeeks(e.target.value)}
                      className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile Development">Mobile Development</option>
                    <option value="DevOps">DevOps & Cloud</option>
                    <option value="AI & Data Science">AI & Data Science</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing Requirements & Sprints...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate AI Project Scope
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Quick Inspiration Presets */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Quick Project Templates
              </h3>
              <div className="space-y-2.5">
                {PRESET_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-emerald-500/50 hover:bg-emerald-50/40 transition-all group"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-900 mb-1">
                      <span>{p.title}</span>
                      <span className="text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                        ₹{p.budget.toLocaleString("en-IN")} • {p.weeks}w
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                      {p.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: AI Generated Output & Actions */}
          <div className="lg:col-span-7 space-y-6">
            {!proposal && !isGenerating && (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 shadow-sm border border-emerald-100">
                  <Bot className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Ready to Automate Your Software Scoping
                </h3>
                <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">
                  Enter your client requirements or pick a template on the left. SwordNex AI will instantly break it down into architecture, sprint deliverables, and milestone payment schedules.
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                  <span>⚡ Sub-10ms Cache</span>
                  <span>•</span>
                  <span>🔒 Multi-Tenant Isolated</span>
                  <span>•</span>
                  <span>🧾 18% GST Compliance</span>
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  Architecting Project Solution...
                </h3>
                <p className="text-xs text-gray-500 max-w-sm">
                  Grounding against your store's tech leads, estimating sprint effort, and building milestone payment tiers.
                </p>
              </div>
            )}

            {proposal && (
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                {/* Proposal Header Banner */}
                <div className="bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 text-white p-6 sm:p-7 relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        {proposal.projectCategory || "Custom Development"}
                      </span>
                      <span className="text-xs text-emerald-300/80">
                        Lead: {proposal.assignedLead || "Assigned Architect"}
                      </span>
                    </div>

                    <h2 className="text-2xl font-extrabold text-white mb-2">
                      {proposal.projectName}
                    </h2>

                    <p className="text-xs text-emerald-100/80 leading-relaxed max-w-2xl">
                      {proposal.executiveSummary}
                    </p>

                    <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-emerald-200">
                      <div>
                        <span className="text-white/60 block text-[10px] uppercase">Total Scope</span>
                        <span className="text-lg font-bold text-white">
                          ₹{Number(proposal.totalBudget || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/60 block text-[10px] uppercase">Delivery Target</span>
                        <span className="text-lg font-bold text-white">
                          {proposal.timelineWeeks} Weeks
                        </span>
                      </div>
                      <div>
                        <span className="text-white/60 block text-[10px] uppercase">Phases / Milestones</span>
                        <span className="text-lg font-bold text-white">
                          {proposal.milestones?.length || 0} Sprints
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Tech Stack Matrix */}
                  {proposal.techStack && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                        Recommended Architecture & Stack
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1">
                            <Code2 className="w-3 h-3 text-emerald-600" /> Frontend
                          </span>
                          <p className="text-xs font-semibold text-gray-800 line-clamp-2">
                            {proposal.techStack.frontend || "React.js"}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1">
                            <Server className="w-3 h-3 text-emerald-600" /> Backend
                          </span>
                          <p className="text-xs font-semibold text-gray-800 line-clamp-2">
                            {proposal.techStack.backend || "Node.js Express"}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1">
                            <Layers className="w-3 h-3 text-emerald-600" /> Database
                          </span>
                          <p className="text-xs font-semibold text-gray-800 line-clamp-2">
                            {proposal.techStack.database || "PostgreSQL"}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1">
                            <Cloud className="w-3 h-3 text-emerald-600" /> Cloud & CI/CD
                          </span>
                          <p className="text-xs font-semibold text-gray-800 line-clamp-2">
                            {proposal.techStack.cloud || "Docker & AWS"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Milestones Schedule */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Milestone Payment Schedule
                      </h4>
                      <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                        18% GST Applicable (SAC: 998314)
                      </span>
                    </div>

                    <div className="space-y-3">
                      {proposal.milestones?.map((m, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-gray-200 hover:border-emerald-300 transition-all bg-white shadow-sm"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                                {m.phase || idx + 1}
                              </span>
                              <h5 className="font-bold text-sm text-gray-900">
                                {m.title}
                              </h5>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                Day {m.dueDays || (idx + 1) * 7}
                              </span>
                              <span className="text-sm font-extrabold text-emerald-700">
                                ₹{Number(m.amount || 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                            {m.description}
                          </p>

                          {m.deliverables && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {m.deliverables.map((d, dIdx) => (
                                <span
                                  key={dIdx}
                                  className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                                >
                                  ✓ {d}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deployment Actions */}
                  {deploymentSuccess ? (
                    <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        <div>
                          <h4 className="font-bold text-sm">
                            Project & Milestones Deployed Successfully!
                          </h4>
                          <p className="text-xs text-emerald-700">
                            Client registered and {deploymentSuccess.milestones?.length || 0} active milestones created in your database.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <button
                          onClick={() => navigate("/milestones")}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                        >
                          Go to Milestones Management <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleDraftWeeklyUpdate}
                          disabled={isDraftingUpdate}
                          className="px-4 py-2 bg-white border border-emerald-300 hover:bg-emerald-100/50 text-emerald-800 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          {isDraftingUpdate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                          Draft Weekly Client Update
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">
                            Phase 2: One-Click Project Deployment
                          </h4>
                          <p className="text-xs text-gray-500">
                            Automatically saves this client profile and all {proposal.milestones?.length || 0} milestones into your live database.
                          </p>
                        </div>
                        <button
                          onClick={handleDeployProject}
                          disabled={isDeploying}
                          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
                        >
                          {isDeploying ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Creating Records...
                            </>
                          ) : (
                            <>
                              <ArrowRight className="w-4 h-4" />
                              Deploy Project & Milestones
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                            Client Email (Optional)
                          </label>
                          <input
                            type="email"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            placeholder="client@company.com"
                            className="w-full text-xs bg-white border border-gray-200 rounded-lg px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                            Client Mobile (For WhatsApp Invoices)
                          </label>
                          <input
                            type="text"
                            value={clientMobile}
                            onChange={(e) => setClientMobile(e.target.value)}
                            placeholder="e.g. +91 9876543210"
                            className="w-full text-xs bg-white border border-gray-200 rounded-lg px-3 py-2"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Client Update Preview Modal / Box */}
                  {clientUpdateDraft && (
                    <div className="mt-4 p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          Phase 4: Client Weekly Status Update (AI Draft)
                        </h4>
                        <button
                          onClick={() => handleCopyText(clientUpdateDraft)}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? "Copied" : "Copy Draft"}
                        </button>
                      </div>
                      <pre className="text-xs text-gray-700 bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                        {clientUpdateDraft}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </BillingLayout>
  );
}
