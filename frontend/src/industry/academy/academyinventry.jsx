import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  RotateCcw,
  Loader2,
  Check,
} from "lucide-react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";

const AcademyInventry = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  /* ---------------- FETCH DATA ---------------- */

  useEffect(() => {
    if (!currentUser) return;

    let retries = 0;
    const MAX_RETRIES = 10;
    setIsLoading(true);

    const fetchCourses = async () => {
      setError(null);
      const token = sessionStorage.getItem("token");

      if (!token) {
        if (retries < MAX_RETRIES) {
          retries++;
          return setTimeout(fetchCourses, 1000);
        }
        setError({ message: "Authentication session not found. Please refresh the page." });
        setIsLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${API_URL}/products`, {
          headers: { "x-auth-token": token },
        });
        const academyCourses = res.data.filter(p => p.industry === 'academy');

        const mappedCourses = academyCourses.map(p => ({
          id: p.id,
          courseName: p.name,
          courseCode: p.sku,
          category: p.category,
          duration: p.duration,
          trainer: p.supplier,
          mode: p.mode,
          fee: p.salePrice || p.salesPrice,
          studentsEnrolled: p.quantity,
          ...p
        }));

        setCourses(mappedCourses);
      } catch (err) {
        if (retries < MAX_RETRIES) {
          retries++;
          console.warn(`Fetch attempt ${retries} failed, retrying...`, err);
          return setTimeout(fetchCourses, 1000);
        }
        console.error("Final fetch error:", err);
        setError(err || { message: "Failed to fetch courses after multiple attempts." });
        toast.error("Failed to fetch courses.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [currentUser]);

  const handleEdit = (course) => {
    navigate("/add-product", {
      state: { course: course, courseId: course.id },
    });
  };

  const handleDelete = async (id) => {
    if (!currentUser) return;
    const token = sessionStorage.getItem("token");
    if (!token) return;

    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        await axios.delete(`${API_URL}/products/${id}`, {
          headers: { "x-auth-token": token },
        });
        setCourses(prevCourses => prevCourses.filter(course => course.id !== id));
        toast.success("Course deleted successfully!");
      } catch (err) {
        console.error("Error deleting course:", err);
        toast.error("Failed to delete course.");
      }
    }
  };

  /* ---------------- FILTER ---------------- */

  const filteredCourses = useMemo(() => {
    return courses.filter(
      (c) =>
        c.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.courseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.trainer?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [courses, searchTerm]);

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

  if (error) {
    return (
      <BillingLayout>
        <div className="flex flex-col items-center justify-center h-screen bg-white p-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <RotateCcw size={32} className="text-red-400" />
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-2">Failed to Load Inventory</p>
          <p className="text-sm text-gray-400 max-w-sm text-center">{error.message || "An unexpected error occurred"}</p>
          <button onClick={() => window.location.reload()} className="mt-6 flex items-center gap-2 px-6 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-all font-bold shadow-lg shadow-sky-100">
            <RotateCcw size={16} /> Refresh Page
          </button>
        </div>
      </BillingLayout>
    );
  }

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-white p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="text-sky-600" size={28} />
            <h1 className="text-2xl font-bold">Academy Course Management</h1>
          </div>

          <button
            onClick={() => navigate("/add-product")}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg"
          >
            <PlusCircle size={18} />
            Add Course
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Course, Code or Trainer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-sm">
              <tr>
                <th className="p-3">Course</th>
                <th className="p-3">Code</th>
                <th className="p-3">Category</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Trainer</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Students</th>
                <th className="p-3">Fee ₹</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredCourses.map((course) => (
                <tr key={course.id} className="border-t">
                  <td className="p-3 font-semibold">{course.courseName}</td>
                  <td className="p-3">{course.courseCode}</td>
                  <td className="p-3">{course.category}</td>
                  <td className="p-3">{course.duration}</td>
                  <td className="p-3">{course.trainer}</td>
                  <td className="p-3">{course.mode}</td>
                  <td className="p-3 font-bold">{course.studentsEnrolled}</td>
                  <td className="p-3">₹{course.fee}</td>
                  <td className="p-3 flex justify-center gap-2">
                    <button onClick={() => handleEdit(course)}>
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDelete(course.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </BillingLayout>
  );
};

export default AcademyInventry;
