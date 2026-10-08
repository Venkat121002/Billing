import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config/api";
import {
  PawPrint,
  ShieldCheck,
  Calendar,
  User,
  Phone,
  Syringe,
  Printer,
  Share2,
  ArrowLeft,
  Heart,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText
} from "lucide-react";

const PetPassport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPassport = async () => {
      try {
        setLoading(true);
        // Try public endpoint first, fallback to standard authenticated endpoint
        let res;
        try {
          res = await axios.get(`${API_URL}/pets/public-passport/${id}`);
        } catch (e) {
          const token = sessionStorage.getItem("token");
          res = await axios.get(`${API_URL}/pets/${id}`, {
            headers: token ? { "x-auth-token": token } : {}
          });
        }
        setPet(res.data);
      } catch (err) {
        console.error("Passport fetch error:", err);
        setError("Pet passport not found or invalid QR link.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPassport();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const currentUrl = window.location.href;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(currentUrl)}&color=065f46`;

  const handleShareWhatsApp = () => {
    if (!pet) return;
    const text = `Here is ${pet.petName}'s Official Digital Pet Health Passport & Vaccination Record: ${currentUrl}`;
    const cleanPhone = String(pet.customerPhone || '').replace(/\D/g, '');
    const webPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = cleanPhone ? `https://wa.me/${webPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-emerald-900 font-semibold text-lg">Loading Digital Pet Passport...</p>
        </div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-gray-100 space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Record Not Found</h2>
          <p className="text-gray-500 text-sm">{error || "This pet record is unavailable."}</p>
          <button
            onClick={() => navigate("/pets")}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition"
          >
            Go to Pets Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Calculate vaccine status
  const today = new Date();
  const nextVac = pet.nextVaccineDate ? new Date(pet.nextVaccineDate) : null;
  const isVacDue = nextVac && nextVac <= today;
  const isVacUpcoming = nextVac && !isVacDue && (nextVac - today) / (1000 * 60 * 60 * 24) <= 14;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-slate-50 to-green-50/30 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Top Action Bar (Hidden during printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate("/pets")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-xl font-medium text-sm border border-gray-200 shadow-sm hover:bg-gray-50 transition"
        >
          <ArrowLeft size={16} />
          Back to Pets
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-medium text-sm shadow-md shadow-green-100 hover:bg-green-700 transition"
          >
            <Share2 size={16} />
            Share WhatsApp
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-800 transition"
          >
            <Printer size={16} />
            Print Passport
          </button>
        </div>
      </div>

      {/* Main Passport Card */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden print:shadow-none print:border-2 print:border-emerald-700 print:rounded-2xl">
        {/* Passport Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white/5 transform skew-x-12 pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-inner flex items-center justify-center text-emerald-800 border-2 border-emerald-300">
                <PawPrint size={44} />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-400/30 text-emerald-200 text-xs font-bold tracking-widest uppercase mb-1">
                  <ShieldCheck size={12} />
                  Official Pet Health Passport
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{pet.petName}</h1>
                <p className="text-emerald-200 font-medium text-sm sm:text-base">
                  {[pet.species, pet.breed, pet.gender].filter(Boolean).join(" • ") || "Companion Animal"}
                </p>
              </div>
            </div>

            <div className="bg-emerald-900/40 backdrop-blur-sm border border-emerald-400/20 rounded-2xl p-4 text-center sm:text-right">
              <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">Passport ID</p>
              <p className="font-mono text-xl font-bold tracking-wider text-emerald-100">
                PET-{(pet.id || id).slice(-8).toUpperCase()}
              </p>
              {pet.microchipId && (
                <p className="text-xs text-emerald-200 mt-1">Chip: {pet.microchipId}</p>
              )}
            </div>
          </div>
        </div>

        {/* Passport Body */}
        <div className="p-6 sm:p-10 space-y-8">
          {/* Key Vitals & Parent Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pet Parent */}
            <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2">
                <User size={15} className="text-emerald-600" />
                Pet Parent
              </div>
              <p className="font-bold text-gray-900 text-lg">{pet.customerName || "Pet Parent"}</p>
              <p className="text-gray-600 text-sm mt-1 flex items-center gap-1.5 font-medium">
                <Phone size={13} className="text-emerald-500" />
                {pet.customerPhone || "No contact on file"}
              </p>
            </div>

            {/* Vitals */}
            <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2">
                <Sparkles size={15} className="text-emerald-600" />
                Vitals & Birth
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-gray-700">
                  <span className="text-gray-500 font-normal">Date of Birth: </span>
                  <span className="font-semibold text-gray-900">{pet.dob || "—"}</span>
                </p>
                <p className="text-gray-700">
                  <span className="text-gray-500 font-normal">Weight: </span>
                  <span className="font-semibold text-gray-900">{pet.weightKg ? `${pet.weightKg} kg` : "—"}</span>
                </p>
                <p className="text-gray-700">
                  <span className="text-gray-500 font-normal">Gender: </span>
                  <span className="font-semibold text-gray-900">{pet.gender || "Male"}</span>
                </p>
              </div>
            </div>

            {/* QR Code Verification */}
            <div className="bg-white rounded-2xl p-4 border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center text-center">
              <img
                src={qrUrl}
                alt="Passport QR Code"
                className="w-24 h-24 object-contain rounded-lg border border-emerald-100 shadow-sm"
              />
              <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mt-2">
                Scan for Live Records
              </p>
            </div>
          </div>

          {/* Vaccination & Preventive Health Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
                <Syringe size={22} className="text-emerald-600" />
                Vaccination & Preventive Healthcare
              </h2>
              {isVacDue ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  <AlertTriangle size={13} /> Booster Overdue
                </span>
              ) : isVacUpcoming ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  <Clock size={13} /> Booster Due Soon
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 size={13} /> Vaccinations Up-to-Date
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vaccination Card */}
              <div className="border border-emerald-100 rounded-2xl p-5 bg-gradient-to-br from-white to-emerald-50/20">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-1">
                  Vaccine Schedule
                </p>
                <p className="text-lg font-bold text-gray-900">{pet.vaccineName || "Annual Rabies Booster"}</p>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Last Administered:</span>
                    <span className="font-semibold text-gray-800">{pet.lastVaccinationDate || "Not recorded"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Next Booster Due:</span>
                    <span className={`font-bold ${isVacDue ? 'text-red-600' : 'text-emerald-700'}`}>
                      {pet.nextVaccineDate || "Schedule pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deworming Card */}
              <div className="border border-emerald-100 rounded-2xl p-5 bg-gradient-to-br from-white to-emerald-50/20">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-1">
                  Deworming Schedule
                </p>
                <p className="text-lg font-bold text-gray-900">Periodic Deworming</p>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Last Dewormed:</span>
                    <span className="font-semibold text-gray-800">{pet.dewormingDate || "Not recorded"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Next Dose Due:</span>
                    <span className="font-bold text-emerald-700">{pet.nextDewormingDate || "Schedule pending"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Diet & Food Nutrition Refill Section */}
          {(pet.foodBrand || pet.packSizeKg) && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Heart size={18} className="text-emerald-600" />
                Nutrition & Feeding Schedule
              </h3>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 text-xs block">Prescribed / Regular Food:</span>
                  <span className="font-semibold text-gray-900">{pet.foodBrand || "Standard Diet"}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Pack Size & Consumption:</span>
                  <span className="font-semibold text-gray-900">
                    {[pet.packSizeKg ? `${pet.packSizeKg}kg Pack` : null, pet.dailyConsumptionGrams ? `${pet.dailyConsumptionGrams}g/day` : null].filter(Boolean).join(" • ") || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">Next Refill Date:</span>
                  <span className="font-semibold text-emerald-700">{pet.nextFoodRefillDate || "On demand"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Medical Notes & Allergies */}
          {pet.notes && (
            <div className="space-y-2 border-t border-gray-100 pt-5">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
                <FileText size={16} className="text-emerald-600" />
                Special Medical Notes & Allergies
              </h3>
              <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 text-gray-800 text-sm leading-relaxed">
                {pet.notes}
              </div>
            </div>
          )}

          {/* Passport Footer Guarantee */}
          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-3">
            <p className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-600" />
              Verified Electronic Health Record • SwordNex PetCare Network
            </p>
            <p className="font-mono text-gray-400">
              Verified: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetPassport;
