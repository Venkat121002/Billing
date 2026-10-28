import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowLeft, BookOpen, Plus, RotateCcw } from "lucide-react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import toast from "react-hot-toast";
import { handleEnterToNext } from "../../utils/formUtils";
import axios from "axios";
import API_URL from "../../config/api";

// A half-filled new course is kept while the user goes to the Trainers page to add a trainer.
const DRAFT_KEY = "academy-course-draft";
const readDraft = () => {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
  } catch {
    return null;
  }
};
const writeDraft = (draft) => {
  try {
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable */
  }
};

// Duration is typed as months + days and saved as text, e.g. "02 months, 12 days".
const pad2 = (n) => String(n).padStart(2, "0");
const plural = (n, word) => `${pad2(n)} ${word}${n === 1 ? "" : "s"}`;
const formatDuration = (months, days) => {
  const m = Number(months) || 0;
  const d = Number(days) || 0;
  return [m > 0 && plural(m, "month"), d > 0 && plural(d, "day")].filter(Boolean).join(", ");
};
// Reads saved text back into months/days; older free text such as "3 Months", "1 Year" or "6 weeks" works too.
const parseDuration = (text) => {
  let months = 0;
  let days = 0;
  for (const [, n, unit] of String(text || "").matchAll(/(\d+)\s*(year|month|week|day)/gi)) {
    const value = Number(n);
    const u = unit.toLowerCase();
    if (u === "year") months += value * 12;
    else if (u === "month") months += value;
    else if (u === "week") days += value * 7;
    else days += value;
  }
  return { durationMonths: months ? String(months) : "", durationDays: days ? String(days) : "" };
};

const AddCourse = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const editingCourse = location.state?.course;
  const editingCourseId = location.state?.courseId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trainers, setTrainers] = useState([]);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState(() => (!location.state?.courseId && readDraft()) || {
    courseName: "",
    courseCode: "",
    instructor: "",
    duration: "",
    durationMonths: "",
    durationDays: "",
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
    writeDraft(null); // a restored draft is used once
  }, []);

  useEffect(() => {
    if (editingCourse && editingCourseId) {
      setFormData({
        courseName: editingCourse.courseName || "",
        courseCode: editingCourse.courseCode || "",
        instructor: editingCourse.instructor || "",
        duration: editingCourse.duration || "",
        ...parseDuration(editingCourse.duration),
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

      if (name === "durationMonths" || name === "durationDays") {
        newState.duration = formatDuration(newState.durationMonths, newState.durationDays);
      }

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
    if (!formData.duration) {
      toast.error("Enter the duration in months and/or days");
      document.getElementById("durationMonths")?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const { durationMonths, durationDays, ...courseFields } = formData; // entry helpers; `duration` holds the text
      const productData = {
        ...courseFields,
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

      writeDraft(null);
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
                <div className="flex gap-2">
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
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingCourseId) writeDraft(formData);
                      navigate("/trainers");
                    }}
                    title="Add a new trainer"
                    aria-label="Add a new trainer"
                    className="shrink-0 px-4 border rounded-lg bg-white text-green-700 hover:bg-green-50"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Duration <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      id="durationMonths"
                      name="durationMonths"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="120"
                      step="1"
                      value={formData.durationMonths}
                      onChange={handleChange}
                      placeholder="0"
                      aria-label="Duration in months"
                      className="w-full pl-4 pr-20 py-3 border rounded-lg"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">months</span>
                  </div>
                  <div className="relative">
                    <input
                      id="durationDays"
                      name="durationDays"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={formData.durationDays}
                      onChange={handleChange}
                      placeholder="0"
                      aria-label="Duration in days"
                      className="w-full pl-4 pr-16 py-3 border rounded-lg"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">days</span>
                  </div>
                </div>
                {formData.duration && <p className="mt-1 text-xs text-gray-500">Saved as: {formData.duration}</p>}
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
