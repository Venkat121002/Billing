
import { useEffect, useState } from "react";
import { Menu, X, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sessionrecord } from "./Sessionrecord";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import icon from "../../assets/images/BILLING LOGO .png";
import axios from "axios";

const SuperAdmin = () => {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("registered");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 🔹 For date filter
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // 🔹 For selection and deletion
  const [selectedCompanies, setSelectedCompanies] = useState([]);

  // 🔹 Notifications
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState("Info");
  const [targetAudience, setTargetAudience] = useState("All");

  // 🔐 Check authentication on mount
  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem("superAdminLoggedIn");
    const token = sessionStorage.getItem("token");

    if (!isLoggedIn || !token) {
      navigate("/superadmin/login");
    }
  }, [navigate]);

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
  });
  // Add token to headers
  api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("token");
    if (token) config.headers["x-auth-token"] = token;
    return config;
  });

  // ✅ Fetch registered companies from SQL Backend
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await api.get('/admin/tenants');
        setCompanies(res.data);
      } catch (error) {
        console.error("Error fetching companies:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  // ✅ Helper for getting JS Date
  const getCreatedDate = (comp) => {
    if (!comp?.createdAt) return null;
    const d = new Date(comp.createdAt);
    return isNaN(d.getTime()) ? null : d;
  };

  // ✅ Filter by search
  const filteredCompanies = companies.filter((comp) =>
    comp.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Handle Excel download (with optional date range)
  const handleDownloadExcel = () => {
    if ((fromDate && !toDate) || (!fromDate && toDate)) {
      alert("Please select both From and To dates or leave both empty.");
      return;
    }

    let fromBoundary = null;
    let toBoundary = null;
    if (fromDate && toDate) {
      fromBoundary = new Date(fromDate + "T00:00:00");
      toBoundary = new Date(toDate + "T23:59:59.999");
      if (fromBoundary > toBoundary) {
        alert("From date cannot be after To date.");
        return;
      }
    }

    const companiesToExport = filteredCompanies.filter((comp) => {
      if (!fromBoundary || !toBoundary) return true;
      const created = getCreatedDate(comp);
      if (!created) return false;
      return created >= fromBoundary && created <= toBoundary;
    });

    if (companiesToExport.length === 0) {
      alert("No companies available for the selected date range.");
      return;
    }

    const formattedData = companiesToExport.map((comp, index) => ({
      "S.No": index + 1,
      "Business Name": comp.businessName || "-",
      Email: comp.email || "-",
      "Business Type": comp.businessType || "-",
      "Business Category": comp.businessCategory || "-",
      "No. of Employees": comp.numberOfEmployees || "-",
      City: comp.address?.city || "-",
      State: comp.address?.state || "-",
      Country: comp.address?.country || "-",
      GSTIN: comp.gstin || "-",
      Created: (() => {
        const d = getCreatedDate(comp);
        return d
          ? d.toLocaleString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })
          : "-";
      })(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registered Companies");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    let filename = "Registered_Companies";
    if (fromDate && toDate) filename += `_${fromDate}_to_${toDate}`;
    filename += ".xlsx";

    saveAs(blob, filename);
  };

  // ✅ Handle selection (checkbox toggle)
  const handleSelectCompany = (id) => {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // ✅ Handle Select All
  const handleSelectAll = () => {
    if (selectedCompanies.length === filteredCompanies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(filteredCompanies.map((comp) => comp.id));
    }
  };

  // ✅ Handle Delete Selected
  const handleDeleteSelected = async () => {
    if (selectedCompanies.length === 0) {
      alert("No companies selected to delete.");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedCompanies.length} companies? \n\nNOTE: This feature is currently disabled on the backend for safety.`
    );
    if (!confirmDelete) return;

    alert("Delete functionality is currently disabled in this view.");

    /* 
    // TODO: Implement Admin Delete API
    try {
      for (const id of selectedCompanies) {
        // await api.delete(/admin/tenant/${id});
      }

      setCompanies((prev) =>
        prev.filter((comp) => !selectedCompanies.includes(comp.id))
      );
      setSelectedCompanies([]);
      alert("Selected companies deleted successfully.");
    } catch (err) {
      console.error("Error deleting companies:", err);
      alert("Some error occurred while deleting. Check console.");
    }
    */

  };

  const handleSendNotification = async () => {
    if (!notifTitle || !notifMessage) {
      alert("Title and Message are required");
      return;
    }

    try {
      await api.post("/notifications/broadcast", {
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        target_audience: targetAudience
      });
      alert("Notification Broadcast Sent Successfully!");
      setNotifTitle("");
      setNotifMessage("");
    } catch (err) {
      console.error("Failed to send notification", err);
      alert("Failed to send notification.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading companies...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col">

      {/* ================= NAVBAR ================= */}
      <nav className="bg-white border-b border-green-100 shadow-sm px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <a href="https://swordnex.com/">
            <img src={icon} alt="Logo" className="h-[5vh]" />
          </a>

          <span className="text-sm font-semibold text-green-700 bg-green-100 px-4 py-1 rounded-full">
            Super Admin
          </span>
        </div>
      </nav>

      {/* ================= TITLE ================= */}
      <div className="text-center mt-8 mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          Super Admin Panel
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Manage registered companies and system notifications
        </p>
      </div>

      {/* ================= TABS ================= */}
      <div className="flex justify-center mb-8 px-4">
        <div className="bg-white rounded-2xl border border-green-200 p-1 flex shadow-md">
          {["registered", "login", "notifications"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300
              ${activeTab === tab
                  ? "bg-green-600 text-white shadow-md"
                  : "text-green-700 hover:bg-green-50"
                }`}
            >
              {tab === "registered"
                ? "Registered Companies"
                : tab === "login"
                  ? "Companies Login"
                  : "Notifications"}
            </button>
          ))}
        </div>
      </div>

      {/* ================= SEARCH & FILTER ================= */}
      {activeTab === "registered" && (
        <div className="flex flex-col md:flex-row justify-center gap-4 mb-6 items-center px-6">

          <input
            type="text"
            placeholder="Search company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-[35%] px-4 py-3 rounded-xl border border-green-200 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
          />

          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 border border-green-200 rounded-lg"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 border border-green-200 rounded-lg"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownloadExcel}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-semibold shadow-sm transition"
            >
              Download Excel
            </button>

            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className="bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-xl transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ================= DELETE BUTTON ================= */}
      {activeTab === "registered" && selectedCompanies.length > 0 && (
        <div className="flex justify-center mb-4">
          <button
            onClick={handleDeleteSelected}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl shadow-md font-semibold transition"
          >
            Delete Selected ({selectedCompanies.length})
          </button>
        </div>
      )}

      {/* ================= CONTENT ================= */}
      <div className="flex-grow flex justify-center px-6 pb-10">

        {activeTab === "registered" ? (
          <div className="w-full max-w-7xl bg-white rounded-2xl shadow-lg border border-green-100 overflow-x-auto">

            {filteredCompanies.length === 0 ? (
              <div className="text-center text-gray-500 p-8">
                No Companies Found
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-green-50 border-b border-green-100">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={
                          selectedCompanies.length === filteredCompanies.length
                        }
                        onChange={handleSelectAll}
                      />
                    </th>
                    {[
                      "Logo", "Business Name", "Email", "Type", "Category",
                      "Employees", "City", "State", "Country", "GSTIN", "Created"
                    ].map((head) => (
                      <th
                        key={head}
                        className="px-4 py-3 text-left font-semibold text-green-700 whitespace-nowrap"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-green-50">
                  {filteredCompanies.map((comp) => (
                    <tr
                      key={comp.id}
                      className="hover:bg-green-50 transition"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedCompanies.includes(comp.id)}
                          onChange={() => handleSelectCompany(comp.id)}
                        />
                      </td>

                      <td className="px-4 py-3">
                        {comp.logoUrl ? (
                          <img
                            src={comp.logoUrl}
                            alt="Logo"
                            className="h-10 w-10 rounded-lg object-cover border border-green-100"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-xs text-green-700">
                            N/A
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 font-medium text-gray-800">
                        {comp.businessName}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {comp.email}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {comp.businessType}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {comp.businessCategory}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {comp.numberOfEmployees}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {comp.address?.city}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {comp.address?.state}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {comp.address?.country}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {comp.gstin || "-"}
                      </td>

                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {(() => {
                          const d = getCreatedDate(comp);
                          return d ? d.toLocaleString() : "-";
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        ) : activeTab === "login" ? (
          <div className="w-full max-w-6xl bg-white rounded-2xl shadow-lg border border-green-100 p-6">
            <Sessionrecord />
          </div>
        ) : (
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-green-100 p-8">

            <h3 className="text-xl font-bold text-gray-800 mb-6">
              Send Broadcast Notification
            </h3>

            <div className="space-y-6">
              <input
                type="text"
                placeholder="Notification Title"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-green-200 focus:ring-2 focus:ring-green-200 focus:border-green-500 outline-none"
              />

              <textarea
                rows="4"
                placeholder="Write your message..."
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-green-200 focus:ring-2 focus:ring-green-200 focus:border-green-500 outline-none resize-none"
              />

              <div className="grid md:grid-cols-2 gap-6">
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-green-200 bg-white"
                >
                  <option value="Info">Info</option>
                  <option value="Success">Success</option>
                  <option value="Warning">Warning</option>
                  <option value="Alert">Alert</option>
                </select>

                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-green-200 bg-white"
                >
                  <option value="All">All Users</option>
                  <option value="TenantAdmin">Admins Only</option>
                  <option value="User">Sub Users</option>
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSendNotification}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-semibold shadow-md transition"
                >
                  Send Notification
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= LOGOUT ================= */}
      <div className="border-t border-green-100 bg-white px-6 py-4 flex justify-end">
        <button
          onClick={() => setShowLogoutModal(true)}
          className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl font-semibold transition"
        >
          Logout
        </button>
      </div>

      {/* ================= LOGOUT MODAL ================= */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-sm w-full p-6 transform transition-all scale-100">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Logout</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to log out?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    sessionStorage.removeItem("superAdminLoggedIn");
                    sessionStorage.removeItem("token");
                    sessionStorage.removeItem("superAdmin");
                    navigate("/superadmin/login");
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 shadow-lg shadow-red-200 transition"
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );

};

export default SuperAdmin;
