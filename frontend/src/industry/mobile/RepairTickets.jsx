import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import API_URL from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import toast from "react-hot-toast";
import {
  Search,
  Wrench,
  ShieldCheck,
  Trash2,
  X,
  PlusCircle,
  FileText,
  Smartphone,
  Hash,
  Phone,
  Calendar,
  User,
} from "lucide-react";

const STATUS_OPTIONS = ["Received", "In Progress", "Completed", "Delivered", "Cancelled"];

const STATUS_STYLES = {
  Received: "bg-blue-100 text-blue-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

const emptyForm = {
  ticketType: "repair",
  customerName: "",
  customerPhone: "",
  deviceBrand: "",
  deviceModel: "",
  imei: "",
  issueDescription: "",
  status: "Received",
  estimatedCost: "",
  finalCost: "",
  receivedDate: new Date().toISOString().slice(0, 10),
  promisedDate: "",
  technician: "",
  notes: "",
};

const RepairTickets = () => {
  const { currentUser } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeTab, setTypeTab] = useState("repair"); // "repair" | "warranty"

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState(null);
  const [editingTicketId, setEditingTicketId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const fetchTickets = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    if (!token || !currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { "x-auth-token": token } };
      const res = await axios.get(`${API_URL}/repair-tickets`, config);
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch repair tickets:", err);
      toast.error("Could not fetch repair tickets.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleEditTicket = (ticket) => {
    setEditingTicketId(ticket.id);
    setFormData({
      ticketType: ticket.ticketType || "repair",
      customerName: ticket.customerName || "",
      customerPhone: ticket.customerPhone || "",
      deviceBrand: ticket.deviceBrand || "",
      deviceModel: ticket.deviceModel || "",
      imei: ticket.imei || "",
      issueDescription: ticket.issueDescription || "",
      status: ticket.status || "Received",
      estimatedCost: ticket.estimatedCost || "",
      finalCost: ticket.finalCost || "",
      receivedDate: (ticket.receivedDate || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
      promisedDate: (ticket.promisedDate || "").slice(0, 10),
      technician: ticket.technician || "",
      notes: ticket.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteTicket = async (id) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    const token = sessionStorage.getItem("token");
    try {
      await axios.delete(`${API_URL}/repair-tickets/${id}`, {
        headers: { "x-auth-token": token },
      });
      setTickets(tickets.filter((t) => t.id !== id));
      toast.success("Ticket deleted successfully!");
    } catch (err) {
      console.error("Delete ticket error:", err);
      toast.error("Failed to delete ticket");
    }
  };

  const handleSaveTicket = async (e) => {
    e.preventDefault();
    if (formData.customerPhone && formData.customerPhone.length !== 10) {
      toast.error("Customer phone must be exactly 10 digits");
      return;
    }
    const token = sessionStorage.getItem("token");
    const payload = {
      ...formData,
      estimatedCost: Number(formData.estimatedCost) || 0,
      finalCost: Number(formData.finalCost) || 0,
    };
    try {
      if (editingTicketId) {
        await axios.put(`${API_URL}/repair-tickets/${editingTicketId}`, payload, {
          headers: { "x-auth-token": token },
        });
        toast.success("Ticket updated successfully!");
      } else {
        await axios.post(`${API_URL}/repair-tickets`, payload, {
          headers: { "x-auth-token": token },
        });
        toast.success("Ticket added successfully!");
      }
      setIsModalOpen(false);
      setFormData(emptyForm);
      setEditingTicketId(null);
      fetchTickets();
    } catch (err) {
      console.error("Save ticket error:", err);
      toast.error("Failed to save ticket");
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if ((t.ticketType || "repair") !== typeTab) return false;
    const term = searchTerm.toLowerCase();
    return (
      (t.customerName || "").toLowerCase().includes(term) ||
      (t.customerPhone || "").toLowerCase().includes(term) ||
      (t.deviceBrand || "").toLowerCase().includes(term) ||
      (t.deviceModel || "").toLowerCase().includes(term) ||
      (t.imei || "").toLowerCase().includes(term)
    );
  });

  const tdClass = "px-5 py-4 text-sm text-gray-700 whitespace-nowrap";
  const iconBtnClass = "p-2 rounded-lg transition-colors";

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50/30 via-white to-emerald-50/20 -m-4 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Repairs
              </h1>
              <p className="mt-1 text-gray-500 font-medium">
                Track device repair jobs and warranty claims.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTicketId(null);
                setFormData({ ...emptyForm, ticketType: typeTab });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100 hover:shadow-xl hover:bg-emerald-700 transition-all font-semibold text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              New Ticket
            </button>
          </div>
        </div>

        {/* Type Tabs */}
        <div className="flex gap-4 border-b border-green-100 mb-6">
          <button
            className={`pb-2 px-4 font-medium transition-colors relative flex items-center gap-2 ${typeTab === "repair" ? "text-emerald-700" : "text-gray-500 hover:text-gray-700"
              }`}
            onClick={() => setTypeTab("repair")}
          >
            <Wrench size={16} />
            Repairs
            {typeTab === "repair" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t-full" />
            )}
          </button>
          <button
            className={`pb-2 px-4 font-medium transition-colors relative flex items-center gap-2 ${typeTab === "warranty" ? "text-emerald-700" : "text-gray-500 hover:text-gray-700"
              }`}
            onClick={() => setTypeTab("warranty")}
          >
            <ShieldCheck size={16} />
            Warranty Claims
            {typeTab === "warranty" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t-full" />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by customer, phone, device or IMEI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading tickets...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                  <tr>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Device</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">IMEI</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cost (₹)</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Received</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.length > 0 ? (
                    filteredTickets.map((ticket, i) => (
                      <tr key={ticket.id} className="hover:bg-green-50/50 transition-colors border-b border-gray-50">
                        <td className={tdClass}>
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                            {i + 1}
                          </span>
                        </td>
                        <td className={`${tdClass} font-semibold text-gray-900`}>
                          {ticket.customerName}
                          <div className="text-xs font-normal text-gray-500">{ticket.customerPhone || "—"}</div>
                        </td>
                        <td className={tdClass}>
                          {[ticket.deviceBrand, ticket.deviceModel].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className={`${tdClass} font-mono text-xs text-gray-500`}>{ticket.imei || "—"}</td>
                        <td className={tdClass}>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[ticket.status] || "bg-gray-100 text-gray-600"}`}>
                            {ticket.status || "Received"}
                          </span>
                        </td>
                        <td className={`${tdClass} font-semibold text-emerald-700`}>
                          ₹{Number(ticket.finalCost || ticket.estimatedCost || 0).toLocaleString("en-IN")}
                        </td>
                        <td className={tdClass}>{(ticket.receivedDate || "").slice(0, 10) || "—"}</td>
                        <td className={tdClass}>
                          <div className="flex items-center gap-2">
                            <button title="View" onClick={() => setViewTicket(ticket)} className={`${iconBtnClass} text-gray-500 hover:bg-gray-100`}>
                              <Search size={16} />
                            </button>
                            <button title="Edit" onClick={() => handleEditTicket(ticket)} className={`${iconBtnClass} text-blue-600 hover:bg-blue-50`}>
                              <FileText size={16} />
                            </button>
                            <button title="Delete" onClick={() => handleDeleteTicket(ticket.id)} className={`${iconBtnClass} text-red-600 hover:bg-red-50`}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-16 text-gray-400">
                        No {typeTab === "repair" ? "repair tickets" : "warranty claims"} found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* View Ticket Modal */}
        {viewTicket && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
              <button
                onClick={() => setViewTicket(null)}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
              >
                <X size={24} />
              </button>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 border-b border-green-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-green-100">
                    {viewTicket.ticketType === "warranty" ? <ShieldCheck size={32} /> : <Wrench size={32} />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{viewTicket.customerName}</h2>
                    <p className="text-emerald-700 font-medium">
                      {[viewTicket.deviceBrand, viewTicket.deviceModel].filter(Boolean).join(" ") || "No device info"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[viewTicket.status] || "bg-gray-100 text-gray-600"}`}>
                    {viewTicket.status || "Received"}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/80 text-emerald-800 text-[10px] font-bold uppercase tracking-wider border border-green-100">
                    {viewTicket.ticketType === "warranty" ? "Warranty Claim" : "Repair"}
                  </span>
                </div>
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer Phone</p>
                    <p className="text-gray-700 font-medium flex items-center gap-2">
                      <Phone size={14} className="text-emerald-500" />
                      {viewTicket.customerPhone || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">IMEI</p>
                    <p className="text-gray-700 font-mono font-medium flex items-center gap-2">
                      <Hash size={14} className="text-emerald-500" />
                      {viewTicket.imei || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Received</p>
                    <p className="text-gray-700 font-medium flex items-center gap-2">
                      <Calendar size={14} className="text-emerald-500" />
                      {(viewTicket.receivedDate || "").slice(0, 10) || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Promised By</p>
                    <p className="text-gray-700 font-medium flex items-center gap-2">
                      <Calendar size={14} className="text-emerald-500" />
                      {(viewTicket.promisedDate || "").slice(0, 10) || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estimated Cost</p>
                    <p className="text-gray-700 font-medium">₹{Number(viewTicket.estimatedCost || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Final Cost</p>
                    <p className="text-gray-700 font-medium">₹{Number(viewTicket.finalCost || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Technician</p>
                    <p className="text-gray-700 font-medium flex items-center gap-2">
                      <User size={14} className="text-emerald-500" />
                      {viewTicket.technician || "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 border-t border-gray-50 pt-6">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Smartphone size={14} className="text-emerald-500" />
                    Issue Description
                  </p>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 italic">
                    {viewTicket.issueDescription || "No description provided."}
                  </p>
                </div>

                {viewTicket.notes && (
                  <div className="space-y-1 border-t border-gray-50 pt-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Notes</p>
                    <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 italic">
                      {viewTicket.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setViewTicket(null)}
                  className="px-8 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all text-sm uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Ticket Modal */}
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
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                  {editingTicketId ? <FileText size={28} /> : <PlusCircle size={28} />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingTicketId ? "Edit Ticket" : "New Ticket"}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Fill in the details below to save the ticket
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveTicket} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    Ticket Type
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, ticketType: "repair" })}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${formData.ticketType === "repair"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                    >
                      <Wrench size={14} /> Repair
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, ticketType: "warranty" })}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${formData.ticketType === "warranty"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                    >
                      <ShieldCheck size={14} /> Warranty Claim
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <User size={14} className="text-emerald-500" />
                    Customer Name
                    <span className="text-red-400 text-xs">*</span>
                  </label>
                  <input type="text" required value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" placeholder="Enter customer name" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <Phone size={14} className="text-emerald-500" />
                    Customer Phone
                  </label>
                  <input type="number" value={formData.customerPhone} onChange={(e) => { const val = e.target.value.slice(0, 10); setFormData({ ...formData, customerPhone: val }); }} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" placeholder="10 digit mobile" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <Smartphone size={14} className="text-emerald-500" />
                    Device Brand
                  </label>
                  <input type="text" value={formData.deviceBrand} onChange={(e) => setFormData({ ...formData, deviceBrand: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" placeholder="e.g. Samsung" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    Device Model
                  </label>
                  <input type="text" value={formData.deviceModel} onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" placeholder="e.g. Galaxy S21" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <Hash size={14} className="text-emerald-500" />
                    IMEI
                  </label>
                  <input type="text" value={formData.imei} onChange={(e) => setFormData({ ...formData, imei: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono font-medium text-gray-900" placeholder="15 digit IMEI" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    Status
                  </label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900">
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    Estimated Cost (₹)
                  </label>
                  <input type="number" value={formData.estimatedCost} onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" placeholder="0" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    Final Cost (₹)
                  </label>
                  <input type="number" value={formData.finalCost} onChange={(e) => setFormData({ ...formData, finalCost: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" placeholder="0" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <Calendar size={14} className="text-emerald-500" />
                    Received Date
                  </label>
                  <input type="date" value={formData.receivedDate} onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <Calendar size={14} className="text-emerald-500" />
                    Promised Date
                  </label>
                  <input type="date" value={formData.promisedDate} onChange={(e) => setFormData({ ...formData, promisedDate: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <User size={14} className="text-emerald-500" />
                    Technician
                  </label>
                  <input type="text" value={formData.technician} onChange={(e) => setFormData({ ...formData, technician: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" placeholder="Assigned technician" />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    Issue Description
                  </label>
                  <textarea rows="2" value={formData.issueDescription} onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none font-medium text-gray-900" placeholder="Describe the issue..."></textarea>
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    Notes
                  </label>
                  <textarea rows="2" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none font-medium text-gray-900" placeholder="Internal notes..."></textarea>
                </div>

                <div className="flex justify-end gap-3 md:col-span-2 pt-6 border-t border-gray-100 mt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 rounded-2xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all font-bold text-sm uppercase tracking-wider">
                    Cancel
                  </button>
                  <button type="submit" className="px-8 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 font-bold text-sm uppercase tracking-wider">
                    {editingTicketId ? "Update Ticket" : "Save Ticket"}
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

export default RepairTickets;
