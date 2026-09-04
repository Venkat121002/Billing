import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowLeft, BookOpen, RotateCcw } from "lucide-react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import toast from "react-hot-toast";
import { handleEnterToNext } from "../../utils/formUtils";
import axios from "axios";
import API_URL from "../../config/api";

const AddCourse = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const editingCourse = location.state?.course;
  const editingCourseId = location.state?.courseId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trainers, setTrainers] = useState([]);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    courseName: "",
    courseCode: "",
    instructor: "",
    duration: "",
    category: "",
    level: "",
    mode: "",
    batchSize: "",
    courseFee: "",
    gst: "",
    certification: "",
  });

  useEffect(() => {
    if (!currentUser) return;

    let retries = 0;
    const MAX_RETRIES = 10;

    const fetchTrainers = async () => {
      setError(null);
      const token = sessionStorage.getItem("token");
      if (!token) {
        if (retries < MAX_RETRIES) {
          retries++;
          return setTimeout(fetchTrainers, 1000);
        }
        setError({ message: "Authentication session not found. Please refresh the page." });
        return;
      }

      try {
        const config = { headers: { "x-auth-token": token } };
        const res = await axios.get(`${API_URL}/suppliers`, config);

        const userId = currentUser?.uid || currentUser?.userId;
        const role = currentUser?.role;

        const filteredTrainers = res.data.filter((item) => {
          if (role === "owner" || role === "TenantAdmin") {
            return item.source === "Owner" || item.createdBy === userId;
          }
          return item.createdBy === userId;
        });

        setTrainers(filteredTrainers);
      } catch (err) {
        if (retries < MAX_RETRIES) {
          retries++;
          return setTimeout(fetchTrainers, 1000);
        }
        setError(err || { message: "Failed to fetch trainers list." });
        toast.error("Failed to fetch trainers list.");
      }
    };

    fetchTrainers();
  }, [currentUser]);

  useEffect(() => {
    if (editingCourse && editingCourseId) {
      setFormData({
        courseName: editingCourse.courseName || "",
        courseCode: editingCourse.courseCode || "",
        instructor: editingCourse.instructor || "",
        duration: editingCourse.duration || "",
        category: editingCourse.category || "",
        level: editingCourse.level || "",
        mode: editingCourse.mode || "",
        batchSize: editingCourse.batchSize?.toString() || "",
        courseFee: editingCourse.courseFee?.toString() || "",
        gst: editingCourse.gst?.toString() || "",
        certification: editingCourse.certification || "",
      });
    }
  }, [editingCourse, editingCourseId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newState = { ...prev, [name]: value };

      if (name === 'courseName') {
        const matchingTrainer = trainers.find(
          trainer => trainer.company?.toLowerCase() === value.toLowerCase()
        );
        if (matchingTrainer) {
          newState.instructor = matchingTrainer.name;
        }
      }
      return newState;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      toast.error("Authentication error. Please log in again.");
      return;
    }
    const token = sessionStorage.getItem("token");
    if (!token) {
      toast.error("No auth token found. Please login again.");
      return;
    }

    if (!formData.courseName) {
      toast.error("Course Name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const productData = {
        ...formData,
        name: formData.courseName,
        sku: formData.courseCode,
        supplier: formData.instructor,
        description: `${formData.duration} course. Level: ${formData.level}. Mode: ${formData.mode}.`,
        quantity: Number(formData.batchSize || 0),
        salePrice: Number(formData.courseFee || 0),
        salesPrice: Number(formData.courseFee || 0),
        gst: Number(formData.gst || 0),
        salesGst: Number(formData.gst || 0),
        purchasePrice: 0,
        industry: 'academy',
        updatedAt: new Date().toISOString(),
      };

      const config = {
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
      };

      if (editingCourseId) {
        await axios.put(
          `${API_URL}/products/${editingCourseId}`,
          productData,
          config
        );
        toast.success("Course updated successfully!");
      } else {
        productData.createdAt = new Date().toISOString();
        await axios.post(`${API_URL}/products`, productData, config);
        toast.success("Course added successfully!");
      }

      navigate("/inventory");
    } catch (err) {
      const msg = err.response?.data?.msg || "Failed to save course";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <BillingLayout>
        <div className="flex flex-col items-center justify-center h-screen bg-white p-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <RotateCcw size={32} className="text-red-400" />
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-2">Failed to Load Page</p>
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
      <div className="min-h-screen bg-sky-50">

        {/* HEADER */}
        <div className="bg-sky-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                {editingCourseId ? "Edit Course" : "Add New Course"}
              </h1>
              <p className="text-sky-100 text-sm mt-1">
                Manage academy courses, fees & instructors
              </p>
            </div>

            <button
              onClick={() => navigate("/inventory")}
              className="flex items-center gap-2 bg-white text-sky-600 px-4 py-2 rounded-lg hover:bg-sky-50 transition"
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
            onKeyDown={handleEnterToNext}
            className="bg-white p-10 rounded-2xl shadow border border-sky-100 space-y-8"
          >
            {/* Course Highlight Section */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-5">
              <label className="flex items-center gap-2 text-sky-700 font-semibold mb-3">
                <BookOpen size={20} />
                Course Details
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="courseName" className="block text-sm font-medium text-gray-700 mb-1">
                    Course Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="courseName"
                    id="courseName"
                    value={formData.courseName.charAt(0).toUpperCase() + formData.courseName.slice(1)}
                    onChange={handleChange}
                    placeholder="e.g. Full Stack Development"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-sky-300"
                  />
                </div>

                <div>
                  <label htmlFor="courseCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Course Code
                  </label>
                  <input
                    type="text"
                    name="courseCode"
                    id="courseCode"
                    value={formData.courseCode}
                    onChange={handleChange}
                    placeholder="e.g. FSD-001"
                    className="w-full px-4 py-3 rounded-lg border border-sky-300"
                  />
                </div>
              </div>
            </div>

            {/* Course Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="instructor" className="block text-sm font-medium text-gray-700 mb-1">
                  Trainer <span className="text-red-500">*</span>
                </label>
                <select
                  name="instructor"
                  id="instructor"
                  value={formData.instructor}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border rounded-lg bg-white"
                >
                  <option value="">Select Trainer</option>
                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.name}>
                      {trainer.name.charAt(0).toUpperCase() + trainer.name.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Duration <span className="text-red-500">*</span>
                </label>
                <input id="duration" name="duration" value={formData.duration} onChange={handleChange} placeholder="e.g. 3 Months" required className="w-full px-4 py-3 border rounded-lg" />
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input id="category" name="category" value={formData.category.charAt(0).toUpperCase() + formData.category.slice(1)} onChange={handleChange} placeholder="IT / Spoken English / Design" className="w-full px-4 py-3 border rounded-lg" />
              </div>
              <div>
                <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
                  Level
                </label>
                <select id="level" name="level" value={formData.level} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg">
                  <option value="">Select Level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label htmlFor="mode" className="block text-sm font-medium text-gray-700 mb-1">
                  Mode
                </label>
                <select id="mode" name="mode" value={formData.mode} onChange={handleChange} placeholder="Online / Offline / Hybrid" className="w-full px-4 py-3 border rounded-lg">
                  <option value="">Select Mode</option>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label htmlFor="batchSize" className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Size
                </label>
                <input id="batchSize" name="batchSize" value={formData.batchSize} onChange={handleChange} placeholder="e.g. 25" className="w-full px-4 py-3 border rounded-lg" />
              </div>
              <div>
                <label htmlFor="courseFee" className="block text-sm font-medium text-gray-700 mb-1">
                  Course Fee (₹) <span className="text-red-500">*</span>
                </label>
                <input id="courseFee" name="courseFee" value={formData.courseFee} onChange={handleChange} placeholder="e.g. 15000" required className="w-full px-4 py-3 border rounded-lg" />
              </div>
              <div>
                <label htmlFor="gst" className="block text-sm font-medium text-gray-700 mb-1">
                  GST (%)
                </label>
                <input id="gst" name="gst" value={formData.gst} onChange={handleChange} placeholder="e.g. 18" className="w-full px-4 py-3 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="certification" className="block text-sm font-medium text-gray-700 mb-1">
                  Certification Provided
                </label>
                <input id="certification" name="certification" value={formData.certification.charAt(0).toUpperCase() + formData.certification.slice(1)} onChange={handleChange} placeholder="Yes / No" className="w-full px-4 py-3 border rounded-lg" />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate("/inventory")}
                className="px-6 py-3 bg-gray-200 rounded-lg"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
              >
                {isSubmitting ? "Saving..." : "Save Course"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </BillingLayout>
  );
};

export default AddCourse;
