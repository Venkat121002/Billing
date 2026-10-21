import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  MessageSquare,
  QrCode,
  ShieldCheck,
  Send,
  ExternalLink,
  Sparkles,
  Heart,
  Clock,
  Pill,
  ShoppingBag,
  AlertTriangle
} from "lucide-react";

const SPECIES_OPTIONS = ["Dog", "Cat", "Bird", "Rabbit", "Fish", "Other"];
const COMMON_VACCINES = ["Rabies Booster", "DHPP (7-in-1)", "Anti-Rabies", "Kennel Cough", "FVRCP (Cat 3-in-1)", "Leptospirosis"];

const emptyForm = {
  customerId: "",
  customerName: "",
  customerPhone: "",
  petName: "",
  species: "Dog",
  breed: "",
  gender: "Male",
  dob: "",
  weightKg: "",
  microchipId: "",
  // Vaccination
  vaccineName: "Rabies Booster",
  lastVaccinationDate: "",
  nextVaccineDate: "",
  // Deworming
  dewormingDate: "",
  nextDewormingDate: "",
  // Food & Refill Automation
  foodBrand: "",
  packSizeKg: "",
  dailyConsumptionGrams: "",
  lastFoodPurchaseDate: "",
  nextFoodRefillDate: "",
  notes: ""
};

