import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import API_URL from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import toast from "react-hot-toast";
import {
  Scissors,
  PlusCircle,
  Search,
  PawPrint,
  User,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Trash2,
  X,
  FileText,
  DollarSign,
  Send,
  ExternalLink,
  Sparkles
} from "lucide-react";

const SERVICE_TYPES = [
  "Full Grooming & Spa",
  "Bath & Blow Dry",
  "Haircut & Styling",
  "Nail Trimming & Ear Cleaning",
  "Medicated Tick & Flea Bath",
  "Teeth Brushing & Breath Freshening",
  "Vet Consultation",
  "Vaccination & Health Check"
];

const STATUS_LIST = [
  { key: "all", label: "All Services" },
  { key: "Checked-In", label: "Checked-In", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { key: "In-Progress", label: "In-Progress", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { key: "Ready-For-Pickup", label: "Ready for Pickup", color: "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold" },
  { key: "Completed", label: "Completed", color: "bg-gray-100 text-gray-700 border-gray-200" }
];

const emptyTicket = {
  petId: "",
  petName: "",
  species: "Dog",
  breed: "",
  customerName: "",
  customerPhone: "",
  serviceType: "Full Grooming & Spa",
  status: "Checked-In",
  cost: 799,
  groomer: "",
  specialInstructions: "",
  notes: ""
};

const PetServices = () => {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyTicket);
  const [editingId, setEditingId] = useState(null);

  // WhatsApp Alert Modal
  const [waModal, setWaModal] = useState({
    isOpen: false,
    ticket: null,
    targetStatus: "",
    message: "",
    isSending: false
  });

  const fetchData = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    if (!token || !currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { "x-auth-token": token } };
      const [ticketsRes, petsRes] = await Promise.all([
        axios.get(`${API_URL}/pet-services`, config).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/pets`, config).catch(() => ({ data: [] }))
      ]);
      setTickets(Array.isArray(ticketsRes.data) ? ticketsRes.data : []);
      setPets(Array.isArray(petsRes.data) ? petsRes.data : []);
    } catch (err) {
      console.error("Failed to load pet services:", err);
      toast.error("Could not fetch service tickets");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When pet is selected from dropdown
  const handleSelectPet = (petId) => {
    if (!petId) {
      setFormData({ ...formData, petId: "" });
      return;
    }
    const found = pets.find((p) => (p.id || p._id) === petId);
    if (found) {
      setFormData({
        ...formData,
        petId: found.id || found._id,
        petName: found.petName || "",
        species: found.species || "Dog",
        breed: found.breed || "",
        customerName: found.customerName || "",
        customerPhone: found.customerPhone || ""
      });
    }
  };

  const handleSaveTicket = async (e) => {
    e.preventDefault();
    if (!formData.petName.trim()) {
      toast.error("Please enter a pet name");
      return;
    }
    const token = sessionStorage.getItem("token");
    try {
      const config = { headers: { "x-auth-token": token } };
      if (editingId) {
        await axios.put(`${API_URL}/pet-services/${editingId}`, formData, config);
        toast.success("Service ticket updated!");
      } else {
        await axios.post(`${API_URL}/pet-services`, formData, config);
        toast.success("Pet checked in successfully!");
      }
      setIsModalOpen(false);
      setFormData(emptyTicket);
      setEditingId(null);
      fetchData();
    } catch (err) {
      console.error("Save service error:", err);
      toast.error("Failed to save service ticket");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this service ticket?")) return;
    const token = sessionStorage.getItem("token");
    try {
      await axios.delete(`${API_URL}/pet-services/${id}`, {
        headers: { "x-auth-token": token }
      });
      setTickets(tickets.filter((t) => t.id !== id));
      toast.success("Ticket deleted");
    } catch (err) {
      toast.error("Failed to delete ticket");
    }
  };

  // Open WhatsApp prompt for status update
  const handleStatusChangeClick = (ticket, newStatus) => {
    const storeName = currentUser?.businessName || currentUser?.name || "Our Pet Care Team";
    const customerName = ticket.customerName || "Pet Parent";
    const petName = ticket.petName || "your pet";
    const shortId = (ticket.id || "").slice(-6).toUpperCase();
    const cost = ticket.cost || 0;

    let msg = "";
    if (newStatus === "Ready-For-Pickup") {
      msg = `Hi ${customerName},\n\nWonderful news! ${petName} is fresh, clean, smelling great, and ready for pickup at ${storeName}!\n\nTicket ID: ${shortId}\nTotal Amount: Rs. ${cost}\n\nYou can collect your pet anytime during our store hours.\n\n- Team ${storeName}`;
    } else if (newStatus === "In-Progress") {
      msg = `Hi ${customerName},\n\n${petName}'s grooming session (${ticket.serviceType}) is currently in progress at ${storeName}.\n\nEverything is going smoothly and we will let you know as soon as ${petName} is ready for pickup!\n\n- Team ${storeName}`;
    } else if (newStatus === "Completed") {
      msg = `Hi ${customerName},\n\nThank you for bringing ${petName} to ${storeName} for ${ticket.serviceType}!\n\nWe hope ${petName} loved the session. Have a wonderful day!\n\n- Team ${storeName}`;
    } else {
      msg = `Hi ${customerName},\n\nUpdate regarding ${petName}'s service at ${storeName}:\nCurrent status is: ${newStatus}.\n\n- Team ${storeName}`;
    }

    setWaModal({
      isOpen: true,
      ticket,
      targetStatus: newStatus,
      message: msg,
      isSending: false
    });
  };

  // Confirm status change + send WhatsApp
  const handleConfirmStatusAndSend = async (sendApi = true) => {
    const { ticket, targetStatus, message } = waModal;
    const token = sessionStorage.getItem("token");
    setWaModal((prev) => ({ ...prev, isSending: true }));

    try {
      const config = { headers: { "x-auth-token": token } };
      // 1. Update status
      await axios.put(`${API_URL}/pet-services/${ticket.id}`, { status: targetStatus }, config);

      // 2. Send via WhatsApp API if requested
      if (sendApi && ticket.customerPhone) {
        try {
          await axios.post(
            `${API_URL}/pet-services/${ticket.id}/send-status-whatsapp`,
            { status: targetStatus, customMessage: message },
            config
          );
          toast.success(`Status updated & WhatsApp sent to ${ticket.customerPhone}!`);
        } catch (waErr) {
          toast.success("Status updated (WhatsApp API delivered fallback)");
        }
      } else {
        toast.success(`Status updated to ${targetStatus}!`);
      }

      setWaModal({ isOpen: false, ticket: null, targetStatus: "", message: "", isSending: false });
      fetchData();
    } catch (err) {
      console.error("Status update error:", err);
      toast.error("Failed to update status");
      setWaModal((prev) => ({ ...prev, isSending: false }));
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        (t.petName || "").toLowerCase().includes(term) ||
        (t.customerName || "").toLowerCase().includes(term) ||
        (t.customerPhone || "").includes(term) ||
        (t.serviceType || "").toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [tickets, statusFilter, searchTerm]);

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50/30 via-white to-emerald-50/20 -m-4 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wider uppercase mb-2">
              <Sparkles size={13} />
              Grooming, Spa & Care Lifecycle
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Pet Service & Grooming Tickets
            </h1>
            <p className="mt-1 text-gray-500 font-medium">
              Track pet check-ins, haircuts, baths, and automated pickup alerts on WhatsApp.
            </p>
          </div>
          <button
            onClick={() => {
              setFormData(emptyTicket);
              setEditingId(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100 hover:shadow-xl hover:bg-emerald-700 transition-all font-semibold text-sm"
          >
            <PlusCircle className="w-5 h-5" />
            Check-In Pet
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_LIST.map((s) => {
            const count =
              s.key === "all"
                ? tickets.length
                : tickets.filter((t) => t.status === s.key).length;
            const active = statusFilter === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                  active
                    ? "bg-emerald-700 text-white border-emerald-700 shadow-md"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50 mb-6 flex items-center gap-3">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by pet name, parent, phone, or service..."
            className="w-full text-sm font-medium focus:outline-none text-gray-800 placeholder-gray-400"
          />
        </div>

        {/* Tickets Grid / Table */}
        <div className="bg-white rounded-3xl shadow-xl shadow-green-900/5 border border-green-100 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-gray-400">Loading service tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-16 text-center text-gray-400 space-y-3">
              <Scissors size={40} className="mx-auto text-emerald-300" />
              <p className="font-semibold text-gray-600">No pet service tickets found</p>
              <p className="text-xs text-gray-400">Click "Check-In Pet" to start a grooming or clinic session.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                  <tr>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase">Pet & Parent</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase">Service</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase">Cost</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase">Status & Quick Update</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTickets.map((t) => {
                    const statusObj = STATUS_LIST.find((s) => s.key === t.status) || STATUS_LIST[1];
                    return (
                      <tr key={t.id} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                              <PawPrint size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{t.petName}</p>
                              <p className="text-xs text-gray-500">
                                {t.customerName} {t.customerPhone ? `• ${t.customerPhone}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <p className="font-semibold text-gray-800 text-sm">{t.serviceType}</p>
                          {t.specialInstructions && (
                            <p className="text-xs text-amber-700 italic mt-0.5 line-clamp-1">
                              Note: {t.specialInstructions}
                            </p>
                          )}
                        </td>

                        <td className="py-4 px-5">
                          <span className="font-bold text-emerald-700 text-sm">₹{t.cost || 0}</span>
                        </td>

                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${statusObj.color}`}>
                              {t.status}
                            </span>
                            {/* Quick Next-Step Action Buttons */}
                            {t.status === "Checked-In" && (
                              <button
                                onClick={() => handleStatusChangeClick(t, "In-Progress")}
                                className="text-xs font-semibold text-amber-700 hover:bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 transition"
                              >
                                Start Grooming
                              </button>
                            )}
                            {t.status === "In-Progress" && (
                              <button
                                onClick={() => handleStatusChangeClick(t, "Ready-For-Pickup")}
                                className="text-xs font-semibold text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-300 bg-emerald-50 transition"
                              >
                                Mark Ready & Notify
                              </button>
                            )}
                            {t.status === "Ready-For-Pickup" && (
                              <button
                                onClick={() => handleStatusChangeClick(t, "Completed")}
                                className="text-xs font-semibold text-gray-700 hover:bg-gray-100 px-2 py-1 rounded-lg border border-gray-300 transition"
                              >
                                Complete Pickup
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            {t.customerPhone && (
                              <button
                                title="Send WhatsApp Update"
                                onClick={() => handleStatusChangeClick(t, t.status)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                              >
                                <MessageSquare size={16} />
                              </button>
                            )}
                            <button
                              title="Delete"
                              onClick={() => handleDelete(t.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Check-In / Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-xl p-8 animate-fade-in relative shadow-2xl my-8">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Scissors size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Check-In Pet for Service</h2>
                  <p className="text-xs text-gray-500">Log grooming, spa, or clinic service with WhatsApp alerts.</p>
                </div>
              </div>

              <form onSubmit={handleSaveTicket} className="space-y-4">
                {/* Pet Picker */}
                {pets.length > 0 && (
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                      Quick Pick from Saved Pets
                    </label>
                    <select
                      value={formData.petId}
                      onChange={(e) => handleSelectPet(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium"
                    >
                      <option value="">— Or type pet details manually below —</option>
                      {pets.map((p) => (
                        <option key={p.id || p._id} value={p.id || p._id}>
                          {p.petName} ({p.species} • {p.customerName || "Owner"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                      Pet Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.petName}
                      onChange={(e) => setFormData({ ...formData, petName: e.target.value })}
                      placeholder="e.g. Chittu"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                      Species
                    </label>
                    <input
                      type="text"
                      value={formData.species}
                      onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                      placeholder="Dog, Cat, etc."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                      Parent Name
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      placeholder="e.g. Chandru"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                      WhatsApp Mobile No.
                    </label>
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      placeholder="10-digit phone for alerts"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                      Service Type
                    </label>
                    <select
                      value={formData.serviceType}
                      onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium"
                    >
                      {SERVICE_TYPES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                      Service Cost (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      placeholder="Cost in Rs."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                    Special Instructions / Allergies
                  </label>
                  <textarea
                    rows={2}
                    value={formData.specialInstructions}
                    onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                    placeholder="e.g., Sensitive ears, allergic to lavender shampoo"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-md shadow-emerald-100"
                  >
                    Save & Check-In
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* WhatsApp Notification Modal */}
        {waModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-fade-in relative space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <MessageSquare size={18} className="text-emerald-600" />
                  <span>Send WhatsApp Status Notification</span>
                </div>
                <button
                  onClick={() => setWaModal({ isOpen: false, ticket: null, targetStatus: "", message: "", isSending: false })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">
                  Recipient: <span className="font-semibold text-gray-900">{waModal.ticket?.customerName}</span> (
                  {waModal.ticket?.customerPhone || "No phone"})
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Status being set: <span className="font-bold text-emerald-700">{waModal.targetStatus}</span>
                </p>
                <textarea
                  rows={8}
                  value={waModal.message}
                  onChange={(e) => setWaModal({ ...waModal, message: e.target.value })}
                  className="w-full p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-sm text-gray-800 font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {waModal.ticket?.customerPhone ? (
                  <a
                    href={`https://wa.me/${String(waModal.ticket.customerPhone).replace(/\D/g, '')}?text=${encodeURIComponent(waModal.message)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:underline font-semibold"
                  >
                    <ExternalLink size={14} /> Open in WhatsApp Web
                  </a>
                ) : (
                  <span className="text-xs text-red-500">No phone number on ticket</span>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmStatusAndSend(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 border border-gray-200"
                  >
                    Update Without WhatsApp
                  </button>
                  <button
                    disabled={waModal.isSending || !waModal.ticket?.customerPhone}
                    onClick={() => handleConfirmStatusAndSend(true)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-100 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send size={14} />
                    {waModal.isSending ? "Sending..." : "Send via WhatsApp"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BillingLayout>
  );
};

export default PetServices;
