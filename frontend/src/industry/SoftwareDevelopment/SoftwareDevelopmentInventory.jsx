
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config/api";
import toast from "react-hot-toast";

import { useAuth } from "../../contexts/AuthContext";
import {
  BookOpen,
  PlusCircle,
  Edit3,
  Trash2,
  Search,
  Loader2,
  Code,
  Globe,
  Smartphone,
  Server,
  Monitor,
  UserPlus,
  Users,
} from "lucide-react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";

const SoftwareDevelopmentInventory = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [activeView, setActiveView] = useState(location.state?.activeView || "services"); // "services" or "clients"
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  /* ---------------- FETCH DATA ---------------- */

  useEffect(() => {
    if (!currentUser) return;
    const token = sessionStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const fetchData = async () => {
      try {
        const [servicesRes, clientsRes] = await Promise.all([
          axios.get(`${API_URL}/products`, {
            headers: { "x-auth-token": token },
          }),
          axios.get(`${API_URL}/clients`, {
            headers: { "x-auth-token": token },
          })
        ]);

        // Process Services
        const softwareServices = servicesRes.data.filter(p => p.industry === "software_development");
        const mappedServices = softwareServices.map(p => ({
          id: p.id,
          serviceName: p.name,
          serviceCode: p.sku,
          category: p.category,
          duration: p.duration,
          lead: p.supplier,
          platform: p.model,
          price: p.salePrice || p.salesPrice,
          hourlyRate: p.hourlyRate,
          dailyRate: p.dailyRate,
          maintenanceRate: p.maintenanceRate,
          activeClients: p.quantity,
          ...p
        }));
        setServices(mappedServices);

        // Process Clients
        const allClients = clientsRes?.data && Array.isArray(clientsRes.data) ? clientsRes.data : [];
        // Filter by source OR if they have software-specific fields (fallback if source is missing)
        const softwareClients = allClients.filter(c =>
          c.source === "Software_Development" || (c.projectName && c.projectType)
        );
        setClients(softwareClients);

      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Failed to fetch data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleEdit = (service) => {
    navigate("/add-product", {
      state: { product: service, productId: service.id },
    });
  };

  const handleDelete = async (id) => {
    if (!currentUser) return;
    const token = sessionStorage.getItem("token");
    if (!token) return;

    if (window.confirm("Are you sure you want to delete this service?")) {
      try {
        await axios.delete(`${API_URL}/products/${id}`, {
          headers: { "x-auth-token": token },
        });
        setServices(prevServices => prevServices.filter(service => service.id !== id));
        toast.success("Service deleted successfully!");
      } catch (err) {
        console.error("Error deleting service:", err);
        toast.error("Failed to delete service.");
      }
    }
  };

  const handleEditClient = (client) => {
    navigate("/add-client", {
      state: { client: client, clientId: client.id },
    });
  };

  const handleDeleteClient = async (id) => {
    if (!currentUser) return;
    const token = sessionStorage.getItem("token");
    if (!token) return;

    if (window.confirm("Are you sure you want to delete this client?")) {
      try {
        await axios.delete(`${API_URL}/clients/${id}`, {
          headers: { "x-auth-token": token },
        });
        setClients(prev => prev.filter(c => c.id !== id));
        toast.success("Client deleted successfully!");
      } catch (err) {
        console.error("Error deleting client:", err);
        toast.error("Failed to delete client.");
      }
    }
  };

  /* ---------------- FILTER ---------------- */

  const filteredServices = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return services.filter(
      (s) =>
        (s.serviceName || "").toLowerCase().includes(term) ||
        (s.serviceCode || "").toLowerCase().includes(term) ||
        (s.lead || "").toLowerCase().includes(term) ||
        (s.category || "").toLowerCase().includes(term)
    );
  }, [services, searchTerm]);

  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return clients.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term) ||
        String(c.mobile || "").toLowerCase().includes(term) ||
        (c.projectName || "").toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  /* ---------------- LOADING ---------------- */

  // if (isLoading) {
  //   return (
  //     <BillingLayout>
  //       <div className="flex items-center justify-center h-screen">
  //         <Loader2 className="animate-spin text-emerald-600" size={40} />
  //       </div>
  //     </BillingLayout>
  //   );
  // }

  /* ---------------- UI ---------------- */

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-600 rounded-xl text-white shadow-lg shadow-green-200">
              <Code size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Software Services</h1>
              <p className="text-sm text-gray-500">Manage projects, services, and resources</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/add-client")}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-green-600 border border-green-200 rounded-xl hover:bg-green-50 transition-all shadow-sm hover:shadow-md font-medium"
            >
              <UserPlus size={18} />
              Add Client
            </button>

            <button
              onClick={() => navigate("/add-service")}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-md hover:shadow-lg font-medium"
            >
              <PlusCircle size={18} />
              Add Service
            </button>
          </div>
        </div>

        {/* View Toggles */}
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button
            className={`pb-2 px-4 font-medium transition-colors relative ${activeView === "services"
                ? "text-green-600"
                : "text-gray-500 hover:text-gray-700"
              }`}
            onClick={() => setActiveView("services")}
          >
            Service Details
            {activeView === "services" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-green-600 rounded-t-full" />
            )}
          </button>
          <button
            className={`pb-2 px-4 font-medium transition-colors relative ${activeView === "clients"
                ? "text-green-600"
                : "text-gray-500 hover:text-gray-700"
              }`}
            onClick={() => setActiveView("clients")}
          >
            Client Details
            {activeView === "clients" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-green-600 rounded-t-full" />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={activeView === "services" ? "Search services, codes, categories or leads..." : "Search clients, emails, phones or projects..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all bg-white shadow-sm"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  {activeView === "services" ? (
                    <>
                      <th className="px-6 py-4">Service Name</th>
                      <th className="px-6 py-4">Code</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Platform/Type</th>
                      <th className="px-6 py-4">Lead/Resource</th>
                      <th className="px-6 py-4 text-center">Active Clients</th>
                      <th className="px-6 py-4 text-right">Rates</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4">Client Name</th>
                      <th className="px-6 py-4">Industry</th>
                      <th className="px-6 py-4">Contact</th>
                      <th className="px-6 py-4">Project</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Deadline</th>
                      <th className="px-6 py-4">Budget</th>
                      <th className="px-6 py-4">Actions</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {activeView === "services" ? (
                  filteredServices.length > 0 ? (
                    filteredServices.map((service) => (
                      <tr key={service.id} className="hover:bg-green-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                              {service.category?.toLowerCase().includes("web") ? <Globe size={20} /> :
                                service.category?.toLowerCase().includes("mobile") ? <Smartphone size={20} /> :
                                  service.category?.toLowerCase().includes("backend") ? <Server size={20} /> :
                                    <Monitor size={20} />}
                            </div>
                            <span className="font-semibold text-gray-800">{service.serviceName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-600">{service.serviceCode || "N/A"}</code>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{service.category || "General"}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{service.platform || "—"}</td>
                        <td className="px-6 py-4">
                          {service.lead ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              {service.lead}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${service.activeClients > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {service.activeClients || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                          <div className="flex flex-col gap-1 items-end">
                            {service.hourlyRate > 0 && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">₹{service.hourlyRate}/hr</span>}
                            {service.dailyRate > 0 && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">₹{service.dailyRate}/day</span>}
                            {service.maintenanceRate > 0 && <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">₹{service.maintenanceRate} AMC</span>}
                            {!service.hourlyRate && !service.dailyRate && !service.maintenanceRate && <span className="text-gray-400 text-xs">—</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(service)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit Service"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(service.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Service"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 bg-gray-50 rounded-full">
                            <Code size={24} className="text-gray-400" />
                          </div>
                          <p>No services found</p>
                        </div>
                      </td>
                    </tr>
                  )
                ) : (
                  filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-green-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-800">{client.name}</span>
                            <span className="text-xs text-gray-500">{client.contactPerson}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{client.industry || "—"}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-700">{client.email || "—"}</span>
                            <span className="text-xs text-gray-500">{client.mobile || "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-800">{client.projectName || "—"}</td>
                        <td className="px-6 py-4">
                          {client.projectType ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {client.projectType}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{client.deadline || "—"}</td>
                        <td className="px-6 py-4 text-sm text-gray-800">{client.budget || "—"}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditClient(client)}
                              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View Client"
                            >
                              <BookOpen size={16} />
                            </button>
                            <button
                              onClick={() => handleEditClient(client)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit Client"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClient(client.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Client"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 bg-gray-50 rounded-full">
                            <Users size={24} className="text-gray-400" />
                          </div>
                          <p>No clients found</p>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </BillingLayout>
  );
};

export default SoftwareDevelopmentInventory;

