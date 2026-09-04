import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  BookOpen,
  ShoppingCart,
  Users,
  Wallet,
  Receipt,
  Download,
  Loader2,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../config/FirebaseConfig";
import { useAuth } from "../../contexts/AuthContext";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import * as XLSX from "xlsx";

const AcademyRecords = () => {
  const { currentUser } = useAuth();

  const [courses, setCourses] = useState([]);
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("courses");
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: "courses", label: "Course Inventory", icon: BookOpen },
    { id: "sales", label: "Enrollments", icon: ShoppingCart },
    { id: "students", label: "Students", icon: Users },
    { id: "cashbook", label: "Cashbook", icon: Wallet },
    { id: "gst", label: "GST Bills", icon: Receipt },
  ];

  useEffect(() => {
    if (!currentUser?.uid) return;

    const coursesRef = collection(db, "users", currentUser.uid, "courses");
    const salesRef = collection(db, "users", currentUser.uid, "courseSales");

    const unsub1 = onSnapshot(
      query(coursesRef, orderBy("createdAt", "desc")),
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setCourses(docs);
        setLoading(false);
      }
    );

    const unsub2 = onSnapshot(
      query(salesRef, orderBy("createdAt", "desc")),
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setSales(docs);
      }
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, [currentUser]);

  // =========================
  // FILTER
  // =========================
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();

    if (activeTab === "courses") {
      return courses.filter(
        (c) =>
          c.courseName?.toLowerCase().includes(term) ||
          c.courseCode?.toLowerCase().includes(term) ||
          c.trainer?.toLowerCase().includes(term)
      );
    }

    if (activeTab === "sales") {
      return sales.filter((s) =>
        s.items?.some((item) =>
          item.courseName?.toLowerCase().includes(term)
        )
      );
    }

    return [];
  }, [courses, sales, searchTerm, activeTab]);

  // =========================
  // PROFIT
  // =========================
  const totalProfit = useMemo(() => {
    let profit = 0;

    sales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const cost = item.cost || 0;
        const fee = item.fee || 0;
        profit += fee - cost;
      });
    });

    return profit;
  }, [sales]);

  // =========================
  // EXPORT
  // =========================
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Academy Records");
    XLSX.writeFile(wb, `academy_${activeTab}_records.xlsx`);
  };

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white p-6">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Academy Records</h1>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg"
          >
            <Download size={16} />
            Export
          </button>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white"
                  : "bg-white border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* SEARCH */}
        <div className="mb-4 relative">
          <Search
            size={16}
            className="absolute left-3 top-3 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 h-10 border rounded-lg"
          />
        </div>

        {/* SALES SUMMARY */}
        {activeTab === "sales" && (
          <div className="bg-white p-4 rounded-lg mb-4 flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-lg font-bold">
                ₹
                {sales.reduce(
                  (sum, s) => sum + (s.total || 0),
                  0
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Profit</p>
              <p className="text-lg font-bold text-green-600">
                ₹{totalProfit}
              </p>
            </div>
          </div>
        )}

        {/* TABLE */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center">
              <Loader2 className="animate-spin mx-auto" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {activeTab === "courses" && (
                    <>
                      <th className="p-3 text-left">Course</th>
                      <th className="p-3 text-left">Code</th>
                      <th className="p-3 text-left">Trainer</th>
                      <th className="p-3 text-left">Duration</th>
                      <th className="p-3 text-left">Fee</th>
                      <th className="p-3 text-left">Students</th>
                    </>
                  )}
                  {activeTab === "sales" && (
                    <>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Courses</th>
                      <th className="p-3 text-left">Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeTab === "courses" &&
                  filteredData.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="p-3">{c.courseName}</td>
                      <td className="p-3">{c.courseCode}</td>
                      <td className="p-3">{c.trainer}</td>
                      <td className="p-3">{c.duration}</td>
                      <td className="p-3">₹{c.fee}</td>
                      <td className="p-3 font-semibold">
                        {c.studentsEnrolled || 0}
                      </td>
                    </tr>
                  ))}

                {activeTab === "sales" &&
                  filteredData.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-3">
                        {new Date(
                          s.createdAt?.seconds * 1000
                        ).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        {s.items?.map((i) => i.courseName).join(", ")}
                      </td>
                      <td className="p-3 font-semibold">
                        ₹{s.total}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </BillingLayout>
  );
};

export default AcademyRecords;

