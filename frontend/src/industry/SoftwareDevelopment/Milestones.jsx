import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import API_URL from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import toast from "react-hot-toast";
import {
  Search,
  Milestone as MilestoneIcon,
  Trash2,
  X,
  PlusCircle,
  Briefcase,
  Calendar,
  FileText,
} from "lucide-react";

const STATUS_OPTIONS = ["Not Started", "In Progress", "Completed", "Blocked"];

const STATUS_STYLES = {
  "Not Started": "bg-gray-100 text-gray-600",
  "In Progress": "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Blocked: "bg-red-100 text-red-700",
};

const emptyForm = {
  clientId: "",
  clientName: "",
  title: "",
  description: "",
  dueDate: "",
  status: "Not Started",
  amount: "",
};

const Milestones = () => {
  const { currentUser } = useAuth();

  const [milestones, setMilestones] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMilestone, setViewMilestone] = useState(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [clientSearchTerm, setClientSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    if (!token || !currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { "x-auth-token": token } };
      const [milestonesRes, clientsRes] = await Promise.all([
        axios.get(`${API_URL}/milestones`, config),
        axios.get(`${API_URL}/clients`, config),
      ]);
      setMilestones(Array.isArray(milestonesRes.data) ? milestonesRes.data : []);
      setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
    } catch (err) {
      console.error("Failed to fetch milestones:", err);
      toast.error("Could not fetch milestones.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditMilestone = (milestone) => {
    setEditingMilestoneId(milestone.id);
    setFormData({
      clientId: milestone.clientId || "",
      clientName: milestone.clientName || "",
      title: milestone.title || "",
      description: milestone.description || "",
      dueDate: milestone.dueDate || "",
      status: milestone.status || "Not Started",
      amount: milestone.amount || "",
    });
    setClientSearchTerm("");
    setIsModalOpen(true);
  };

  const handleDeleteMilestone = async (id) => {
    if (!window.confirm("Are you sure you want to delete this milestone?")) return;
    const token = sessionStorage.getItem("token");
    try {
      await axios.delete(`${API_URL}/milestones/${id}`, {
        headers: { "x-auth-token": token },
      });
      setMilestones(milestones.filter((m) => m.id !== id));
      toast.success("Milestone deleted successfully!");
    } catch (err) {
      console.error("Delete milestone error:", err);
      toast.error("Failed to delete milestone");
    }
  };

  const handleSelectClient = (client) => {
    setFormData({
      ...formData,
      clientId: client.id,
      clientName: client.name || "",
    });
    setClientSearchTerm("");
  };

  const handleSaveMilestone = async (e) => {
    e.preventDefault();
    if (!formData.clientId) {
      toast.error("Please select a client");
      return;
    }
    const token = sessionStorage.getItem("token");
    const payload = {
      ...formData,
      amount: Number(formData.amount) || 0,
    };
    try {
      if (editingMilestoneId) {
        await axios.put(`${API_URL}/milestones/${editingMilestoneId}`, payload, {
          headers: { "x-auth-token": token },
        });
        toast.success("Milestone updated successfully!");
      } else {
        await axios.post(`${API_URL}/milestones`, payload, {
          headers: { "x-auth-token": token },
        });
        toast.success("Milestone added successfully!");
      }
      setIsModalOpen(false);
      setFormData(emptyForm);
      setEditingMilestoneId(null);
      fetchData();
    } catch (err) {
      console.error("Save milestone error:", err);
      toast.error("Failed to save milestone");
    }
  };

  const filteredClients = useMemo(() => {
    const term = clientSearchTerm.trim().toLowerCase();
    if (!term) return [];
    return clients
      .filter(
        (c) =>
          (c.name || "").toLowerCase().includes(term) ||
          (c.projectName || "").toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [clients, clientSearchTerm]);

  const filteredMilestones = milestones.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      (m.title || "").toLowerCase().includes(term) ||
      (m.clientName || "").toLowerCase().includes(term) ||
      (m.status || "").toLowerCase().includes(term)
    );
  });

  const tdClass = "px-5 py-4 text-sm text-gray-700 whitespace-nowrap";
  const iconBtnClass = "p-2 rounded-lg transition-colors";

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-indigo-50/20 -m-4 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Milestones
              </h1>
              <p className="mt-1 text-gray-500 font-medium">
                Track project milestones and billing status per client.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingMilestoneId(null);
                setFormData(emptyForm);
                setClientSearchTerm("");
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 hover:shadow-xl hover:bg-blue-700 transition-all font-semibold text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              New Milestone
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by title, client or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading milestones...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                  <tr>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Milestone</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Client</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount (₹)</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMilestones.length > 0 ? (
                    filteredMilestones.map((m, i) => (
                      <tr key={m.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-50">
                        <td className={tdClass}>
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                            {i + 1}
                          </span>
                        </td>
                        <td className={`${tdClass} font-semibold text-gray-900`}>
                          <div className="flex items-center gap-2">
                            <MilestoneIcon size={16} className="text-blue-500" />
                            {m.title}
                          </div>
                        </td>
                        <td className={tdClass}>{m.clientName || "—"}</td>
                        <td className={tdClass}>{m.dueDate || "—"}</td>
                        <td className={`${tdClass} font-semibold text-blue-700`}>
                          ₹{Number(m.amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className={tdClass}>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[m.status] || "bg-gray-100 text-gray-600"}`}>
                            {m.status || "Not Started"}
                          </span>
                        </td>
                        <td className={tdClass}>
                          <div className="flex items-center gap-2">
                            <button title="View" onClick={() => setViewMilestone(m)} className={`${iconBtnClass} text-gray-500 hover:bg-gray-100`}>
                              <Search size={16} />
                            </button>
                            <button title="Edit" onClick={() => handleEditMilestone(m)} className={`${iconBtnClass} text-blue-600 hover:bg-blue-50`}>
                              <FileText size={16} />
                            </button>
                            <button title="Delete" onClick={() => handleDeleteMilestone(m.id)} className={`${iconBtnClass} text-red-600 hover:bg-red-50`}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-16 text-gray-400">
                        No milestones found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* View Milestone Modal */}
        {viewMilestone && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
              <button
                onClick={() => setViewMilestone(null)}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
              >
                <X size={24} />
              </button>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 border-b border-blue-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-blue-600 border border-blue-100">
                    <MilestoneIcon size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{viewMilestone.title}</h2>
                    <p className="text-blue-700 font-medium">{viewMilestone.clientName || "No client linked"}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[viewMilestone.status] || "bg-gray-100 text-gray-600"}`}>
                  {viewMilestone.status || "Not Started"}
                </span>
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Due Date</p>
                    <p className="text-gray-700 font-medium flex items-center gap-2">
                      <Calendar size={14} className="text-blue-500" />
                      {viewMilestone.dueDate || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount</p>
                    <p className="text-gray-700 font-medium">₹{Number(viewMilestone.amount || 0).toLocaleString("en-IN")}</p>
                  </div>
                </div>

                <div className="space-y-1 border-t border-gray-50 pt-6">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</p>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 italic">
                    {viewMilestone.description || "No description provided."}
                  </p>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setViewMilestone(null)}
                  className="px-8 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all text-sm uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Milestone Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50 overflow-y-auto custom-scrollbar">
            <div className="bg-white rounded-3xl w-full max-w-2xl p-8 animate-fade-in relative my-8 shadow-2xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm">
                  {editingMilestoneId ? <FileText size={28} /> : <PlusCircle size={28} />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingMilestoneId ? "Edit Milestone" : "New Milestone"}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Fill in the details below to save the milestone
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveMilestone} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-blue-800 uppercase tracking-widest">
                    <Briefcase size={14} className="text-blue-500" />
                    Client
                    <span className="text-red-400 text-xs">*</span>
                  </label>
                  {formData.clientId ? (
                    <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl border border-blue-100 bg-blue-50/50">
                      <p className="font-semibold text-gray-900">{formData.clientName}</p>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, clientId: "", clientName: "" })}
                        className="text-xs font-bold text-blue-700 hover:text-blue-900 uppercase tracking-wider"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        placeholder="Search client by name or project..."
                        className="w-full px-4 py-3.5 rounded-2xl border border-blue-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900"
                      />
                      {filteredClients.length > 0 && (
                        <div className="absolute z-10 mt-2 w-full bg-white border border-blue-100 rounded-2xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                          {filteredClients.map((c) => (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => handleSelectClient(c)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                            >
                              <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                              <p className="text-xs text-gray-500">{c.projectName || "—"}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-blue-800 uppercase tracking-widest">
                    <MilestoneIcon size={14} className="text-blue-500" />
                    Milestone Title
                    <span className="text-red-400 text-xs">*</span>
                  </label>
                  <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-blue-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900" placeholder="e.g. UI Design Approval" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-blue-800 uppercase tracking-widest">
                    Status
                  </label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-blue-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900">
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-blue-800 uppercase tracking-widest">
                    Amount (₹)
                  </label>
                  <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-blue-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900" placeholder="0" />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-blue-800 uppercase tracking-widest">
                    <Calendar size={14} className="text-blue-500" />
                    Due Date
                  </label>
                  <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-blue-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-900" />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-blue-800 uppercase tracking-widest">
                    Description
                  </label>
                  <textarea rows="2" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-blue-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none font-medium text-gray-900" placeholder="What does this milestone cover..."></textarea>
                </div>

                <div className="flex justify-end gap-3 md:col-span-2 pt-6 border-t border-gray-100 mt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 rounded-2xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all font-bold text-sm uppercase tracking-wider">
                    Cancel
                  </button>
                  <button type="submit" className="px-8 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 font-bold text-sm uppercase tracking-wider">
                    {editingMilestoneId ? "Update Milestone" : "Save Milestone"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </BillingLayout>
  );
};

export default Milestones;
