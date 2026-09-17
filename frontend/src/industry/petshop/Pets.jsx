import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import API_URL from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import toast from "react-hot-toast";
import {
  Search,
  PawPrint,
  Syringe,
  Trash2,
  X,
  PlusCircle,
  User,
  Phone,
  Calendar,
  FileText,
} from "lucide-react";

const SPECIES_OPTIONS = ["Dog", "Cat", "Bird", "Rabbit", "Fish", "Other"];

const emptyForm = {
  customerId: "",
  customerName: "",
  customerPhone: "",
  petName: "",
  species: "Dog",
  breed: "",
  dob: "",
  lastVaccinationDate: "",
  notes: "",
};

const Pets = () => {
  const { currentUser } = useAuth();

  const [pets, setPets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewPet, setViewPet] = useState(null);
  const [editingPetId, setEditingPetId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [ownerSearchTerm, setOwnerSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    if (!token || !currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { "x-auth-token": token } };
      const [petsRes, customersRes] = await Promise.all([
        axios.get(`${API_URL}/pets`, config),
        axios.get(`${API_URL}/customers`, config),
      ]);
      setPets(Array.isArray(petsRes.data) ? petsRes.data : []);
      setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
    } catch (err) {
      console.error("Failed to fetch pets:", err);
      toast.error("Could not fetch pet records.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditPet = (pet) => {
    setEditingPetId(pet.id);
    setFormData({
      customerId: pet.customerId || "",
      customerName: pet.customerName || "",
      customerPhone: pet.customerPhone || "",
      petName: pet.petName || "",
      species: pet.species || "Dog",
      breed: pet.breed || "",
      dob: pet.dob || "",
      lastVaccinationDate: pet.lastVaccinationDate || "",
      notes: pet.notes || "",
    });
    setOwnerSearchTerm("");
    setIsModalOpen(true);
  };

  const handleDeletePet = async (id) => {
    if (!window.confirm("Are you sure you want to delete this pet record?")) return;
    const token = sessionStorage.getItem("token");
    try {
      await axios.delete(`${API_URL}/pets/${id}`, {
        headers: { "x-auth-token": token },
      });
      setPets(pets.filter((p) => p.id !== id));
      toast.success("Pet record deleted successfully!");
    } catch (err) {
      console.error("Delete pet error:", err);
      toast.error("Failed to delete pet record");
    }
  };

  const handleSelectOwner = (customer) => {
    setFormData({
      ...formData,
      customerId: customer.id,
      customerName: customer.name || "",
      customerPhone: customer.mobile || customer.phone || "",
    });
    setOwnerSearchTerm("");
  };

  const handleSavePet = async (e) => {
    e.preventDefault();
    if (!formData.customerId) {
      toast.error("Please select a pet owner");
      return;
    }
    const token = sessionStorage.getItem("token");
    try {
      if (editingPetId) {
        await axios.put(`${API_URL}/pets/${editingPetId}`, formData, {
          headers: { "x-auth-token": token },
        });
        toast.success("Pet record updated successfully!");
      } else {
        await axios.post(`${API_URL}/pets`, formData, {
          headers: { "x-auth-token": token },
        });
        toast.success("Pet added successfully!");
      }
      setIsModalOpen(false);
      setFormData(emptyForm);
      setEditingPetId(null);
      fetchData();
    } catch (err) {
      console.error("Save pet error:", err);
      toast.error("Failed to save pet record");
    }
  };

  const filteredCustomers = useMemo(() => {
    const term = ownerSearchTerm.trim().toLowerCase();
    if (!term) return [];
    return customers
      .filter(
        (c) =>
          (c.name || "").toLowerCase().includes(term) ||
          (c.mobile || c.phone || "").toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [customers, ownerSearchTerm]);

  const filteredPets = pets.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      (p.petName || "").toLowerCase().includes(term) ||
      (p.species || "").toLowerCase().includes(term) ||
      (p.breed || "").toLowerCase().includes(term) ||
      (p.customerName || "").toLowerCase().includes(term) ||
      (p.customerPhone || "").toLowerCase().includes(term)
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
                Pets
              </h1>
              <p className="mt-1 text-gray-500 font-medium">
                Manage pet profiles linked to your customers.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPetId(null);
                setFormData(emptyForm);
                setOwnerSearchTerm("");
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100 hover:shadow-xl hover:bg-emerald-700 transition-all font-semibold text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Add Pet
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by pet name, species, breed or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading pets...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                  <tr>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Pet Name</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Species / Breed</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Owner</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Vaccination</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPets.length > 0 ? (
                    filteredPets.map((pet, i) => (
                      <tr key={pet.id} className="hover:bg-green-50/50 transition-colors border-b border-gray-50">
                        <td className={tdClass}>
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                            {i + 1}
                          </span>
                        </td>
                        <td className={`${tdClass} font-semibold text-gray-900`}>
                          <div className="flex items-center gap-2">
                            <PawPrint size={16} className="text-emerald-500" />
                            {pet.petName}
                          </div>
                        </td>
                        <td className={tdClass}>{[pet.species, pet.breed].filter(Boolean).join(" · ") || "—"}</td>
                        <td className={tdClass}>
                          {pet.customerName || "—"}
                          <div className="text-xs font-normal text-gray-500">{pet.customerPhone || "—"}</div>
                        </td>
                        <td className={tdClass}>{pet.lastVaccinationDate || "—"}</td>
                        <td className={tdClass}>
                          <div className="flex items-center gap-2">
                            <button title="View" onClick={() => setViewPet(pet)} className={`${iconBtnClass} text-gray-500 hover:bg-gray-100`}>
                              <Search size={16} />
                            </button>
                            <button title="Edit" onClick={() => handleEditPet(pet)} className={`${iconBtnClass} text-blue-600 hover:bg-blue-50`}>
                              <FileText size={16} />
                            </button>
                            <button title="Delete" onClick={() => handleDeletePet(pet.id)} className={`${iconBtnClass} text-red-600 hover:bg-red-50`}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-16 text-gray-400">
                        No pet records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* View Pet Modal */}
        {viewPet && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
              <button
                onClick={() => setViewPet(null)}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
              >
                <X size={24} />
              </button>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 border-b border-green-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-green-100">
                    <PawPrint size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{viewPet.petName}</h2>
                    <p className="text-emerald-700 font-medium">
                      {[viewPet.species, viewPet.breed].filter(Boolean).join(" · ") || "No breed info"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Owner</p>
                    <p className="text-gray-700 font-medium flex items-center gap-2">
                      <User size={14} className="text-emerald-500" />
                      {viewPet.customerName || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Owner Phone</p>
                    <p className="text-gray-700 font-medium flex items-center gap-2">
                      <Phone size={14} className="text-emerald-500" />
                      {viewPet.customerPhone || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date of Birth</p>
                    <p className="text-gray-700 font-medium flex items-center gap-2">
                      <Calendar size={14} className="text-emerald-500" />
                      {viewPet.dob || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Vaccination</p>
                    <p className="text-gray-700 font-medium flex items-center gap-2">
                      <Syringe size={14} className="text-emerald-500" />
                      {viewPet.lastVaccinationDate || "—"}
                    </p>
                  </div>
                </div>

                {viewPet.notes && (
                  <div className="space-y-1 border-t border-gray-50 pt-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Notes</p>
                    <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 italic">
                      {viewPet.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setViewPet(null)}
                  className="px-8 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all text-sm uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Pet Modal */}
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
                  {editingPetId ? <FileText size={28} /> : <PlusCircle size={28} />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingPetId ? "Edit Pet" : "Add New Pet"}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Fill in the details below to save the pet profile
                  </p>
                </div>
              </div>

              <form onSubmit={handleSavePet} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <User size={14} className="text-emerald-500" />
                    Pet Owner
                    <span className="text-red-400 text-xs">*</span>
                  </label>
                  {formData.customerId ? (
                    <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/50">
                      <div>
                        <p className="font-semibold text-gray-900">{formData.customerName}</p>
                        <p className="text-xs text-gray-500">{formData.customerPhone || "No phone on file"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, customerId: "", customerName: "", customerPhone: "" })}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 uppercase tracking-wider"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={ownerSearchTerm}
                        onChange={(e) => setOwnerSearchTerm(e.target.value)}
                        placeholder="Search customer by name or phone..."
                        className="w-full px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900"
                      />
                      {filteredCustomers.length > 0 && (
                        <div className="absolute z-10 mt-2 w-full bg-white border border-emerald-100 rounded-2xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                          {filteredCustomers.map((c) => (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => handleSelectOwner(c)}
                              className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-gray-50 last:border-0"
                            >
                              <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                              <p className="text-xs text-gray-500">{c.mobile || c.phone || "—"}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <PawPrint size={14} className="text-emerald-500" />
                    Pet Name
                    <span className="text-red-400 text-xs">*</span>
                  </label>
                  <input type="text" required value={formData.petName} onChange={(e) => setFormData({ ...formData, petName: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" placeholder="Enter pet name" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    Species
                  </label>
                  <select value={formData.species} onChange={(e) => setFormData({ ...formData, species: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900">
                    {SPECIES_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    Breed
                  </label>
                  <input type="text" value={formData.breed} onChange={(e) => setFormData({ ...formData, breed: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" placeholder="e.g. Labrador" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <Calendar size={14} className="text-emerald-500" />
                    Date of Birth
                  </label>
                  <input type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    <Syringe size={14} className="text-emerald-500" />
                    Last Vaccination Date
                  </label>
                  <input type="date" value={formData.lastVaccinationDate} onChange={(e) => setFormData({ ...formData, lastVaccinationDate: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-gray-900" />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                    Medical Notes
                  </label>
                  <textarea rows="2" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-emerald-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none font-medium text-gray-900" placeholder="Allergies, conditions, other notes..."></textarea>
                </div>

                <div className="flex justify-end gap-3 md:col-span-2 pt-6 border-t border-gray-100 mt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 rounded-2xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all font-bold text-sm uppercase tracking-wider">
                    Cancel
                  </button>
                  <button type="submit" className="px-8 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 font-bold text-sm uppercase tracking-wider">
                    {editingPetId ? "Update Pet" : "Save Pet"}
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

export default Pets;
