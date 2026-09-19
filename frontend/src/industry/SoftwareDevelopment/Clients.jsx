import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config/api";
import toast from "react-hot-toast";

import { useAuth } from "../../contexts/AuthContext";
import {
  BookOpen,
  UserPlus,
  Edit3,
  Trash2,
  Search,
  Users,
} from "lucide-react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";

const Clients = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
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
    const fetchClients = async () => {
      try {
        const res = await axios.get(`${API_URL}/clients`, {
          headers: { "x-auth-token": token },
        });

        const allClients = res?.data && Array.isArray(res.data) ? res.data : [];
        // Filter by source OR if they have software-specific fields (fallback if source is missing)
        const softwareClients = allClients.filter(c =>
          c.source === "Software_Development" || (c.projectName && c.projectType)
        );
        setClients(softwareClients);
      } catch (err) {
        console.error("Error fetching clients:", err);
        toast.error("Failed to fetch clients.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [currentUser]);

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

  /* ---------------- UI ---------------- */

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-600 rounded-xl text-white shadow-lg shadow-green-200">
              <Users size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
              <p className="text-sm text-gray-500">Manage client details and projects</p>
            </div>
          </div>

          <button
            onClick={() => navigate("/add-client")}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-md hover:shadow-lg font-medium"
          >
            <UserPlus size={18} />
            Add Client
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search clients, emails, phones or projects..."
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
                  <th className="px-6 py-4">Client Name</th>
                  <th className="px-6 py-4">Industry</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Project</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Deadline</th>
                  <th className="px-6 py-4">Budget</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {filteredClients.length > 0 ? (
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
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </BillingLayout>
  );
};

export default Clients;
