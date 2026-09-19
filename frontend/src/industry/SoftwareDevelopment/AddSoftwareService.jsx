
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import {
  ArrowLeft,
  Code,
  Save,
  X,
  DollarSign,
  FileText,
  User,
  Clock,
  Hash,
  Tag,
  Layers
} from "lucide-react";
import toast from "react-hot-toast";
import API_URL from "../../config/api";

const InputField = ({ label, icon: Icon, value, onChange, type = "text", placeholder, name, required = false, className = "" }) => (
  <div className="flex flex-col gap-1.5">
    <label className="flex items-center gap-2 text-sm font-semibold text-green-800">
      {Icon && <Icon size={15} className="text-green-500" />}
      {label}
      {required && <span className="text-red-400 text-xs">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder || label}
      required={required}
      className={`px-4 py-3 rounded-xl border border-green-100 bg-white text-gray-700 placeholder-gray-400 
        focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 
        transition-all duration-200 hover:border-green-300 ${className}`}
    />
  </div>
);

const AddSoftwareService = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const editingProduct = location.state?.product;
  const editingProductId = location.state?.productId;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [baseRates, setBaseRates] = useState({ hourly: 0, daily: 0 });
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    model: "", // Using 'model' for Tech Stack/Platform
    supplier: "", // Using 'supplier' for Lead/Resource
    purchasePrice: "", // Cost
    salePrice: "", // Price
    hourlyRate: "",
    dailyRate: "",
    maintenanceRate: "",
    salesGst: "",
    duration: "",
    description: "",
  });

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name || "",
        sku: editingProduct.sku || "",
        category: editingProduct.category || "",
        model: editingProduct.model || "",
        supplier: editingProduct.supplier || "",
        purchasePrice: editingProduct.purchasePrice || "",
        salePrice: editingProduct.salePrice || editingProduct.salesPrice || "",
        hourlyRate: editingProduct.hourlyRate || "",
        dailyRate: editingProduct.dailyRate || "",
        maintenanceRate: editingProduct.maintenanceRate || "",
        salesGst: editingProduct.salesGst || editingProduct.gstRate || "",
        duration: editingProduct.duration || "",
        description: editingProduct.description || "",
      });

      const gst = Number(editingProduct.salesGst || editingProduct.gstRate || 0);
      const hRate = Number(editingProduct.hourlyRate) || 0;
      const dRate = Number(editingProduct.dailyRate) || 0;
      setBaseRates({
        hourly: gst > 0 ? hRate / (1 + gst / 100) : hRate,
        daily: gst > 0 ? dRate / (1 + gst / 100) : dRate
      });
    } else {
        // Generate a random SKU for new services
        const randomSku = `SRV-${Math.floor(1000 + Math.random() * 9000)}`;
        setFormData(prev => ({ ...prev, sku: randomSku }));
    }
  }, [editingProduct]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "salesGst") {
      const gst = Number(value) || 0;
      setFormData(prev => ({
        ...prev,
        [name]: value,
        hourlyRate: baseRates.hourly > 0 ? (baseRates.hourly * (1 + gst / 100)).toFixed(2) : prev.hourlyRate,
        dailyRate: baseRates.daily > 0 ? (baseRates.daily * (1 + gst / 100)).toFixed(2) : prev.dailyRate
      }));
    } else if (name === "hourlyRate" || name === "dailyRate") {
      const numValue = Number(value) || 0;
      // Treat manual input as the base rate for future GST calculations
      setBaseRates(prev => ({ ...prev, [name === "hourlyRate" ? "hourly" : "daily"]: numValue }));
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
        toast.error("User not authenticated");
        return;
    }
    setIsSubmitting(true);

    const token = sessionStorage.getItem("token");
    const config = { headers: { "x-auth-token": token } };

    const payload = {
      ...formData,
      purchasePrice: Number(formData.purchasePrice) || 0,
      salePrice: Number(formData.salePrice) || 0,
      hourlyRate: Number(formData.hourlyRate) || 0,
      dailyRate: Number(formData.dailyRate) || 0,
      maintenanceRate: Number(formData.maintenanceRate) || 0,
      salesGst: Number(formData.salesGst) || 0,
      quantity: 1, // Default quantity for services
      industry: "software_development",
      reorderLevel: 0,
    };

    try {
      if (editingProductId) {
        await axios.put(`${API_URL}/products/${editingProductId}`, payload, config);
        toast.success("Service updated successfully!");
      } else {
        await axios.post(`${API_URL}/products`, payload, config);
        toast.success("Service added successfully!");
      }
      navigate("/softwaredevelopmentinventory");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6 shadow-lg">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Code size={26} className="text-green-100" />
                {editingProductId ? "Edit Software Service" : "Add New Service"}
              </h1>
              <p className="text-green-100 text-sm mt-1 ml-10">
                Manage service details, pricing, and resources
              </p>
            </div>

            <button
              onClick={() => navigate("/softwaredevelopmentinventory")}
              className="flex items-center gap-2 bg-white/90 backdrop-blur px-5 py-2.5 rounded-xl text-green-700 font-medium hover:bg-white hover:shadow-md transition-all duration-200"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </div>

        {/* FORM */}
        <div className="px-8 py-10 max-w-5xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-10 rounded-3xl shadow-xl border border-green-100 space-y-8"
          >
            {/* Service Basic Info */}
            <div>
              <h3 className="flex items-center gap-2 text-green-700 font-bold text-lg mb-5 pb-2 border-b border-green-100">
                <Layers size={20} className="text-green-500" />
                Service Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField label="Service Name" icon={Code} name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Web Development" required />
                <InputField label="Service Code (SKU)" icon={Hash} name="sku" value={formData.sku} onChange={handleChange} placeholder="e.g. SRV-001" />
                <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-green-800">
                        <Tag size={15} className="text-green-500" />
                        Category
                    </label>
                    <select name="category" value={formData.category} onChange={handleChange} className="px-4 py-3 rounded-xl border border-green-100 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-all duration-200 hover:border-green-300">
                        <option value="">Select Category</option>
                        <option value="Web Development">Web Development</option>
                        <option value="Mobile App">Mobile App</option>
                        <option value="UI/UX Design">UI/UX Design</option>
                        <option value="DevOps">DevOps</option>
                        <option value="QA Testing">QA Testing</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Consulting">Consulting</option>
                    </select>
                </div>
                <InputField label="Tech Stack / Platform" icon={Layers} name="model" value={formData.model} onChange={handleChange} placeholder="e.g. MERN Stack, Flutter, AWS" />
              </div>
            </div>

            {/* Resource & Pricing */}
            <div>
              <h3 className="flex items-center gap-2 text-green-700 font-bold text-lg mb-5 pb-2 border-b border-green-100">
                <DollarSign size={20} className="text-green-500" />
                Resource & Pricing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputField label="Lead / Resource Name" icon={User} name="supplier" value={formData.supplier} onChange={handleChange} placeholder="e.g. John Doe (Lead)" />
                <InputField label="Estimated Duration" icon={Clock} name="duration" value={formData.duration} onChange={handleChange} placeholder="e.g. 2 Weeks, 1 Month" />
                <InputField label="Hourly Rate (₹)" icon={DollarSign} name="hourlyRate" type="number" value={formData.hourlyRate} onChange={handleChange} placeholder="0.00" />
                <InputField label="Daily Rate (₹)" icon={DollarSign} name="dailyRate" type="number" value={formData.dailyRate} onChange={handleChange} placeholder="0.00" />
                <InputField label="Maintenance Rate (₹)" icon={DollarSign} name="maintenanceRate" type="number" value={formData.maintenanceRate} onChange={handleChange} placeholder="0.00" />
                <InputField label="GST (%)" icon={FileText} name="salesGst" type="number" value={formData.salesGst} onChange={handleChange} placeholder="18" />
              </div>
            </div>

            {/* Description */}
            <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-green-800 mb-2">
                    <FileText size={15} className="text-green-500" />
                    Description
                </label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-green-100 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-all duration-200 hover:border-green-300 min-h-[100px]" placeholder="Enter detailed service description..." />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-green-100">
              <button type="button" onClick={() => navigate("/softwaredevelopmentinventory")} className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium">
                <X size={16} /> Cancel
              </button>

              <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
                <Save size={16} /> {isSubmitting ? "Saving..." : editingProductId ? "Update Service" : "Save Service"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </BillingLayout>
  );
};

export default AddSoftwareService;