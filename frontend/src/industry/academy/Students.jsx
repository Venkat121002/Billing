import React, { useState, useEffect, useCallback } from "react";
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
  Hash,
  Phone,
  MapPin,
  FileText,
} from "lucide-react";

const Students = () => {
  const { currentUser } = useAuth();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [studentFormData, setStudentFormData] = useState({
    name: "",
    phone: "",
    location: "",
    gstin: "",
  });

  const fetchStudents = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    if (!token || !currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { "x-auth-token": token } };
      const res = await axios.get(`${API_URL}/customers`, config);
      const userId = currentUser?.uid || currentUser?.userId;
      const role = currentUser?.role;
      const filtered = res.data
        .filter((item) => {
          if (role === "owner" || role === "TenantAdmin") {
            return item.source === "Owner" || item.createdBy === userId;
          }
          return item.createdBy === userId;
        })
        .map((d) => ({
          ...d,
          phone: d.phone || d.mobile || "N/A",
          location: d.location || d.address || "N/A",
        }));
      setStudents(filtered);
    } catch (err) {
      console.error("Failed to fetch students:", err);
      toast.error("Could not fetch students list.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleEditStudent = (student) => {
    setEditingStudentId(student.id);
    setStudentFormData({
      name: student.name || "",
      phone: student.phone !== "N/A" ? student.phone : "",
      location: student.location !== "N/A" ? student.location : "",
      gstin: student.gstin || "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;
    const token = sessionStorage.getItem("token");
    try {
      await axios.delete(`${API_URL}/customers/${id}`, {
        headers: { "x-auth-token": token },
      });
      setStudents(students.filter((s) => s.id !== id));
      toast.success("Student deleted successfully!");
    } catch (err) {
      console.error("Delete student error:", err);
      toast.error("Failed to delete student");
    }
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (studentFormData.phone && studentFormData.phone.length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }
    const token = sessionStorage.getItem("token");
    const payload = {
      name: studentFormData.name,
      mobile: studentFormData.phone,
      address: studentFormData.location,
      gstin: studentFormData.gstin,
    };
    try {
      if (editingStudentId) {
        await axios.put(`${API_URL}/customers/${editingStudentId}`, payload, {
          headers: { "x-auth-token": token },
        });
        toast.success("Student updated successfully!");
      } else {
        await axios.post(`${API_URL}/customers`, payload, {
          headers: { "x-auth-token": token },
        });
        toast.success("Student added successfully!");
      }
      setIsModalOpen(false);
      setStudentFormData({ name: "", phone: "", location: "", gstin: "" });
      setEditingStudentId(null);
      fetchStudents();
    } catch (err) {
      console.error("Save student error:", err);
      toast.error("Failed to save student");
    }
  };

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      (s.name || "").toLowerCase().includes(term) ||
      (s.phone || "").toLowerCase().includes(term) ||
      (s.location || "").toLowerCase().includes(term)
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
                Students
              </h1>
              <p className="mt-1 text-gray-500 font-medium">
                Manage your academy's enrolled students.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingStudentId(null);
                setStudentFormData({ name: "", phone: "", location: "", gstin: "" });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl shadow-lg shadow-green-100 hover:shadow-xl hover:bg-green-700 transition-all font-semibold text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Add Student
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, phone, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading students...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                  <tr>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student Name</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GSTIN</th>
                    <th className="py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, i) => (
                      <tr key={student.id} className="hover:bg-green-50/50 transition-colors border-b border-gray-50">
                        <td className={tdClass}>
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                            {i + 1}
                          </span>
                        </td>
                        <td className={`${tdClass} font-semibold text-gray-900`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                              {(student.name || "?")[0].toUpperCase()}
                            </div>
                            {student.name}
                          </div>
                        </td>
                        <td className={tdClass}>{student.phone || "—"}</td>
                        <td className={tdClass}>{student.location || "—"}</td>
                        <td className={`${tdClass} font-mono text-xs text-gray-500`}>{student.gstin || "—"}</td>
                        <td className={tdClass}>
                          <div className="flex items-center gap-2">
                            <button title="View" onClick={() => setViewStudent(student)} className={`${iconBtnClass} text-gray-500 hover:bg-gray-100`}>
                              <Search size={16} />
                            </button>
                            <button title="Edit" onClick={() => handleEditStudent(student)} className={`${iconBtnClass} text-green-600 hover:bg-green-50`}>
                              <FileText size={16} />
                            </button>
                            <button title="Delete" onClick={() => handleDeleteStudent(student.id)} className={`${iconBtnClass} text-red-600 hover:bg-red-50`}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-16 text-gray-400">
                        No students found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* View Student Modal */}
        {viewStudent && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
              <button
                onClick={() => setViewStudent(null)}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
              >
                <X size={24} />
              </button>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 border-b border-green-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-green-600 border border-green-100 font-bold text-2xl uppercase">
                    {(viewStudent.name || "?")[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{viewStudent.name}</h2>
                    <p className="text-green-700 font-medium">{viewStudent.phone || "—"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/80 text-green-800 text-[10px] font-bold uppercase tracking-wider border border-green-100">
                    ID: {viewStudent.id?.slice(-6).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location</p>
                    <p className="text-gray-700 font-medium flex items-center gap-2">
                      <MapPin size={14} className="text-green-500" />
                      {viewStudent.location || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">GST Number</p>
                    <p className="text-gray-700 font-mono font-medium">{viewStudent.gstin || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setViewStudent(null)}
                  className="px-8 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all text-sm uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Student Modal */}
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
                <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100 shadow-sm">
                  {editingStudentId ? <FileText size={28} /> : <PlusCircle size={28} />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingStudentId ? "Edit Student" : "Add New Student"}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Fill in the details below to save the student
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveStudent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-green-800 uppercase tracking-widest">
                    <Users size={14} className="text-green-500" />
                    Student Name
                    <span className="text-red-400 text-xs">*</span>
                  </label>
                  <input type="text" required value={studentFormData.name} onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-green-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-gray-900" placeholder="Enter student name" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-green-800 uppercase tracking-widest">
                    <Phone size={14} className="text-green-500" />
                    Phone Number
                  </label>
                  <input type="number" value={studentFormData.phone} onChange={(e) => setStudentFormData({ ...studentFormData, phone: e.target.value.slice(0, 10) })} className="px-4 py-3.5 rounded-2xl border border-green-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-gray-900" placeholder="10 digit phone" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-green-800 uppercase tracking-widest">
                    <Hash size={14} className="text-green-500" />
                    GST Number
                  </label>
                  <input type="text" value={studentFormData.gstin} onChange={(e) => setStudentFormData({ ...studentFormData, gstin: e.target.value.toUpperCase() })} className="px-4 py-3.5 rounded-2xl border border-green-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-mono font-medium text-gray-900 uppercase" placeholder="22AAAAA0000A1Z5" />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-green-800 uppercase tracking-widest">
                    <MapPin size={14} className="text-green-500" />
                    Location
                  </label>
                  <input type="text" value={studentFormData.location} onChange={(e) => setStudentFormData({ ...studentFormData, location: e.target.value })} className="px-4 py-3.5 rounded-2xl border border-green-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-gray-900" placeholder="City / Area" />
                </div>

                <div className="flex justify-end gap-3 md:col-span-2 pt-6 border-t border-gray-100 mt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 rounded-2xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all font-bold text-sm uppercase tracking-wider">
                    Cancel
                  </button>
                  <button type="submit" className="px-8 py-3 rounded-2xl bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg shadow-green-100 font-bold text-sm uppercase tracking-wider">
                    {editingStudentId ? "Update Student" : "Save Student"}
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

export default Students;
