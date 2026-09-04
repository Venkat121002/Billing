

import React, { useState, useEffect } from "react";
import { ChevronDown, CalendarDays, ArrowLeft, Save, Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import axios from "axios";
import API_URL from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

const ClientInformationForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [services, setServices] = useState([]);
  const [pricingModel, setPricingModel] = useState('hourly');

  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    mobile: "",
    companyWebsite: "",
    industry: "",
    address: "",
    projectName: "",
    projectType: "",
    communication: "",
    budget: "",
    deadline: "",
    existingWebsite: "",
    domainStatus: false,
    hostingStatus: false,
    requirements: "",
    referenceWebsites: "",
    notes: "",
    gstPercent: 0,
    gstAmount: 0
  });

  useEffect(() => {
    const fetchServices = async () => {
      if (!currentUser) return;
      const token = sessionStorage.getItem("token");
      if (!token) return;

      try {
        const res = await axios.get(`${API_URL}/products`, {
          headers: { "x-auth-token": token },
        });
        const softwareServices = res.data.filter(p => p.industry === "software_development");
        setServices(softwareServices);
      } catch (error) {
        console.error("Failed to fetch services", error);
        toast.error("Could not load service rates.");
      }
    };

    fetchServices();
  }, [currentUser]);

  useEffect(() => {
    if (location.state?.client) {
      const client = location.state.client;
      setFormData({
        companyName: client.companyName || client.name || "",
        contactPerson: client.contactPerson || "",
        email: client.email || "",
        mobile: client.mobile || client.phone || "",
        companyWebsite: client.companyWebsite || "",
        industry: client.industry || "",
        address: client.address || "",
        projectName: client.projectName || "",
        projectType: client.projectType || "",
        communication: client.communication || "",
        budget: client.budget || "",
        deadline: client.deadline || "",
        existingWebsite: client.existingWebsite || "",
        domainStatus: client.domainStatus || false,
        hostingStatus: client.hostingStatus || false,
        requirements: client.requirements || "",
        referenceWebsites: client.referenceWebsites || "",
        notes: client.notes || "",
        gstPercent: client.gstPercent || 0,
        gstAmount: client.gstAmount || 0
      });
    }
  }, [location.state]);

  useEffect(() => {
    if (!formData.projectType || services.length === 0) return;

    const service = services.find(s => s.category === formData.projectType);
    if (!service) return;

    let rate = '';
    const gstPercent = service.salesGst || service.gstRate || 0;

    if (pricingModel === 'hourly' && service.hourlyRate) {
      rate = String(service.hourlyRate);
    } else if (pricingModel === 'days' && service.dailyRate) {
      rate = String(service.dailyRate);
    }

    // Only update if a rate is found, to avoid clearing manual entries.
    if (rate) {
      const inclusiveBudget = Number(rate) || 0;
      const baseBudget = inclusiveBudget / (1 + gstPercent / 100);
      const gstAmount = inclusiveBudget - baseBudget;

      setFormData(prev => ({ 
        ...prev, 
        budget: rate,
        gstPercent: gstPercent,
        gstAmount: gstAmount.toFixed(2)
      }));
    }
  }, [formData.projectType, pricingModel, services]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      toast.error("Please login first");
      return;
    }

    if (!formData.companyName || !formData.mobile) {
      toast.error("Client Name and mobile are required");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = sessionStorage.getItem("token");
      const config = {
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
      };

      const payload = {
        ...formData,
        name: formData.companyName,
        mobile: formData.mobile,
        source: "Software_Development"
      };

    

      if (location.state?.clientId) {
        const response = await axios.put(`${API_URL}/clients/${location.state.clientId}`, payload, config);
       
        toast.success("Client updated successfully!");
      } else {
        const response = await axios.post(`${API_URL}/clients`, payload, config);
       toast.success("Client added successfully!");
      }

      if (location.state?.from === "billing") {
        navigate("/billing");
      } else {
        navigate("/softwaredevelopmentinventory", {
          state: { activeView: "clients" }
        });
      }

    } catch (error) {
      console.error("Submission Error:", error);

      if (error.response) {
        console.error("Backend Error Response:", error.response.data);
        toast.error(error.response.data?.message || "Failed to save client. Check console.");
      } else if (error.request) {
        toast.error("Server not responding");
      } else {
        toast.error("Request error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BillingLayout>
      <div className="min-h-screen bg-[#edf2f8] px-10 py-6">
        <div className="mx-auto max-w-[980px]">
          {/* Header */}
          <div className="mb-5 flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-[#dbe3ef] transition-colors text-[#5b6f8e]"
              title="Go Back"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-[34px] font-semibold leading-none text-[#334b6c]">
              {location.state?.clientId ? "Edit Client" : "Client Information"}
            </h1>

            <button
              type="button"
              className="rounded-full border border-[#cfd8e6] bg-[#f5f8fc] px-5 py-2 text-[14px] font-medium text-[#5b6f8e]"
            >
              {location.state?.clientId ? "Update Entry" : "New Client Entry"}
            </button>
          </div>

          <div className="mb-3 border-t border-[#dbe3ef]" />

          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Client Details */}
            <section>
              <h2 className="mb-3 pl-3 text-[18px] font-semibold text-[#556f93]">
                Client Details
              </h2>

              <div className="rounded-[10px] border border-[#d7e0ec] bg-white px-5 py-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                  <div>
                    <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                      Client / Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      required
                      value={formData.companyName}
                      onChange={handleChange}
                      className="h-[40px] w-full rounded-[9px] border border-[#ccd8e7] bg-white px-3 outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleChange}
                      className="h-[40px] w-full rounded-[9px] border border-[#ccd8e7] bg-white px-3 outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="h-[40px] w-full rounded-[9px] border border-[#ccd8e7] bg-white px-3 outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                      mobile / WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="mobile"
                      required
                      value={formData.mobile}
                      onChange={handleChange}
                      className="h-[40px] w-full rounded-[9px] border border-[#ccd8e7] bg-white px-3 outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                      Company Website
                    </label>
                    <input
                      type="text"
                      name="companyWebsite"
                      value={formData.companyWebsite}
                      onChange={handleChange}
                      className="h-[40px] w-full rounded-[9px] border border-[#ccd8e7] bg-white px-3 outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                      Business Industry
                    </label>
                    <div className="relative">
                      <select
                        name="industry"
                        value={formData.industry}
                        onChange={handleChange}
                        className="h-[40px] w-full appearance-none rounded-[9px] border border-[#ccd8e7] bg-white px-3 pr-10 text-[#486486] outline-none"
                      >
                        <option value="">Select Industry</option>
                        <option value="Technology">Technology</option>
                        <option value="Retail">Retail</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Education">Education</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Other">Other</option>
                      </select>
                      <ChevronDown
                        size={20}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#587197]"
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                      Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="h-[40px] w-full rounded-[9px] border border-[#ccd8e7] bg-white px-3 outline-none"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Project Overview */}
            <section>
              <div className="mb-3 border-t border-[#dbe3ef]" />
              <h2 className="mb-3 pl-3 text-[18px] font-semibold text-[#556f93]">
                Project Overview
              </h2>

              <div className="rounded-[10px] border border-[#d7e0ec] bg-white px-5 py-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="grid grid-cols-3 gap-x-5 gap-y-5">
                  <div>
                    <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                      Project Name
                    </label>
                    <input
                      type="text"
                      name="projectName"
                      value={formData.projectName}
                      onChange={handleChange}
                      className="h-[40px] w-full rounded-[9px] border border-[#ccd8e7] bg-white px-3 outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                      Project Type
                    </label>
                    <div className="relative">
                      <select
                        name="projectType"
                        value={formData.projectType}
                        onChange={handleChange}
                        className="h-[40px] w-full appearance-none rounded-[9px] border border-[#ccd8e7] bg-white px-3 pr-10 text-[#486486] outline-none"
                      >
                        <option value="">Select Category</option>
                        <option value="Web Development">Web Development</option>
                        <option value="Mobile App">Mobile App</option>
                        <option value="UI/UX Design">UI/UX Design</option>
                        <option value="DevOps">DevOps</option>
                        <option value="QA Testing">QA Testing</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Consulting">Consulting</option>
                      </select>
                      <ChevronDown
                        size={20}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#587197]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                      Preferred Communication
                    </label>
                    <div className="relative">
                      <select
                        name="communication"
                        value={formData.communication}
                        onChange={handleChange}
                        className="h-[40px] w-full appearance-none rounded-[9px] border border-[#ccd8e7] bg-white px-3 pr-10 text-[#486486] outline-none"
                      >
                        <option value="">Select</option>
                        <option value="Email">Email</option>
                        <option value="mobile">mobile</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Slack/Teams">Slack/Teams</option>
                      </select>
                      <ChevronDown
                        size={20}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#587197]"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 grid grid-cols-2 gap-5">
                    <div>
                      <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                        Pricing Model
                      </label>
                      <div className="flex h-[40px] items-center gap-5 rounded-[9px] border border-[#ccd8e7] px-3">
                        <label className="flex items-center gap-2 text-[14px] text-[#486486]">
                          <input
                            type="radio"
                            name="pricingModel"
                            value="hourly"
                            checked={pricingModel === 'hourly'}
                            onChange={(e) => setPricingModel(e.target.value)}
                            className="h-4 w-4 rounded border-[#bccbdd]"
                          />
                          Hourly
                        </label>
                        <label className="flex items-center gap-2 text-[14px] text-[#486486]">
                          <input
                            type="radio"
                            name="pricingModel"
                            value="days"
                            checked={pricingModel === 'days'}
                            onChange={(e) => setPricingModel(e.target.value)}
                            className="h-4 w-4 rounded border-[#bccbdd]"
                          />
                          Days
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                        Budget Range
                      </label>
                      <input
                        type="text"
                        name="budget"
                        value={formData.budget}
                        onChange={handleChange}
                        placeholder="e.g. ₹500/hr or ₹50000"
                        className="h-[40px] w-full rounded-[9px] border border-[#ccd8e7] bg-white px-3 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                      Project Deadline
                    </label>

                    <div className="relative">
                      <input
                        type="date"
                        name="deadline"
                        value={formData.deadline}
                        onChange={handleChange}
                        placeholder="Select Date"
                        className="h-[40px] w-full rounded-[9px] border border-[#ccd8e7] bg-white px-3 text-[#486486] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Current Setup */}
            <section>
              <div className="mb-3 border-t border-[#dbe3ef]" />
              <h2 className="mb-3 pl-3 text-[18px] font-semibold text-[#556f93]">
                Current Setup
              </h2>

              <div className="rounded-[10px] border border-[#d7e0ec] bg-white px-5 py-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                      Existing Website (if any)
                    </label>
                    <input
                      type="text"
                      name="existingWebsite"
                      value={formData.existingWebsite}
                      onChange={handleChange}
                      className="h-[40px] w-full rounded-[9px] border border-[#ccd8e7] bg-white px-3 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                        Domain Status
                      </label>
                      <div className="flex h-[40px] items-center gap-5 rounded-[9px] border border-[#ccd8e7] px-3">
                        <label className="flex items-center gap-2 text-[14px] text-[#486486]">
                          <input
                            type="radio"
                            name="domainStatus"
                            value={false}
                            checked={formData.domainStatus === false}
                            onChange={() => setFormData({ ...formData, domainStatus: false })}
                            className="h-4 w-4 rounded border-[#bccbdd]"
                          />
                          Need Domain
                        </label>
                        <label className="flex items-center gap-2 text-[14px] text-[#486486]">
                          <input
                            type="radio"
                            name="domainStatus"
                            value={true}
                            checked={formData.domainStatus === true}
                            onChange={() => setFormData({ ...formData, domainStatus: true })}
                            className="h-4 w-4 rounded border-[#bccbdd]"
                          />
                          Already Owned
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                        Hosting Status
                      </label>
                      <div className="flex h-[40px] items-center gap-5 rounded-[9px] border border-[#ccd8e7] px-3">
                        <label className="flex items-center gap-2 text-[14px] text-[#486486]">
                          <input
                            type="radio"
                            name="hostingStatus"
                            value={false}
                            checked={formData.hostingStatus === false}
                            onChange={() => setFormData({ ...formData, hostingStatus: false })}
                            className="h-4 w-4 rounded border-[#bccbdd]"
                          />
                          Need Hosting
                        </label>
                        <label className="flex items-center gap-2 text-[14px] text-[#486486]">
                          <input
                            type="radio"
                            name="hostingStatus"
                            value={true}
                            checked={formData.hostingStatus === true}
                            onChange={() => setFormData({ ...formData, hostingStatus: true })}
                            className="h-4 w-4 rounded border-[#bccbdd]"
                          />
                          Already Set Up
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Requirements */}
            <section>
              <div className="mb-3 border-t border-[#dbe3ef]" />
              <h2 className="mb-3 pl-3 text-[18px] font-semibold text-[#556f93]">
                Requirements
              </h2>

              <div className="rounded-[10px] border border-[#d7e0ec] bg-white px-5 py-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                        Required Pages / Features
                      </label>
                      <textarea
                        rows={2}
                        name="requirements"
                        value={formData.requirements}
                        onChange={handleChange}
                        className="w-full rounded-[9px] border border-[#ccd8e7] bg-white px-3 py-2 outline-none"
                        placeholder="e.g. Home, About, Services, Contact, Blog..."
                      />
                    </div>


                  </div>

                  <div>
                    <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                      Reference Websites
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="referenceWebsites"
                        value={formData.referenceWebsites}
                        onChange={handleChange}
                        placeholder="Add Links (e.g. example.com)"
                        className="h-[40px] w-full rounded-[9px] border border-[#ccd8e7] bg-white px-3 pr-10 text-[#486486] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[16px] font-medium text-[#486486]">
                      Notes / Special Requirements
                    </label>
                    <textarea
                      rows={4}
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      className="w-full rounded-[9px] border border-[#ccd8e7] bg-white px-3 py-3 outline-none"
                      placeholder="Any specific functionalities or integrations needed?"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Submit */}
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 h-[46px] min-w-[250px] rounded-[10px] bg-[#2f80ed] px-8 text-[18px] font-medium text-white shadow-[0_8px_20px_rgba(47,128,237,0.25)] hover:bg-[#256bd1] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} /> {location.state?.clientId ? "Update Client" : "Save Client"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </BillingLayout>
  );
};

export default ClientInformationForm;