const Pets = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [pets, setPets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'vaccine_due' | 'deworm_due' | 'refill_due'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewPet, setViewPet] = useState(null);
  const [editingPetId, setEditingPetId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [ownerSearchTerm, setOwnerSearchTerm] = useState("");

  // WhatsApp Reminder Modal
  const [reminderModal, setReminderModal] = useState({
    isOpen: false,
    pet: null,
    reminderType: "vaccine", // 'vaccine' | 'deworming' | 'refill'
    message: "",
    phone: "",
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

  // Auto-calculate refill date when pack size or consumption changes
  const handleFoodRefillAutoCalc = (packKg, dailyGrams, lastDate) => {
    const kg = parseFloat(packKg);
    const grams = parseFloat(dailyGrams);
    if (kg > 0 && grams > 0) {
      const totalGrams = kg * 1000;
      const days = Math.floor(totalGrams / grams);
      const base = lastDate ? new Date(lastDate) : new Date();
      if (!isNaN(base.getTime())) {
        base.setDate(base.getDate() + days);
        return base.toISOString().split("T")[0];
      }
    }
    return "";
  };

  const handleEditPet = (pet) => {
    setEditingPetId(pet.id || pet._id);
    setFormData({
      customerId: pet.customerId || "",
      customerName: pet.customerName || "",
      customerPhone: pet.customerPhone || "",
      petName: pet.petName || "",
      species: pet.species || "Dog",
      breed: pet.breed || "",
      gender: pet.gender || "Male",
      dob: pet.dob || "",
      weightKg: pet.weightKg || "",
      microchipId: pet.microchipId || "",
      vaccineName: pet.vaccineName || "Rabies Booster",
      lastVaccinationDate: pet.lastVaccinationDate || "",
      nextVaccineDate: pet.nextVaccineDate || "",
      dewormingDate: pet.dewormingDate || "",
      nextDewormingDate: pet.nextDewormingDate || "",
      foodBrand: pet.foodBrand || "",
      packSizeKg: pet.packSizeKg || "",
      dailyConsumptionGrams: pet.dailyConsumptionGrams || "",
      lastFoodPurchaseDate: pet.lastFoodPurchaseDate || "",
      nextFoodRefillDate: pet.nextFoodRefillDate || "",
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
      setPets(pets.filter((p) => (p.id || p._id) !== id));
      toast.success("Pet record deleted successfully!");
    } catch (err) {
      console.error("Delete pet error:", err);
      toast.error("Failed to delete pet record");
    }
  };

  const handleSelectOwner = (customer) => {
    setFormData({
      ...formData,
      customerId: customer.id || customer._id || "",
      customerName: customer.name || "",
      customerPhone: customer.mobile || customer.phone || "",
    });
    setOwnerSearchTerm("");
  };

  const handleSavePet = async (e) => {
    e.preventDefault();
    const finalOwnerName = (formData.customerName || ownerSearchTerm).trim();
    if (!finalOwnerName && !formData.customerId) {
      toast.error("Please enter or select a pet owner");
      return;
    }

    const payload = {
      ...formData,
      customerName: finalOwnerName,
    };

    const token = sessionStorage.getItem("token");
    try {
      if (editingPetId) {
        await axios.put(`${API_URL}/pets/${editingPetId}`, payload, {
          headers: { "x-auth-token": token },
        });
        toast.success("Pet record updated successfully!");
      } else {
        await axios.post(`${API_URL}/pets`, payload, {
          headers: { "x-auth-token": token },
        });
        toast.success("Pet added successfully!");
      }
      setIsModalOpen(false);
      setFormData(emptyForm);
      setOwnerSearchTerm("");
      setEditingPetId(null);
      fetchData();
    } catch (err) {
      console.error("Save pet error:", err);
      toast.error("Failed to save pet record");
    }
  };

  // Open WhatsApp Reminder Modal
  const openReminderModal = (pet, type = "vaccine") => {
    const storeName = currentUser?.businessName || currentUser?.name || "Our Pet Care Team";
    const customerName = pet.customerName || "Pet Parent";
    const petName = pet.petName || "your pet";

    let msg = "";
    if (type === "vaccine") {
      const vaccine = pet.vaccineName || "Annual Vaccination";
      const dueDate = pet.nextVaccineDate || "this week";
      msg = `Hi ${customerName},\n\nThis is a friendly reminder from ${storeName} that ${petName}'s ${vaccine} is due on ${dueDate}.\n\nStaying on schedule keeps ${petName} healthy and protected against critical diseases. Feel free to reply to this message to book a quick vaccination appointment!\n\n- Team ${storeName}`;
    } else if (type === "deworming") {
      const dueDate = pet.nextDewormingDate || "this week";
      msg = `Hi ${customerName},\n\nJust a gentle reminder from ${storeName} that ${petName}'s scheduled deworming is due on ${dueDate}.\n\nRoutine deworming prevents digestive issues and keeps your pet active and playful. Drop by our store or reply here to arrange the deworming dose!\n\n- Team ${storeName}`;
    } else if (type === "refill") {
      const food = pet.foodBrand ? `${pet.foodBrand}${pet.packSizeKg ? ` (${pet.packSizeKg}kg)` : ""}` : "pet food";
      const refillDate = pet.nextFoodRefillDate || "soon";
      msg = `Hi ${customerName},\n\nHope ${petName} is doing great! Based on ${petName}'s feeding schedule, your supply of ${food} from ${storeName} is likely running low around ${refillDate}.\n\nWould you like us to reserve a fresh bag for pickup or arrange home delivery? Just reply with YES and we'll take care of it for you!\n\n- Team ${storeName}`;
    }

    setReminderModal({
      isOpen: true,
      pet,
      reminderType: type,
      message: msg,
      phone: pet.customerPhone || "",
      isSending: false
    });
  };

  // Send WhatsApp Reminder via API or Web
  const handleSendReminder = async () => {
    const { pet, reminderType, message, phone } = reminderModal;
    const petId = pet.id || pet._id;
    const token = sessionStorage.getItem("token");

    const targetPhone = (phone || "").trim();
    if (!targetPhone) {
      toast.error("Please enter a mobile number to send the WhatsApp reminder.");
      return;
    }

    setReminderModal((prev) => ({ ...prev, isSending: true }));
    try {
      const endpointMap = {
        vaccine: `${API_URL}/pets/${petId}/send-vaccine-reminder`,
        deworming: `${API_URL}/pets/${petId}/send-deworming-reminder`,
        refill: `${API_URL}/pets/${petId}/send-refill-reminder`
      };

      const res = await axios.post(
        endpointMap[reminderType],
        { customMessage: message, phone: targetPhone },
        { headers: { "x-auth-token": token } }
      );

      // Persist the phone number back to the pet profile if it was missing or updated
      if (!pet.customerPhone || pet.customerPhone !== targetPhone) {
        try {
          await axios.put(`${API_URL}/pets/${petId}`, { ...pet, customerPhone: targetPhone }, {
            headers: { "x-auth-token": token }
          });
          fetchData();
        } catch { /* ignore */ }
      }

      if (res.data.sent) {
        toast.success(`WhatsApp reminder sent to ${targetPhone}!`);
      } else {
        toast.success("Reminder generated! Opening WhatsApp link...");
      }
      setReminderModal({ isOpen: false, pet: null, reminderType: "vaccine", message: "", phone: "", isSending: false });
    } catch (err) {
      console.error("Reminder error:", err);
      toast.error("Failed to send WhatsApp message via API");
      setReminderModal((prev) => ({ ...prev, isSending: false }));
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

  // Tab Filtering & Counts
  const today = new Date();
  const next7Days = new Date();
  next7Days.setDate(today.getDate() + 7);

  const isDue = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) && d <= next7Days;
  };

  const vaccineDuePets = useMemo(() => pets.filter((p) => isDue(p.nextVaccineDate)), [pets]);
  const dewormingDuePets = useMemo(() => pets.filter((p) => isDue(p.nextDewormingDate)), [pets]);
  const refillDuePets = useMemo(() => pets.filter((p) => isDue(p.nextFoodRefillDate)), [pets]);

  const filteredPets = useMemo(() => {
    let list = pets;
    if (activeTab === "vaccine_due") list = vaccineDuePets;
    else if (activeTab === "deworm_due") list = dewormingDuePets;
    else if (activeTab === "refill_due") list = refillDuePets;

    const term = searchTerm.toLowerCase();
    return list.filter((p) => {
      return (
        !term ||
        (p.petName || "").toLowerCase().includes(term) ||
        (p.species || "").toLowerCase().includes(term) ||
        (p.breed || "").toLowerCase().includes(term) ||
        (p.customerName || "").toLowerCase().includes(term) ||
        (p.customerPhone || "").includes(term)
      );
    });
  }, [pets, activeTab, searchTerm, vaccineDuePets, dewormingDuePets, refillDuePets]);

  const tdClass = "py-4 px-5 text-sm text-gray-700 font-medium whitespace-nowrap";
  const iconBtnClass = "p-2 rounded-lg transition-colors";

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50/30 via-white to-emerald-50/20 -m-4 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wider uppercase mb-2">
                <ShieldCheck size={13} />
                Automated Pet Care & Records
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Pet Profiles & Digital Passports
              </h1>
              <p className="mt-1 text-gray-500 font-medium">
                Vaccination schedules, automated WhatsApp due alerts, and digital QR pet passports.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/pet-services")}
                className="inline-flex items-center gap-2 px-5 py-3 bg-white text-emerald-700 border border-emerald-200 rounded-xl shadow-sm hover:bg-emerald-50 transition-all font-semibold text-sm"
              >
                <Sparkles size={16} />
                Grooming Tickets
              </button>
              <button
                onClick={() => {
                  setEditingPetId(null);
                  setFormData(emptyForm);
                  setOwnerSearchTerm("");
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100 hover:shadow-xl hover:bg-emerald-700 transition-all font-semibold text-sm"
              >
                <PlusCircle className="w-5 h-5" />
                Add Pet
              </button>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border ${
              activeTab === "all"
                ? "bg-emerald-700 text-white border-emerald-700 shadow-md"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            All Pets ({pets.length})
          </button>
          <button
            onClick={() => setActiveTab("vaccine_due")}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border flex items-center gap-1.5 ${
              activeTab === "vaccine_due"
                ? "bg-red-600 text-white border-red-600 shadow-md"
                : "bg-white text-red-700 border-red-200 hover:bg-red-50"
            }`}
          >
            <Syringe size={13} />
            Vaccine Due Soon ({vaccineDuePets.length})
          </button>
          <button
            onClick={() => setActiveTab("deworm_due")}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border flex items-center gap-1.5 ${
              activeTab === "deworm_due"
                ? "bg-amber-600 text-white border-amber-600 shadow-md"
                : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
            }`}
          >
            <Pill size={13} />
            Deworming Due ({dewormingDuePets.length})
          </button>
          <button
            onClick={() => setActiveTab("refill_due")}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border flex items-center gap-1.5 ${
              activeTab === "refill_due"
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
            }`}
          >
            <ShoppingBag size={13} />
            Food Refill Due ({refillDuePets.length})
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50 mb-6 flex items-center gap-3">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by pet name, breed, parent name, or mobile..."
            className="w-full text-sm font-medium focus:outline-none text-gray-800 placeholder-gray-400"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-xl shadow-green-900/5 border border-green-100 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-gray-400">Loading pet records...</div>
          ) : filteredPets.length === 0 ? (
            <div className="p-16 text-center text-gray-400 space-y-3">
              <PawPrint size={40} className="mx-auto text-emerald-300" />
              <p className="font-semibold text-gray-600">No pets match this filter</p>
              <p className="text-xs text-gray-400">Click "Add Pet" to register a pet with medical & nutrition tracking.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                  <tr>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase">Pet & Parent</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase">Species / Breed</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase">Next Vaccine</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase">Next Deworming</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase">Food Refill</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase">Automated Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPets.map((pet, i) => {
                    const petId = pet.id || pet._id;
                    const vacDue = isDue(pet.nextVaccineDate);
                    const dewormDue = isDue(pet.nextDewormingDate);
                    const refillDue = isDue(pet.nextFoodRefillDate);

                    return (
                      <tr key={petId} className="hover:bg-emerald-50/30 transition-colors">
                        <td className={tdClass}>
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold">
                            {i + 1}
                          </span>
                        </td>

                        <td className={tdClass}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                              <PawPrint size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{pet.petName}</p>
                              <p className="text-xs text-gray-500">
                                {pet.customerName} {pet.customerPhone ? `• ${pet.customerPhone}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className={tdClass}>
                          <span className="font-medium text-gray-800">
                            {[pet.species, pet.breed].filter(Boolean).join(" · ") || "—"}
                          </span>
                          {pet.gender && (
                            <span className="text-xs text-gray-400 block">{pet.gender}</span>
                          )}
                        </td>

                        {/* Vaccine */}
                        <td className={tdClass}>
                          {pet.nextVaccineDate ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                vacDue ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-800"
                              }`}
                            >
                              <Syringe size={11} />
                              {pet.nextVaccineDate}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">None set</span>
                          )}
                          {pet.vaccineName && (
                            <span className="text-[11px] text-gray-500 block truncate max-w-[120px]">
                              {pet.vaccineName}
                            </span>
                          )}
                        </td>

                        {/* Deworming */}
                        <td className={tdClass}>
                          {pet.nextDewormingDate ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                dewormDue ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              <Pill size={11} />
                              {pet.nextDewormingDate}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Food Refill */}
                        <td className={tdClass}>
                          {pet.nextFoodRefillDate ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                refillDue ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              <ShoppingBag size={11} />
                              {pet.nextFoodRefillDate}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                          {pet.foodBrand && (
                            <span className="text-[11px] text-gray-500 block truncate max-w-[120px]">
                              {pet.foodBrand}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className={tdClass}>
                          <div className="flex items-center gap-2">
                            {/* WhatsApp Reminder Button */}
                            <button
                              title="Send Automated WhatsApp Reminder"
                              onClick={() => openReminderModal(pet, vacDue ? "vaccine" : dewormDue ? "deworming" : "vaccine")}
                              className="px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-xs font-bold flex items-center gap-1.5 transition"
                            >
                              <MessageSquare size={13} />
                              Remind
                            </button>

                            {/* Digital Pet Passport QR */}
                            <button
                              title="View & Print Digital Pet Passport"
                              onClick={() => navigate(`/pet-passport/${petId}`)}
                              className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition"
                            >
                              <QrCode size={15} />
                            </button>

                            {/* Edit */}
                            <button
                              title="Edit Pet"
                              onClick={() => handleEditPet(pet)}
                              className={`${iconBtnClass} text-blue-600 hover:bg-blue-50`}
                            >
                              <FileText size={15} />
                            </button>

                            {/* Delete */}
                            <button
                              title="Delete"
                              onClick={() => handleDeletePet(petId)}
                              className={`${iconBtnClass} text-red-500 hover:bg-red-50`}
                            >
                              <Trash2 size={15} />
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

        {/* Add/Edit Pet Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-2xl p-8 animate-fade-in relative shadow-2xl my-8">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <PawPrint size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingPetId ? "Edit Pet Profile" : "Add New Pet"}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Track vaccination, deworming, nutrition refill, and digital passport.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSavePet} className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Pet Owner Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">
                    Pet Owner / Parent *
                  </label>
                  {(formData.customerId || formData.customerName) ? (
                    <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-emerald-100 bg-emerald-50/50">
                      <div>
                        <p className="font-semibold text-gray-900">{formData.customerName}</p>
                        <p className="text-xs text-gray-500">{formData.customerPhone || "Direct owner name"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, customerId: "", customerName: "", customerPhone: "" });
                          setOwnerSearchTerm("");
                        }}
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
                        placeholder="Search existing customer or type owner name..."
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {ownerSearchTerm.trim() && (
                        <div className="absolute z-10 mt-2 w-full bg-white border border-emerald-100 rounded-2xl shadow-lg max-h-48 overflow-y-auto">
                          {filteredCustomers.map((c) => (
                            <button
                              type="button"
                              key={c.id || c._id}
                              onClick={() => handleSelectOwner(c)}
                              className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 transition border-b border-gray-50 last:border-0"
                            >
                              <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                              <p className="text-xs text-gray-500">{c.mobile || c.phone || "—"}</p>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                customerId: "",
                                customerName: ownerSearchTerm.trim(),
                                customerPhone: "",
                              });
                              setOwnerSearchTerm("");
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-emerald-50/80 bg-emerald-50/30 text-emerald-700 font-semibold text-sm flex items-center gap-2"
                          >
                            <PlusCircle size={15} />
                            Use "{ownerSearchTerm.trim()}" as owner
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Pet Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <select
                      value={formData.species}
                      onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    >
                      {SPECIES_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                      Breed
                    </label>
                    <input
                      type="text"
                      value={formData.breed}
                      onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                      placeholder="e.g. Golden Retriever"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="text"
                      value={formData.weightKg}
                      onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                      placeholder="e.g. 14.5"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                {/* Section: Vaccination & Deworming */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <Syringe size={16} className="text-emerald-600" />
                    Vaccination & Deworming Schedule
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                        Vaccine Name
                      </label>
                      <input
                        type="text"
                        value={formData.vaccineName}
                        onChange={(e) => setFormData({ ...formData, vaccineName: e.target.value })}
                        placeholder="e.g. Rabies Booster"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                        Last Vaccinated Date
                      </label>
                      <input
                        type="date"
                        value={formData.lastVaccinationDate}
                        onChange={(e) => setFormData({ ...formData, lastVaccinationDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                        Next Vaccine Due Date
                      </label>
                      <input
                        type="date"
                        value={formData.nextVaccineDate}
                        onChange={(e) => setFormData({ ...formData, nextVaccineDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-sm bg-white font-semibold text-emerald-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-emerald-100">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                        Last Deworming Date
                      </label>
                      <input
                        type="date"
                        value={formData.dewormingDate}
                        onChange={(e) => setFormData({ ...formData, dewormingDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block mb-1">
                        Next Deworming Due Date
                      </label>
                      <input
                        type="date"
                        value={formData.nextDewormingDate}
                        onChange={(e) => setFormData({ ...formData, nextDewormingDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-amber-300 text-sm bg-white font-semibold text-amber-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Food Refill Auto-Calculator */}
                <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-4">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <ShoppingBag size={16} className="text-blue-600" />
                    Nutrition & Food Refill Prediction
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                        Food Brand / Pack
                      </label>
                      <input
                        type="text"
                        value={formData.foodBrand}
                        onChange={(e) => setFormData({ ...formData, foodBrand: e.target.value })}
                        placeholder="e.g. Royal Canin Maxi"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                        Pack Size (kg)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.packSizeKg}
                        onChange={(e) => {
                          const val = e.target.value;
                          const nextDate = handleFoodRefillAutoCalc(val, formData.dailyConsumptionGrams, formData.lastFoodPurchaseDate);
                          setFormData({ ...formData, packSizeKg: val, nextFoodRefillDate: nextDate || formData.nextFoodRefillDate });
                        }}
                        placeholder="e.g. 10"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                        Daily Intake (grams)
                      </label>
                      <input
                        type="number"
                        value={formData.dailyConsumptionGrams}
                        onChange={(e) => {
                          const val = e.target.value;
                          const nextDate = handleFoodRefillAutoCalc(formData.packSizeKg, val, formData.lastFoodPurchaseDate);
                          setFormData({ ...formData, dailyConsumptionGrams: val, nextFoodRefillDate: nextDate || formData.nextFoodRefillDate });
                        }}
                        placeholder="e.g. 300"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                        Purchase / Start Date
                      </label>
                      <input
                        type="date"
                        value={formData.lastFoodPurchaseDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          const nextDate = handleFoodRefillAutoCalc(formData.packSizeKg, formData.dailyConsumptionGrams, val);
                          setFormData({ ...formData, lastFoodPurchaseDate: val, nextFoodRefillDate: nextDate || formData.nextFoodRefillDate });
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-blue-900 uppercase tracking-widest block mb-1">
                        Estimated Refill Due Date (Auto)
                      </label>
                      <input
                        type="date"
                        value={formData.nextFoodRefillDate}
                        onChange={(e) => setFormData({ ...formData, nextFoodRefillDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-blue-300 text-sm bg-white font-semibold text-blue-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block mb-1">
                    Special Medical Notes / Allergies
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Allergies, chronic conditions, special handling instructions..."
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
                    Save Pet Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* WhatsApp Reminder Modal */}
        {reminderModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-fade-in relative space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <MessageSquare size={18} className="text-emerald-600" />
                  <span>Send Automated WhatsApp Reminder</span>
                </div>
                <button
                  onClick={() => setReminderModal({ isOpen: false, pet: null, reminderType: "vaccine", message: "", phone: "", isSending: false })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Type Switcher */}
              <div className="flex gap-2">
                <button
                  onClick={() => openReminderModal(reminderModal.pet, "vaccine")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    reminderModal.reminderType === "vaccine"
                      ? "bg-emerald-700 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Vaccine Due
                </button>
                <button
                  onClick={() => openReminderModal(reminderModal.pet, "deworming")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    reminderModal.reminderType === "deworming"
                      ? "bg-amber-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Deworming
                </button>
                <button
                  onClick={() => openReminderModal(reminderModal.pet, "refill")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    reminderModal.reminderType === "refill"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Food Refill
                </button>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">
                  Recipient: <span className="font-semibold text-gray-900">{reminderModal.pet?.customerName || "Pet Parent"}</span>
                </p>

                {/* Mobile Number Input */}
                <div className="mb-3">
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="tel"
                      value={reminderModal.phone}
                      onChange={(e) => setReminderModal({ ...reminderModal, phone: e.target.value })}
                      placeholder="Enter mobile number (e.g. 9791402934)"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  {!reminderModal.phone?.trim() && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      ⚠️ No phone number saved on profile. Enter mobile number above to send reminder.
                    </p>
                  )}
                </div>

                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Message Preview
                </label>
                <textarea
                  rows={6}
                  value={reminderModal.message}
                  onChange={(e) => setReminderModal({ ...reminderModal, message: e.target.value })}
                  className="w-full p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-sm text-gray-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {reminderModal.phone?.trim() ? (
                  <a
                    href={`https://wa.me/${String(reminderModal.phone).replace(/\D/g, '').length === 10 ? '91' + String(reminderModal.phone).replace(/\D/g, '') : String(reminderModal.phone).replace(/\D/g, '')}?text=${encodeURIComponent(reminderModal.message)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:underline font-semibold"
                  >
                    <ExternalLink size={14} /> Open in WhatsApp Web
                  </a>
                ) : (
                  <span className="text-xs text-red-500">Enter mobile number</span>
                )}

                <button
                  disabled={reminderModal.isSending || !reminderModal.phone?.trim()}
                  onClick={handleSendReminder}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-100 flex items-center gap-1.5 disabled:opacity-50 transition-all"
                >
                  <Send size={14} />
                  {reminderModal.isSending ? "Sending..." : "Send via WhatsApp"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BillingLayout>
  );
};

export default Pets;
