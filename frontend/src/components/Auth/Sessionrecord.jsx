import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export const Sessionrecord = () => {
  const [sessions, setSessions] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Helper to create authenticated axios instance
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
  });
  api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("token");
    if (token) config.headers["x-auth-token"] = token;
    return config;
  });

  // 🔹 Fetch sessions from Backend
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get("/users/sessions");
        const data = res.data.map(session => ({
          id: session.id,
          businessName: session.User?.name || "Unknown", // Assuming User name is the business/user name
          email: session.User?.email || "Unknown",
          businessType: "-", // Not currently in SQL session, keep placeholder
          loginTime: session.login_time,
          logoutTime: session.logout_time,
          locationName: session.location_name || session.ip_address || "Unknown", // Fallback to IP
          logoUrl: null // Not in SQL yet
        }));
        setSessions(data);
        setFilteredData(data); // Initialize filtered data
      } catch (err) {
        console.error("Error fetching sessions:", err);
      }
    };
    fetchSessions();
  }, []);

  // 🔹 Filter Data
  useEffect(() => {
    if (!startDate && !endDate) {
      setFilteredData(sessions);
    } else {
      const filtered = sessions.filter((session) => {
        const login = new Date(session.loginTime);
        if (startDate && endDate) {
          return login >= startDate && login <= endDate;
        } else if (startDate) {
          return login >= startDate;
        } else if (endDate) {
          return login <= endDate;
        }
        return true;
      });
      setFilteredData(filtered);
    }
  }, [sessions, startDate, endDate]);

  // Helper function for consistent date formatting
  const formatDateTime = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  };

  // 🔹 Excel download
  const handleDownloadExcel = () => {
    if (filteredData.length === 0) {
      alert("No data available to download!");
      return;
    }

    const formattedData = filteredData.map((session, index) => ({
      "S.No": index + 1,
      "Name": session.businessName,
      "Email": session.email,
      "In Time": formatDateTime(session.loginTime) || "--",
      "Out Time": formatDateTime(session.logoutTime) || "Active",
      "Location/IP": session.locationName || "--",
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Session Records");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "Session_Records.xlsx");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-6">
      <div className="flex flex-wrap justify-between items-center w-full max-w-5xl mb-4 gap-3">
        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-700">From:</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            className="border border-gray-300 rounded-lg p-2"
            placeholderText="Start Date"
          />
          <label className="font-medium text-gray-700">To:</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            className="border border-gray-300 rounded-lg p-2"
            placeholderText="End Date"
          />
        </div>

        <button
          onClick={handleDownloadExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition"
        >
          Download Excel
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-6 text-gray-800">Login Sessions</h1>

      <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-green-400 w-full max-w-5xl">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-green-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                In Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Out Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Location/IP
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y border-4 border-green-400 divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  No session records found.
                </td>
              </tr>
            ) : (
              filteredData.map((session) => (
                <tr key={session.id} className="hover:bg-green-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                    {session.logoUrl ? (
                      <img
                        src={session.logoUrl}
                        alt="Logo"
                        className="h-8 w-8 rounded border object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                        No Logo
                      </div>
                    )}
                    <span className="text-sm font-semibold text-gray-800">{session.businessName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{session.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatDateTime(session.loginTime) || "--"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {formatDateTime(session.logoutTime) || "Active"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {session.locationName || "Unknown"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
