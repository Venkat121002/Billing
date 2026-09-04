import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import toast from "react-hot-toast";
import {
  Search,
  Users,
  Trash2,
  X,
  PlusCircle,
  Briefcase,
  Building2,
  Hash,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  CreditCard,
} from "lucide-react";

const Trainer = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewTrainer, setViewTrainer] = useState(null);
  const [editingTrainerId, setEditingTrainerId] = useState(null);
  const [trainerFormData, setTrainerFormData] = useState({
    name: "",
    company: "", // Specialization
    code: "",
    gst: "", // Not needed for trainer
    pan: "",
    mobile: "",
    email: "",
    address: "",
    paymentMode: "", // Salary
  });

  const fetchTrainers = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    if (!token || !currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { "x-auth-token": token } };
      // Trainers are stored as suppliers in the backend
      const res = await axios.get(`${API_URL}/suppliers`, config);
      const userId = currentUser?.uid || currentUser?.userId;
      const role = currentUser?.role;
      const filtered = res.data.filter((item) => {
        if (role === "owner" || role === "TenantAdmin") {
          return item.source === "Owner" || item.createdBy === userId;
        }
        return item.createdBy === userId;
      });
      setTrainers(filtered);
    } catch (err) {
      console.error("Failed to fetch trainers:", err);
      toast.error("Could not fetch trainers list.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  const handleEditTrainer = (trainer) => {
    setEditingTrainerId(trainer.id);
    setTrainerFormData({
      name: trainer.name || "",
      company: trainer.company || "",
      code: trainer.code || "",
      gst: trainer.gst || "",
      pan: trainer.pan || "",
      mobile: trainer.mobile || "",
      email: trainer.email || "",
      address: trainer.address || "",
      paymentMode: trainer.paymentMode || "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteTrainer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this trainer?")) return;
    const token = sessionStorage.getItem("token");
    try {
      await axios.delete(`${API_URL}/suppliers/${id}`, {
        headers: { "x-auth-token": token },
      });
      setTrainers(trainers.filter((t) => t.id !== id));
      toast.success("Trainer deleted successfully!");
    } catch (err) {
      console.error("Delete trainer error:", err);
      toast.error("Failed to delete trainer");
    }
  };

  const handleSaveTrainer = async (e) => {
    e.preventDefault();
    if (trainerFormData.mobile && trainerFormData.mobile.length !== 10) {
      toast.error("Mobile number must be exactly 10 digits");
      return;
    }
    const token = sessionStorage.getItem("token");
    try {
      if (editingTrainerId) {
        await axios.put(`${API_URL}/suppliers/${editingTrainerId}`, trainerFormData, {
          headers: { "x-auth-token": token },
        });
        toast.success("Trainer updated successfully!");
      } else {
        await axios.post(`${API_URL}/suppliers`, trainerFormData, {
          headers: { "x-auth-token": token },
        });
        toast.success("Trainer added successfully!");
      }
      setIsModalOpen(false);
      setTrainerFormData({
        name: "",
        company: "",
        code: "",
        gst: "",
        pan: "",
        mobile: "",
        email: "",
        address: "",
        paymentMode: "",
      });
      setEditingTrainerId(null);
      fetchTrainers();
    } catch (err) {
      console.error("Save trainer error:", err);
      toast.error("Failed to save trainer");
    }
  };

  const filteredTrainers = trainers.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      (t.name || "").toLowerCase().includes(term) ||
      (t.company || "").toLowerCase().includes(term) || // Specialization
      (t.code || "").toLowerCase().includes(term) ||
      (t.mobile || "").toLowerCase().includes(term)
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
                Trainers
              </h1>
              <p className="mt-1 text-gray-500 font-medium">
                Manage your academy's trainers and their salaries.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTrainerId(null);
                setTrainerFormData({
                  name: "",
                  company: "",
                  code: "",
                  gst: "",
                  pan: "",
                  mobile: "",
                  email: "",
                  address: "",
                  paymentMode: "",
                });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-100 hover:shadow-xl hover:bg-purple-700 transition-all font-semibold text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Add Trainer
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, specialization, code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading trainers...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                  <tr>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trainer Name</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Specialization</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mobile</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Salary (₹)</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainers.length > 0 ? (
                    filteredTrainers.map((trainer, i) => (
                      <tr key={trainer.id} className="hover:bg-green-50/50 transition-colors border-b border-gray-50">
                        <td className={tdClass}>
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                            {i + 1}
                          </span>
                        </td>
                        <td className={`${tdClass} font-semibold text-gray-900`}>{trainer.name}</td>
                        <td className={tdClass}>{trainer.company || "—"}</td>
                        <td className={`${tdClass} font-mono text-xs text-gray-500`}>{trainer.code || "—"}</td>
                        <td className={tdClass}>{trainer.mobile || "—"}</td>
                        <td className={`${tdClass} font-semibold text-green-700`}>
                          ₹{Number(trainer.paymentMode || 0).toLocaleString('en-IN')}
                        </td>
                        <td className={tdClass}>
                          <div className="flex items-center gap-2">
                            <button title="View" onClick={() => setViewTrainer(trainer)} className={`${iconBtnClass} text-gray-500 hover:bg-gray-100`}>
                              <Search size={16} />
                            </button>
                            <button title="Edit" onClick={() => handleEditTrainer(trainer)} className={`${iconBtnClass} text-blue-600 hover:bg-blue-50`}>
                              <FileText size={16} />
                            </button>
                            <button title="Delete" onClick={() => handleDeleteTrainer(trainer.id)} className={`${iconBtnClass} text-red-600 hover:bg-red-50`}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-16 text-gray-400">
                        No trainers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* View Trainer Modal */}
        {viewTrainer && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
              <button
                onClick={() => setViewTrainer(null)}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
              >
                <X size={24} />
              </button>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 border-b border-green-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-green-100">
                    <Users size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{viewTrainer.name}</h2>
                    <p className="text-emerald-700 font-medium">{viewTrainer.company || "No Specialization"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/80 text-emerald-800 text-[10px] font-bold uppercase tracking-wider border border-green-100">
                    Code: {viewTrainer.code || "N/A"}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/80 text-emerald-800 text-[10px] font-bold uppercase tracking-wider border border-green-100">
                    Salary: ₹{Number(viewTrainer.paymentMode || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mobile Number</p>
                    <p className="text-gray-700 font-medium flex items-center gap-2">
                      <Phone size={14} className="text-emerald-500" />
                      {viewTrainer.mobile || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</p>
                    <p className="text-gray-700 font-medium flex items-center gap-2">
                      <Mail size={14} className="text-emerald-500" />
                      {viewTrainer.email || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">PAN Number</p>
                    <p className="text-gray-700 font-mono font-medium">{viewTrainer.pan || "—"}</p>
                  </div>
                </div>

                <div className="space-y-1 border-t border-gray-50 pt-6">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={14} className="text-emerald-500" />
                    Address
                  </p>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 italic">
                    {viewTrainer.address || "No address provided."}
                  </p>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setViewTrainer(null)}
                  className="px-8 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all text-sm uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Trainer Modal */}
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
                  {editingTrainerId ? <FileText size={28} /> : <PlusCircle size={28} />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingTrainerId ? "Edit Trainer" : "Add New Trainer"}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Fill in the details below to save the trainer
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveTrainer} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <Briefcase size={14} className="text-emerald-500" />
                    Trainer Name
                    <span className="text-red-400 text-xs">*</span>
                  </label>
                  <input type="text" required value={trainerFormData.name} onChange={(e) => setTrainerFormData({ ...trainerFormData, name: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" placeholder="Enter trainer name" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <Building2 size={14} className="text-emerald-500" />
                    Specialization
                  </label>
                  <input type="text" value={trainerFormData.company} onChange={(e) => setTrainerFormData({ ...trainerFormData, company: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" placeholder="e.g. Fullstack, Java" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <Hash size={14} className="text-emerald-500" />
                    Trainer Code
                  </label>
                  <input type="text" value={trainerFormData.code} onChange={(e) => setTrainerFormData({ ...trainerFormData, code: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" placeholder="e.g. TRN001" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <DollarSign size={14} className="text-emerald-500" />
                    PAN Number
                  </label>
                  <input type="text" value={trainerFormData.pan} onChange={(e) => setTrainerFormData({ ...trainerFormData, pan: e.target.value.toUpperCase() })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono font-medium text-gray-900 uppercase" placeholder="ABCDE1234F" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <Phone size={14} className="text-emerald-500" />
                    Mobile Number
                  </label>
                  <input type="number" value={trainerFormData.mobile} onChange={(e) => { const val = e.target.value.slice(0, 10); setTrainerFormData({ ...trainerFormData, mobile: val }); }} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" placeholder="10 digit mobile" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    Email Address
                  </label>
                  <input type="email" value={trainerFormData.email} onChange={(e) => setTrainerFormData({ ...trainerFormData, email: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" placeholder="trainer@email.com" />
                </div>

 
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <DollarSign size={14} className="text-emerald-500" />
                    Trainer Salary (₹)
                  </label>
                  <input type="number" value={trainerFormData.paymentMode} onChange={(e) => setTrainerFormData({ ...trainerFormData, paymentMode: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" placeholder="Enter monthly salary" />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <MapPin size={14} className="text-emerald-500" />
                    Address
                  </label>
                  <textarea rows="2" value={trainerFormData.address} onChange={(e) => setTrainerFormData({ ...trainerFormData, address: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none font-medium text-gray-900" placeholder="Enter full address..."></textarea>
                </div>

                <div className="flex justify-end gap-3 md:col-span-2 pt-6 border-t border-gray-100 mt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 rounded-2xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all font-bold text-sm uppercase tracking-wider">
                    Cancel
                  </button>
                  <button type="submit" className="px-8 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 font-bold text-sm uppercase tracking-wider">
                    {editingTrainerId ? "Update Trainer" : "Save Trainer"}
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

export default Trainer;