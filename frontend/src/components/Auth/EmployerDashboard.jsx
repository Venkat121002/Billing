import { SubscriptionCard } from "./SubscriptionStatus";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import axios from "axios";
import API_URL from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import IndustryNudgeBanner from "../Billing/IndustryNudgeBanner";
import {
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertTriangle,
  Archive,
  RefreshCw,
  Package,
  BarChart3,
  AlertCircle,
  BookOpen,
  Calendar,
  Target,
  Activity,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Eye,
  Zap,
  Award,
  Layers,
  CircleDollarSign,
  Receipt,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  RadialBarChart,
  RadialBar,
} from "recharts";

import BillingLayout from "../../Layout/BillingLayout/AdminLayout";

const COLORS_GREEN = [
  "#10b981",
  "#34d399",
  "#6ee7b7",
  "#a7f3d0",
  "#d1fae5",
];
const COLORS_MIXED = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];
const INVENTORY_COLORS = ["#10b981", "#f59e0b", "#ef4444"];

function EmployerDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSales: 0,
    activeOrders: 0,
    completedOrders: 0,
    averageInvoiceValue: 0,
    topSellingProducts: [],
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    outstandingAmount: 0,
    totalProducts: 0,
    inventoryValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    topCategories: [],
    uniqueCustomers: 0,
    returningCustomers: 0,
    operationalExpenses: 0,
    expenseCategories: [],
    totalInventoryGST: 0,
  });
  console.log("faisal", stats);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("month1");
  const [lastFetched, setLastFetched] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [transactionsData, setTransactionsData] = useState([]);
  const [isAcademyIndustry, setIsAcademyIndustry] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const userIndustry =
        currentUser.industry ||
        currentUser.companyDetails?.industry ||
        currentUser.Tenant?.industry;
      if (userIndustry) {
        setIsAcademyIndustry(userIndustry.toLowerCase().includes("academy"));
      }
    }
  }, [currentUser, currentUser?.industry, currentUser?.companyDetails, currentUser?.Tenant?.industry]);



  const CACHE_DURATION = 10 * 60 * 1000;
  const isCacheValid = () =>
    lastFetched && Date.now() - lastFetched < CACHE_DURATION;

  const getDateRange = (range) => {
    const now = new Date();
    let startDate;
    switch (range) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "month1":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "month3":
        startDate = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000);
        break;
      case "month6":
        startDate = new Date(now.getTime() - 182 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    }
    return {
      start: Timestamp.fromDate(startDate),
      end: Timestamp.fromDate(now),
    };
  };

  const calculateComprehensiveStats = (
    sales,
    products,
    transactions,
    creditCustomers
  ) => {
    const totalSales = sales.reduce(
      (sum, sale) => sum + (sale.totals?.grandTotal || 0),
      0
    );
    const totalOrders = sales.length;
    const completedOrders = sales.filter(
      (s) => s.status === "completed"
    ).length;
    const activeOrders = totalOrders - completedOrders;
    const averageInvoiceValue =
      totalOrders > 0 ? totalSales / totalOrders : 0;

    const customerIdentifiers = sales
      .map((s) => s.billingCustomer)
      .filter((c) => c && c.name !== "NA");
    const uniqueCustomerMap = {};
    customerIdentifiers.forEach((c) => {
      const key = c.phone || c.name;
      if (!uniqueCustomerMap[key]) uniqueCustomerMap[key] = c;
    });
    const uniqueCustomerArray = Object.values(uniqueCustomerMap);
    const customerFrequency = {};
    customerIdentifiers.forEach((c) => {
      const key = c.phone || c.name;
      customerFrequency[key] = (customerFrequency[key] || 0) + 1;
    });
    const returningCustomers = Object.values(customerFrequency).filter(
      (f) => f > 1
    ).length;

    const totalProducts = products.length;
    const inventoryValue = products.reduce((sum, p) => {
      const price = p.salePrice || p.price || 0;
      const stock = p.quantity || p.stock || 0;
      return sum + price * stock;
    }, 0);
    const lowStockItems = products.filter(
      (p) =>
        (p.quantity || 0) > 0 &&
        (p.quantity || 0) <= (p.reorderLevel || 5)
    ).length;
    const outOfStockItems = products.filter(
      (p) => (p.quantity || 0) === 0
    ).length;

    const productSales = {};
    sales.forEach((sale) => {
      if (sale.items) {
        sale.items.forEach((item) => {
          const pid = item.productId || item.name;
          if (!productSales[pid])
            productSales[pid] = {
              name: item.name,
              quantity: 0,
              revenue: 0,
            };
          productSales[pid].quantity += item.qty || 0;
          productSales[pid].revenue +=
            (item.price || 0) * (item.qty || 0);
        });
      }
    });
    const topSellingProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const categoryData = {};
    products.forEach((p) => {
      const cat = p.category || "Uncategorized";
      if (!categoryData[cat]) categoryData[cat] = { count: 0, value: 0 };
      categoryData[cat].count += 1;
      categoryData[cat].value +=
        (p.salePrice || p.price || 0) * (p.quantity || 0);
    });
    const topCategories = Object.entries(categoryData)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const operationalExpenses = transactions
      .filter(
        (t) =>
          t.type === "expense" &&
          [
            "Office Supplies",
            "Utilities",
            "Transport",
            "Housing",
          ].includes(t.category)
      )
      .reduce((s, t) => s + (t.amount || 0), 0);

    const expenseCategories = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = t.category || "Other";
        expenseCategories[cat] =
          (expenseCategories[cat] || 0) + (t.amount || 0);
      });
    const topExpenseCategories = Object.entries(expenseCategories)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const creditTotal = creditCustomers.reduce(
      (s, c) => s + (c.credit || 0),
      0
    );
    const totalRevenue = totalSales + totalIncome + creditTotal;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const creditCustomerIds = creditCustomers.map((c) => c.id);
    const outstandingAmount = sales
      .filter((s) => creditCustomerIds.includes(s.customerId))
      .reduce((sum, s) => sum + (s.balance || 0), 0);

    return {
      totalSales: Math.round(totalSales),
      activeOrders,
      completedOrders,
      averageInvoiceValue: Math.round(averageInvoiceValue),
      topSellingProducts,
      totalRevenue: Math.round(totalRevenue),
      totalExpenses: Math.round(totalExpenses),
      netProfit: Math.round(netProfit),
      profitMargin: Math.round(profitMargin * 100) / 100,
      outstandingAmount: Math.round(outstandingAmount),
      totalProducts,
      inventoryValue: Math.round(inventoryValue),
      lowStockItems,
      outOfStockItems,
      topCategories,
      uniqueCustomers: uniqueCustomerArray.length,
      returningCustomers,
      operationalExpenses: Math.round(operationalExpenses),
      expenseCategories: topExpenseCategories,
      totalInventoryGST: Math.round(products.reduce((acc, p) => {
        const price = p.salePrice || p.price || 0;
        const qty = p.quantity || p.stock || 0;
        const gst = p.salesGst || p.gstRate || 0;
        return acc + ((price * qty * gst) / 100);
      }, 0)),
    };
  };

  const fetchDashboardStats = async (forceRefresh = false) => {
    // Check for either uid (Firebase) or userId (Backend)
    const userId = currentUser?.uid || currentUser?.userId;

    if (!userId) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    if (!forceRefresh && isCacheValid()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const token = sessionStorage.getItem("token");
    const config = {
      headers: {
        "x-auth-token": token,
      },
    };

    try {
      // Fetch all required data in parallel
      const [productsRes, salesRes, creditRes, transactionsRes, customersRes] = await Promise.all([
        axios.get(`${API_URL}/products`, config),
        axios.get(`${API_URL}/billing/bills`, config),
        axios.get(`${API_URL}/credit`, config),
        axios.get(`${API_URL}/cashbook`, config),
        axios.get(`${API_URL}/customers`, config)
        // For mapping names
      ]);

      console.log("hakkim", productsRes);

      //console.log("hakkim",customersRes);
      // console.log(creditRes);
      // console.log(transactionsRes);


      const role = currentUser?.role;
      const products = productsRes.data.filter((item) => {
        if (role === "owner" || role === "TenantAdmin") {
          return item.source === "Owner" || item.createdBy === userId;
        }
        return item.createdBy === userId;
      });
      const salesRaw = salesRes.data.filter((item) => {
        if (role === "owner" || role === "TenantAdmin") {
          return item.source === "Owner" || item.createdBy === userId;
        }
        return item.createdBy === userId;
      });
      const creditCustomers = creditRes.data.filter((item) => {
        if (role === "owner" || role === "TenantAdmin") {
          return item.source === "Owner" || item.createdBy === userId;
        }
        return item.createdBy === userId;
      });
      const transactions = transactionsRes.data
        .filter((item) => {
          if (role === "owner" || role === "TenantAdmin") {
            return item.source === "Owner" || item.createdBy === userId;
          }
          return item.createdBy === userId;
        })
        .map((t) => ({
          ...t,
          transactionDate: t.createdAt ? new Date(t.createdAt) : new Date(),
        }));
      const customers = customersRes.data.filter((item) => {
        if (role === "owner" || role === "TenantAdmin") {
          return item.source === "Owner" || item.createdBy === userId;
        }
        return item.createdBy === userId;
      });

      // Create Customer Map for quick lookup
      const customerMap = {};
      customers.forEach(c => {
        customerMap[c.id] = c;
      });

      // Process Sales: Attach Customer Info & Fix Dates
      const sales = salesRaw.map(sale => {
        const customer = sale.customerId ? customerMap[sale.customerId] : null;
        return {
          ...sale,
          createdDate: sale.createdAt ? new Date(sale.createdAt) : new Date(),
          billingCustomer: {
            name: customer?.name || sale.customerName || "NA",
            phone: customer?.mobile || sale.customerPhone || "NA",
            location: customer?.address || "NA"
          }
        };
      });

      setSalesData(sales);
      setProductsData(products);
      setTransactionsData(transactions);

      const calculatedStats = calculateComprehensiveStats(
        sales,
        products,
        transactions,
        creditCustomers
      );

      setStats(calculatedStats);
      setLastFetched(Date.now());

    } catch (err) {
      console.error("Error fetching dashboard:", err);
      // Handle 404s gracefully (e.g. if new user has no data yet)
      if (err.response && err.response.status === 404) {
        // Likely one of the endpoints has no data, treat as empty
        setSalesData([]);
        setProductsData([]);
        setTransactionsData([]);
        setStats(calculateComprehensiveStats([], [], [], []));
      } else {
        const msg = err.response?.data?.msg || err.message || "Failed to fetch data";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [currentUser, timeRange]);

  const handleRefresh = () => fetchDashboardStats(true);

  const chartData = useMemo(() => {
    const dailyFinancials = {};
    salesData.forEach((sale) => {
      const dateKey = format(
        sale.createdDate || new Date(),
        "yyyy-MM-dd"
      );
      if (!dailyFinancials[dateKey])
        dailyFinancials[dateKey] = {
          date: dateKey,
          revenue: 0,
          expenses: 0,
          profit: 0,
        };
      dailyFinancials[dateKey].revenue += sale.totals?.grandTotal || 0;
    });
    transactionsData.forEach((t) => {
      const dateKey = format(
        t.transactionDate || new Date(),
        "yyyy-MM-dd"
      );
      if (!dailyFinancials[dateKey])
        dailyFinancials[dateKey] = {
          date: dateKey,
          revenue: 0,
          expenses: 0,
          profit: 0,
        };
      if (t.type === "income")
        dailyFinancials[dateKey].revenue += t.amount || 0;
      else dailyFinancials[dateKey].expenses += t.amount || 0;
    });
    Object.values(dailyFinancials).forEach((d) => {
      d.profit = d.revenue - d.expenses;
    });

    const financialTrendData = Object.values(dailyFinancials)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30)
      .map((d) => ({
        ...d,
        displayDate: format(new Date(d.date), "dd MMM"),
      }));

    const inventoryStatusData = [
      {
        name: "In Stock",
        value:
          stats.totalProducts -
          stats.lowStockItems -
          stats.outOfStockItems,
      },
      { name: "Low Stock", value: stats.lowStockItems },
      { name: "Out of Stock", value: stats.outOfStockItems },
    ].filter((item) => item.value > 0);

    const expenseCategoriesData = stats.expenseCategories.map(
      (cat, i) => ({
        name: cat.name,
        value: cat.amount,
        fill: COLORS_MIXED[i % COLORS_MIXED.length],
      })
    );

    const topProductsBarData = stats.topSellingProducts.map((p) => ({
      name:
        p.name.length > 12 ? p.name.substring(0, 12) + "..." : p.name,
      revenue: p.revenue,
      quantity: p.quantity,
    }));

    // Radial bar for profit margin
    const profitRadialData = [
      {
        name: "Profit Margin",
        value: Math.max(0, stats.profitMargin),
        fill: "#10b981",
      },
    ];

    return {
      financialTrendData,
      inventoryStatusData,
      expenseCategoriesData,
      topProductsBarData,
      profitRadialData,
    };
  }, [salesData, transactionsData, stats]);

  const downloadReport = (type) => {
    let data = [];
    let filename = "";
    if (type === "sales") {
      data = salesData.map((sale) => ({
        Date: sale.createdDate
          ? format(sale.createdDate, "yyyy-MM-dd")
          : "N/A",
        Customer: sale.billingCustomer?.name || "N/A",
        Amount: sale.totals?.grandTotal || 0,
        Status: sale.status || "N/A",
      }));
      filename = "Sales_Report.csv";
    } else if (type === "inventory") {
      data = productsData.map((prod) => ({
        Product: prod.name,
        Category: prod.category,
        Price: prod.sellingPrice || prod.salePrice || 0,
        Stock: prod.quantity || 0,
        Status:
          (prod.quantity || 0) <= (prod.reorderLevel || 5)
            ? "Low Stock"
            : "In Stock",
      }));
      filename = "Inventory_Report.csv";
    } else if (type === "expenses") {
      data = transactionsData
        .filter((t) => t.type === "expense")
        .map((t) => ({
          Date: t.transactionDate
            ? format(t.transactionDate, "yyyy-MM-dd")
            : "N/A",
          Category: t.category || "Other",
          Amount: t.amount || 0,
          Description: t.description || "",
        }));
      filename = "Expense_Report.csv";
    }
    if (data.length === 0) {
      alert("No data available to download.");
      return;
    }
    const headers = Object.keys(data[0]).join(",");
    const rows = data
      .map((row) => Object.values(row).join(","))
      .join("\n");
    const csvContent =
      "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTimeLabel = () => {
    switch (timeRange) {
      case "week":
        return "Last 7 Days";
      case "month1":
        return "Last 30 Days";
      case "month3":
        return "Last 3 Months";
      case "month6":
        return "Last 6 Months";
      case "year":
        return "Last Year";
      default:
        return "Last 24 Hours";
    }
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-green-100">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            {label}
          </p>
          {payload.map((entry, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600 capitalize">
                {entry.name}:
              </span>
              <span className="font-bold text-gray-800">
                ₹{Number(entry.value).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <BillingLayout>
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-green-50/30 via-white to-emerald-50/20">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-green-100 border-t-green-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <p className="mt-6 text-lg font-semibold text-gray-700">
            Loading Analytics...
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Crunching your business data
          </p>
        </div>
      </BillingLayout>
    );
  }

  if (error) {
    return (
      <BillingLayout>
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-green-50/30 via-white to-emerald-50/20">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-red-100 text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Something went wrong
            </h3>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      </BillingLayout>
    );
  }

  return (
    <BillingLayout hideSidebar={false}>
      <div className="min-h-screen bg-white -m-4 p-3">
        <IndustryNudgeBanner currentUser={currentUser} />
        <SubscriptionCard user={currentUser} />
        {/* ═══════════════ HEADER ═══════════════ */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-200">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Dashboard
              </h1>
            </div>
            <p className="text-gray-500 font-medium ml-[52px]">
              Business analytics &amp; performance overview
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Quick Stats Chips */}
            <div>{!isAcademyIndustry ?
              <div className="hidden md:flex items-center gap-2">
                {[
                  {
                    icon: ShoppingCart,
                    val: salesData.length,
                    label: "Sales",
                  },
                  {
                    icon: Package,
                    val: productsData.length,
                    label: "Products",
                  },
                  {
                    icon: Activity,
                    val: transactionsData.length,
                    label: "Transactions",
                  },
                ].map((chip, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 rounded-full text-xs font-semibold text-gray-600"
                  >
                    <chip.icon className="w-3.5 h-3.5 text-green-500" />
                    {chip.val} {chip.label}

                  </span>
                ))}
              </div> : <p></p>
            }</div>


            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2.5 bg-white border border-green-200 rounded-xl hover:bg-green-50 transition-all group"
              title="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 text-green-600 group-hover:rotate-180 transition-transform duration-500 ${loading ? "animate-spin" : ""
                  }`}
              />
            </button>

            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2.5 bg-white border border-green-200 rounded-xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-green-400 focus:outline-none cursor-pointer hover:bg-green-50 transition-colors"
            >
              <option value="one">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
              <option value="month1">Last 30 Days</option>
              <option value="month3">Last 3 Months</option>
              <option value="month6">Last 6 Months</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>

        {/* ═══════════════ TOP KPI STRIP ═══════════════ */}

        <div>{!isAcademyIndustry ?
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                title: "Total Revenue",
                value: stats.totalRevenue,
                icon: DollarSign,
                gradient: "bg-green-500",
                shadow: "shadow-green-200",
                bg: "bg-green-50",
                text: "text-green-700",
                currency: true,
              },
              {
                title: "Net Profit",
                value: stats.netProfit,
                icon: TrendingUp,
                gradient: "bg-emerald-500",
                shadow: "shadow-emerald-200",
                bg: "bg-emerald-50",
                text: "text-emerald-700",
                currency: true,
                badge: `${stats.profitMargin}% margin`,
              },
              {
                title: "Total Sales",
                value: stats.totalSales,
                icon: ShoppingCart,
                gradient: "bg-teal-500",
                shadow: "shadow-teal-200",
                bg: "bg-teal-50",
                text: "text-teal-700",
                currency: true,
              },
              {
                title: "Expenses",
                value: stats.totalExpenses,
                icon: TrendingDown,
                gradient: "bg-red-500",
                shadow: "shadow-red-200",
                bg: "bg-red-50",
                text: "text-red-600",
                currency: true,
              },
              // {
              //   title: "Total Inventory GST",
              //   value: stats.totalInventoryGST,
              //   icon: Receipt,
              //   gradient: "bg-orange-500",
              //   shadow: "shadow-orange-200",
              //   bg: "bg-orange-50",
              //   text: "text-orange-600",
              //   currency: true,
              // },
            ].map((kpi, i) => (
              <div
                key={i}
                className="relative bg-white rounded-2xl border border-green-100 p-5 shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden"
              >
                {/* Decorative gradient corner */}
                <div
                  className={`absolute -top-6 -right-6 w-20 h-20 rounded-full ${kpi.gradient} opacity-10 group-hover:opacity-20 transition-opacity`}
                />

                <div className="flex items-start justify-between mb-3 relative">
                  <div
                    className={`w-11 h-11 rounded-xl ${kpi.gradient} flex items-center justify-center shadow-lg ${kpi.shadow}`}
                  >
                    <kpi.icon className="w-5 h-5 text-white" />
                  </div>
                  {kpi.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full ${kpi.bg} ${kpi.text}`}
                    >
                      {kpi.badge}
                    </span>

                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  <kpi.icon className="w-3.5 h-3.5" />
                  <span>{kpi.title}</span>
                </div>
                <p className="text-2xl font-extrabold text-gray-900">
                  {kpi.currency
                    ? `₹${Number(kpi.value || 0).toLocaleString()}`
                    : kpi.value || 0}
                </p>
              </div>
            ))}
          </div>
          :
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                title: "Fees Collected",
                value: stats.totalRevenue,
                icon: DollarSign,
                gradient: "bg-green-500",
                shadow: "shadow-green-200",
                bg: "bg-green-50",
                text: "text-green-700",
                currency: true,
              },
              {
                title: "Net Profit",
                value: stats.netProfit,
                icon: TrendingUp,
                gradient: "bg-emerald-500",
                shadow: "shadow-emerald-200",
                bg: "bg-emerald-50",
                text: "text-emerald-700",
                currency: true,
                badge: `${stats.profitMargin}% margin`,
              },
              {
                title: "Total Student",
                value: stats.totalProducts,
                icon: Users,
                gradient: "bg-teal-500",
                shadow: "shadow-teal-200",
                bg: "bg-teal-50",
                text: "text-teal-700",
                currency: true,
              },
              {
                title: "Expenses",
                value: stats.totalExpenses,
                icon: TrendingDown,
                gradient: "bg-red-500",
                shadow: "shadow-red-200",
                bg: "bg-red-50",
                text: "text-red-600",
                currency: true,
              },
              // {
              //   title: "Total Inventory GST",
              //   value: stats.totalInventoryGST,
              //   icon: Receipt,
              //   gradient: "bg-orange-500",
              //   shadow: "shadow-orange-200",
              //   bg: "bg-orange-50",
              //   text: "text-orange-600",
              //   currency: true,
              // },
            ].map((kpi, i) => (
              <div
                key={i}
                className="relative bg-white rounded-2xl border border-green-100 p-5 shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden"
              >
                {/* Decorative gradient corner */}
                <div
                  className={`absolute -top-6 -right-6 w-20 h-20 rounded-full ${kpi.gradient} opacity-10 group-hover:opacity-20 transition-opacity`}
                />

                <div className="flex items-start justify-between mb-3 relative">
                  <div
                    className={`w-11 h-11 rounded-xl ${kpi.gradient} flex items-center justify-center shadow-lg ${kpi.shadow}`}
                  >
                    <kpi.icon className="w-5 h-5 text-white" />
                  </div>
                  {kpi.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full ${kpi.bg} ${kpi.text}`}
                    >
                      {kpi.badge}
                    </span>

                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  <kpi.icon className="w-3.5 h-3.5" />
                  <span>{kpi.title}</span>
                </div>
                <p className="text-2xl font-extrabold text-gray-900">
                  {kpi.currency
                    ? `₹${Number(kpi.value || 0).toLocaleString()}`
                    : kpi.value || 0}
                </p>
              </div>
            ))}
          </div>
        }
        </div>


        {/* ═══════════════ CHARTS SECTION (FIRST!) ═══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue vs Expenses Trend — spans 2 columns */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-green-100 shadow-sm p-6 hover:shadow-md transition-shadow min-h-[430px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Revenue vs Expenses
                </h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  {getTimeLabel()} • Daily breakdown
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  Expenses
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-300" />
                  Profit
                </span>
              </div>
            </div>

            {chartData.financialTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData.financialTrendData}>
                  <defs>
                    <linearGradient
                      id="gradRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#10b981"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#10b981"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="gradExpenses"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#f87171"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#f87171"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="gradProfit"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#6ee7b7"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#6ee7b7"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0fdf4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      v >= 1000 ? `₹${v / 1000}k` : `₹${v}`
                    }
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#gradRevenue)"
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#f87171"
                    strokeWidth={2.5}
                    fill="url(#gradExpenses)"
                    name="Expenses"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#6ee7b7"
                    strokeWidth={2}
                    fill="url(#gradProfit)"
                    name="Profit"
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[320px] text-gray-300">
                <BarChart3 className="w-16 h-16 mb-3" />
                <p className="font-medium text-gray-400">
                  No trend data available
                </p>
                <p className="text-xs text-gray-300">
                  Sales and transactions will appear here
                </p>
              </div>
            )}
          </div>

          {/* Inventory Status Donut */}
          <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6 hover:shadow-md transition-shadow">

            <div>{!isAcademyIndustry ?
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Inventory Status
                </h3>
                <p className="text-xs text-gray-400 font-medium mb-4">
                  {stats.totalProducts} total products
                </p>

              </div>
              :
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Course Status
                </h3>

                <p className="text-xs text-gray-400 font-medium mb-4">
                  {stats.totalProducts}  Course
                </p>
              </div>
            }</div>
            <p>{console.log("kadhar", chartData)}</p>

            {chartData.inventoryStatusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={chartData.inventoryStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {chartData.inventoryStatusData.map(
                        (entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={INVENTORY_COLORS[index]}
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {chartData.inventoryStatusData.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: INVENTORY_COLORS[i],
                          }}
                        />
                        <span className="font-medium text-gray-600">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-bold text-gray-800">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-gray-300">
                <Package className="w-12 h-12 mb-2" />
                <p className="text-sm text-gray-400">No inventory data</p>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════ SECOND CHART ROW ═══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Products Bar Chart */}
          <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6 hover:shadow-md transition-shadow min-h-[350px]">
            <div>{!isAcademyIndustry ?
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Top Selling Products
              </h3>
              :
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Top Selling Courses
              </h3>
            }</div>

            <p className="text-xs text-gray-400 font-medium mb-4">
              By revenue generated
            </p>


            <div>
              {chartData.topProductsBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart
                    data={chartData.topProductsBarData}
                    layout="vertical"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f0fdf4"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `₹${v / 1000}k`}
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 12, fill: "#374151" }}
                      width={100}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v) => `₹${Number(v).toLocaleString()}`}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#10b981"
                      radius={[0, 8, 8, 0]}
                      barSize={28}
                      name="Revenue"
                    >
                      {chartData.topProductsBarData.map((entry, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={COLORS_GREEN[i % COLORS_GREEN.length]}
                        />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[280px] text-gray-300">
                  <Award className="w-12 h-12 mb-2" />
                  <p className="text-sm text-gray-400">
                    No sales data yet
                  </p>
                </div>
              )}
            </div>



          </div>

          {/*  ═══════════════ Expense Categories  ═══════════════  */}

          <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Expense Breakdown
            </h3>
            <p className="text-xs text-gray-400 font-medium mb-4">
              Top spending categories
            </p>

            {chartData.expenseCategoriesData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData.expenseCategoriesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {chartData.expenseCategoriesData.map(
                        (entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              COLORS_MIXED[index % COLORS_MIXED.length]
                            }
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip
                      formatter={(v) => `₹${Number(v).toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-3">
                  {chartData.expenseCategoriesData.map((cat, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.fill }}
                        />
                        <span className="text-sm font-medium text-gray-600">
                          {cat.name}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-800">
                        ₹{cat.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-gray-300">
                <CircleDollarSign className="w-12 h-12 mb-2" />
                <p className="text-sm text-gray-400">
                  No expense data yet
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════ DETAILED STATS GRID ═══════════════ */}
        <div>{!isAcademyIndustry ?

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-10">
            {[
              {
                title: "Avg. Order",
                value: `₹${stats.averageInvoiceValue.toLocaleString()}`,
                icon: FileText,
                iconBg: "bg-gradient-to-br from-red-400 to-rose-500",
                iconColor: "text-white",
              },
              {
                title: "Customers",
                value: stats.uniqueCustomers,
                icon: Users,
                iconBg: "bg-gradient-to-br from-emerald-400 to-green-500",
                iconColor: "text-white",
                sub: `${stats.returningCustomers} returning`,
              },
              {
                title: "Active Orders",
                value: stats.activeOrders,
                icon: Activity,
                iconBg: "bg-gradient-to-br from-teal-400 to-cyan-500",
                iconColor: "text-white",
                sub: `${stats.completedOrders} done`,
              },
              {
                title: "Inventory Value",
                value: `₹${stats.inventoryValue.toLocaleString()}`,
                icon: Archive,
                iconBg: "bg-gradient-to-br from-indigo-400 to-blue-500",
                iconColor: "text-white",
              },
              {
                title: "Low Stock",
                value: stats.lowStockItems,
                icon: AlertTriangle,
                iconBg:
                  stats.lowStockItems > 0
                    ? "bg-gradient-to-br from-amber-400 to-orange-500"
                    : "bg-gradient-to-br from-yellow-400 to-green-500",

                iconColor: "text-white",
              },
              {
                title: "Out of Stock",
                value: stats.outOfStockItems,
                icon: Package,
                iconBg:
                  stats.outOfStockItems > 0
                    ? "bg-gradient-to-br from-red-400 to-rose-500"
                    : "bg-gradient-to-br from-indigo-400 to-indigo-500",
                iconColor: "text-white",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl border border-emerald-100 p-6 shadow-md hover:shadow-xl transition-all duration-300 group"
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-2xl ${stat.iconBg} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}
                >
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>

                {/* Title */}
                <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">
                  {stat.title}
                </p>

                {/* Main Value (Increased Size) */}
                <p className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">
                  {stat.value}
                </p>

                {/* Sub text */}
                {stat.sub && (
                  <p className="text-sm text-emerald-600 font-semibold mt-1">
                    {stat.sub}
                  </p>
                )}
              </div>
            ))}
          </div>
          : <div></div>
         /* <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-10 ">
          {[
            {
              title: "Avg. Order",
              value: `₹${stats.averageInvoiceValue.toLocaleString()}`,
              icon: FileText,
              iconBg: "bg-gradient-to-br from-red-400 to-rose-500",
              iconColor: "text-white",
            },
            {
              title: "Total Students",
              value: stats.uniqueCustomers,
              icon: Users,
              iconBg: "bg-gradient-to-br from-emerald-400 to-green-500",
              iconColor: "text-white",
              sub: `${stats.returningCustomers} returning`,
            },
            {
              title: "Active Students",
              value: stats.activeOrders,
              icon: Activity,
              iconBg: "bg-gradient-to-br from-teal-400 to-cyan-500",
              iconColor: "text-white",
              sub: `${stats.completedOrders} done`,
            },
            {
              title: "Pending Amount",
              value: `₹${stats.inventoryValue.toLocaleString()}`,
              icon: Archive,
              iconBg: "bg-gradient-to-br from-indigo-400 to-blue-500",
              iconColor: "text-white",
            },
            {
              title: "Courses Ongoing",
              value: stats.topCategories.length,
              icon: BookOpen,
              iconBg:
                stats.lowStockItems > 0
                  ? "bg-gradient-to-br from-amber-400 to-orange-500"
                  : "bg-gradient-to-br from-yellow-400 to-green-500",

              iconColor: "text-white",
            },
            /* {
              title: "Out of Stock",
              value: stats.outOfStockItems,
              icon: Package,
              iconBg:
                stats.outOfStockItems > 0
                  ? "bg-gradient-to-br from-red-400 to-rose-500"
                  : "bg-gradient-to-br from-indigo-400 to-indigo-500",
              iconColor: "text-white",
            }, 
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-emerald-100 p-6 shadow-md hover:shadow-xl transition-all duration-300 group"
            >
              {/* Icon }
              <div
                className={`w-12 h-12 rounded-2xl ${stat.iconBg} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}
              >
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>

              {/* Title }
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">
                {stat.title}
              </p>

              {/* Main Value (Increased Size) }
              <p className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">
                {stat.value}
              </p>

              {/* Sub text }
              {stat.sub && (
                <p className="text-sm text-emerald-600 font-semibold mt-1">
                  {stat.sub}
                </p>
              )}
            </div>
          ))}
        </div> */}

        </div>


        {/* ═══════════════ TOP PERFORMERS LIST ═══════════════ */}
        <div>{!isAcademyIndustry ?
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Products */}
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Top Products
                  </h3>
                  <p className="text-xs text-gray-400">
                    Best performers by revenue
                  </p>
                </div>
                <Award className="w-5 h-5 text-green-400" />
              </div>

              {stats.topSellingProducts.length > 0 ? (
                <div className="space-y-3">
                  {stats.topSellingProducts.map((product, i) => {
                    const maxRevenue =
                      stats.topSellingProducts[0]?.revenue || 1;
                    const widthPct = (product.revenue / maxRevenue) * 100;
                    return (
                      <div key={i} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                              {i + 1}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {product.name}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {product.quantity} units sold
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-green-600">
                            ₹{product.revenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 bg-green-50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all duration-700"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-300">
                  <Package className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    No product data
                  </p>
                </div>
              )}
            </div>

            {/* Top Categories */}
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Product Categories
                  </h3>
                  <p className="text-xs text-gray-400">
                    By inventory value
                  </p>
                </div>
                <Layers className="w-5 h-5 text-green-400" />
              </div>

              {stats.topCategories.length > 0 ? (
                <div className="space-y-3">
                  {stats.topCategories.map((cat, i) => {
                    const maxVal = stats.topCategories[0]?.value || 1;
                    const widthPct = (cat.value / maxVal) * 100;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
                              style={{
                                backgroundColor:
                                  COLORS_MIXED[i % COLORS_MIXED.length],
                              }}
                            >
                              {cat.name[0]}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {cat.name}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {cat.count} products
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-gray-700">
                            ₹{cat.value.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor:
                                COLORS_MIXED[i % COLORS_MIXED.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-300">
                  <Target className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    No category data
                  </p>
                </div>
              )}
            </div>
          </div>
          :
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Products */}
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Top Courses
                  </h3>
                  <p className="text-xs text-gray-400">
                    Best performers by revenue
                  </p>
                </div>
                <Award className="w-5 h-5 text-green-400" />
              </div>

              {stats.topSellingProducts.length > 0 ? (
                <div className="space-y-3">
                  {stats.topSellingProducts.map((product, i) => {
                    const maxRevenue =
                      stats.topSellingProducts[0]?.revenue || 1;
                    const widthPct = (product.revenue / maxRevenue) * 100;
                    return (
                      <div key={i} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                              {i + 1}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {product.name}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {product.quantity} units sold
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-green-600">
                            ₹{product.revenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 bg-green-50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all duration-700"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-300">
                  <Package className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    No product data
                  </p>
                </div>
              )}
            </div>

            {/* Top Categories */}
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Courses Categories
                  </h3>
                  <p className="text-xs text-gray-400">
                    By inventory value
                  </p>
                </div>
                <Layers className="w-5 h-5 text-green-400" />
              </div>

              {stats.topCategories.length > 0 ? (
                <div className="space-y-3">
                  {stats.topCategories.map((cat, i) => {
                    const maxVal = stats.topCategories[0]?.value || 1;
                    const widthPct = (cat.value / maxVal) * 100;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
                              style={{
                                backgroundColor:
                                  COLORS_MIXED[i % COLORS_MIXED.length],
                              }}
                            >
                              {cat.name[0]}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {cat.name}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {cat.count} products
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-gray-700">
                            ₹{cat.value.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor:
                                COLORS_MIXED[i % COLORS_MIXED.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-300">
                  <Target className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    No category data
                  </p>
                </div>
              )}
            </div>
          </div>

        }</div>


        {/* ═══════════════ BUSINESS HEALTH SUMMARY ═══════════════ */}

        <div className="bg-white rounded-3xl border border-emerald-100 shadow-md p-8 mb-10">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-500" />
            </div>
            <div>{!isAcademyIndustry ?
              <h3 className="text-xl font-semibold text-slate-800 tracking-tight">
                Business Health Overview
              </h3> :
              <h3 className="text-xl font-semibold text-slate-800 tracking-tight">
                Academic Health Overview
              </h3>
            } </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* ================= Financial Health ================= */}
            <div className="bg-red-50/40 rounded-2xl p-6 border border-emerald-100">

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${stats.netProfit >= 0 ? "bg-red-100" : "bg-rose-100"
                    }`}
                >
                  {stats.netProfit >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-rose-500" />
                  )}
                </div>
                <p className="text-sm font-medium text-gray-600">
                  Financial Status
                </p>
              </div>

              <p
                className={`text-lg font-medium ${stats.netProfit >= 0 ? "text-black-700" : "text-rose-600"
                  }`}
              >
                {stats.netProfit >= 0 ? "Profitable Business" : "Operating at Loss"}
              </p>

              <p className="text-sm text-gray-500 mt-1">
                Profit Margin: {stats.profitMargin}%
              </p>

              <div className="mt-4 h-2 bg-white rounded-full overflow-hidden border border-emerald-100">
                <div
                  className={`h-full transition-all duration-700 ${stats.profitMargin >= 0 ? "bg-red-500" : "bg-rose-500"
                    }`}
                  style={{
                    width: `${Math.min(Math.abs(stats.profitMargin), 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* ================= Inventory Health ================= */}
            <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-100">

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${stats.outOfStockItems === 0 ? "bg-yellow-100" : "bg-amber-200"
                    }`}
                >
                  <Package
                    className={`w-4 h-4 ${stats.outOfStockItems === 0
                      ? "text-yellow-600"
                      : "text-amber-700"
                      }`}
                  />
                </div>
                <div>{!isAcademyIndustry ?
                  <div>
                    <p className="text-sm font-medium text-yellow-700">
                      Inventory Health
                    </p>
                    <p
                      className={`text-lg font-medium ${stats.outOfStockItems === 0
                        ? "text-yellow-700"
                        : "text-amber-700"
                        }`}
                    >
                      {stats.outOfStockItems === 0
                        ? "Stock Levels Stable"
                        : `${stats.outOfStockItems} Items Out of Stock`}
                    </p>

                    <p className="text-sm text-yellow-600 mt-1">
                      Total Value: ₹{stats.inventoryValue.toLocaleString()}
                    </p>
                  </div>

                  :
                  <div>
                    <p className="text-sm font-medium text-yellow-700">
                      Courses Health
                    </p>
                    <p
                      className={`text-lg font-medium ${stats.outOfStockItems === 0
                        ? "text-yellow-700"
                        : "text-amber-700"
                        }`}
                    >
                      {stats.outOfStockItems === 0
                        ? "Courses Levels Stable"
                        : `${stats.outOfStockItems} Items Out of Stock`}
                    </p>

                    <p className="text-sm text-yellow-600 mt-1">
                      Total Value: ₹{stats.inventoryValue.toLocaleString()}
                    </p>



                  </div>
                }
                </div>

              </div>



              <div className="mt-4 flex gap-1">
                {[
                  {
                    val:
                      stats.totalProducts -
                      stats.lowStockItems -
                      stats.outOfStockItems,
                    color: "bg-yellow-400",
                  },
                  { val: stats.lowStockItems, color: "bg-amber-400" },
                  { val: stats.outOfStockItems, color: "bg-red-400" },
                ].map((seg, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full ${seg.color}`}
                    style={{
                      width: `${stats.totalProducts > 0
                        ? (seg.val / stats.totalProducts) * 100
                        : 33
                        }%`,
                    }}
                  />
                ))}
              </div>
            </div>


            {/* ================= Customer Health ================= */}
            <div className="bg-indigo-50/40 rounded-2xl p-6 border border-indigo-100">

              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <div>{!isAcademyIndustry ?
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Customer Base
                    </p>
                    <p className="text-lg font-medium text-indigo-700">
                      {stats.uniqueCustomers} Active Customers
                    </p>
                  </div>
                  :
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Student Base
                    </p>
                    <p className="text-lg font-medium text-indigo-700">
                      {stats.uniqueCustomers} Active Students
                    </p>
                  </div>
                }</div>

              </div>

              <p className="text-sm text-gray-500 mt-1">
                {stats.returningCustomers} returning (
                {stats.uniqueCustomers > 0
                  ? (
                    (stats.returningCustomers /
                      stats.uniqueCustomers) *
                    100
                  ).toFixed(1)
                  : 0}
                % retention)
              </p>

              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 h-2 bg-white rounded-full border border-indigo-100 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-700"
                    style={{
                      width: `${stats.uniqueCustomers > 0
                        ? Math.min(
                          (stats.returningCustomers /
                            stats.uniqueCustomers) *
                          100,
                          100
                        )
                        : 0
                        }%`,
                    }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>


        {/* ═══════════════ REPORTS DOWNLOAD ═══════════════ */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Download className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-bold text-gray-900">
              Download Reports
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                type: "sales",
                title: "Sales Report",
                desc: "Transaction history & revenue analysis",
                icon: TrendingUp,
                gradient: "from-green-500 to-emerald-600",
                bg: "bg-green-50",
                hoverBorder: "hover:border-green-300",
              },
              {
                type: "inventory",
                title: "Inventory Report",
                desc: "Stock levels, value & alerts",
                icon: Package,
                gradient: "from-teal-500 to-cyan-600",
                bg: "bg-teal-50",
                hoverBorder: "hover:border-teal-300",
              },
              {
                type: "expenses",
                title: "Expense Report",
                desc: "Spending breakdown by category",
                icon: FileText,
                gradient: "from-emerald-500 to-green-600",
                bg: "bg-emerald-50",
                hoverBorder: "hover:border-emerald-300",
              },
            ].map((report, i) => (
              <button
                key={i}
                onClick={() => downloadReport(report.type)}
                className={`text-left p-5 rounded-xl border border-green-100 ${report.hoverBorder} transition-all duration-300 hover:shadow-md group`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${report.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}
                  >
                    <report.icon className="w-5 h-5 text-white" />

                  </div>
                  <Download className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm">
                  {report.title}
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  {report.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Footer spacer */}
        <div className="h-4" />
      </div>
    </BillingLayout>
  );
}

export default EmployerDashboard;
