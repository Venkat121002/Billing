import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import API_URL from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import {
  PlusCircle,
  Edit3,
  Trash2,
  Filter,
  BarChart2,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  CircleX,
  Loader2,
  Activity,
  LayoutGrid,
  List,
  Search,
  X,
  SlidersHorizontal,
  Sparkles,
  Camera,
  Download
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import ReceiptScannerModal from "../AI/ReceiptScannerModal";

import {
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";

const CashBook = () => {
  const { currentUser } = useAuth();
  const userData = currentUser;

  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    type: "expense",
    category: "",
  });

  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "descending",
  });

  const [activeTab, setActiveTab] = useState("list"); // 'list' or 'analytics'
  const [showFilters, setShowFilters] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);


  // Fetch Logic
  useEffect(() => {
    if (!currentUser) {
      setError("Please log in to view and manage transactions.");
      setIsLoading(false);
      setTransactions([]);
      return;
    }

    fetchTransactions();
  }, [currentUser]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      const config = { headers: { "x-auth-token": token } };
      const userId = currentUser?.uid || currentUser?.userId;
      const role = currentUser?.role;
      const response = await axios.get(`${API_URL}/cashbook`, config);
      

      const fetchedTransactions = response.data
        .filter((item) => {
          if (role === "owner" || role === "TenantAdmin") {
            // Owner sees only their own records
            return item.source === "Owner" || item.createdBy === userId;
          }
          // Subuser sees only their own records
          return item.createdBy === userId;
        })
        .map((data) => ({
          ...data,
          date: data.date && data.date.split ? data.date.split('T')[0] : data.date
        }));

      setTransactions(fetchedTransactions);
      setError(null);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError(`Failed to fetch transactions: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Memoized Data (Unchanged)
  const incomeCategoriesList = useMemo(
    () => ["Salary", "Freelance", "Investment", "Gift", "Sales", "Other Income"],
    []
  );
  const expenseCategoriesList = useMemo(
    () => [
      "Food", "Housing", "Transport", "Utilities", "Entertainment", "Health",
      "Education", "Shopping", "Office Supplies", "Other Expense",
    ],
    []
  );

  const categoriesForForm = useMemo(() => {
    return formData.type === "income"
      ? incomeCategoriesList
      : expenseCategoriesList;
  }, [formData.type, incomeCategoriesList, expenseCategoriesList]);

  const categoryColors = {
    Salary: "#10B981", Freelance: "#3B82F6", Investment: "#8B5CF6",
    Gift: "#EC4899", Sales: "#F59E0B", "Other Income": "#6B7280",
    Food: "#EF4444", Housing: "#F97316", Transport: "#EAB308",
    Utilities: "#6366F1", Entertainment: "#A855F7", Health: "#22C55E",
    Education: "#0EA5E9", Shopping: "#D946EF", "Office Supplies": "#4ADE80",
    "Other Expense": "#71717A", default: "#8884d8",
  };

  const getCategoryColor = (categoryName) =>
    categoryColors[categoryName] || categoryColors.default;

  // Handlers (Unchanged logic, slightly cleaned)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "type") setFormData((prev) => ({ ...prev, category: "" }));
  };

  const [isAiCategorizing, setIsAiCategorizing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      type: "expense",
      category: "",
    });
    setModalError(null);
    setAiSuggestion(null);
  };

  const handleAiCategorize = async () => {
    if (!formData.description) return;
    setIsAiCategorizing(true);
    try {
      const token = sessionStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/automation/categorize-expense`,
        {
          description: formData.description,
          amount: parseFloat(formData.amount) || 0,
          businessType: currentUser?.industry || currentUser?.businessType || "Retail"
        },
        { headers: { "x-auth-token": token } }
      );
      if (res.data && res.data.category) {
        setAiSuggestion(res.data);
        setFormData((prev) => ({ ...prev, category: res.data.category }));
      }
    } catch (err) {
      console.warn("AI categorization warning:", err);
    } finally {
      setIsAiCategorizing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) { setModalError("Authentication error."); return; }
    if (!formData.category) { setModalError("Please select a category."); return; }

    setIsSubmitting(true);
    setModalError(null);

    const transactionData = {
      ...formData,
      amount: parseFloat(formData.amount),
      // Backend handles Date object conversion or string storage. Sending as string ISO is safer for JSON.
      // But verify if backend expects ISODate string. Controller just takes req.body.
      date: formData.date,
      source: currentUser?.industry || currentUser?.companyDetails?.industry || currentUser?.Tenant?.industry || "Owner", // Add source for filtering
    };

    try {
      const token = sessionStorage.getItem("token");
      const config = { headers: { "Content-Type": "application/json", "x-auth-token": token } };

      if (currentTransaction?.id) {
        await axios.put(`${API_URL}/cashbook/${currentTransaction.id}`, transactionData, config);
      } else {
      await axios.post(`${API_URL}/cashbook`, transactionData, config)
      }
      await fetchTransactions();
      closeModal();
    } catch (err) {
      console.error(err);
      setModalError(`Failed to save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openModal = (transaction = null) => {
    setModalError(null);
    if (transaction) {
      setCurrentTransaction(transaction);
      setFormData({
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount.toString(),
        type: transaction.type,
        category: transaction.category,
      });
    } else {
      setCurrentTransaction(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentTransaction(null);
    resetForm();
  };

  const handleDelete = async (id) => {
    if (!currentUser) return;
    if (window.confirm("Delete this transaction?")) {
      try {
        const token = sessionStorage.getItem("token");
        const config = { headers: { "x-auth-token": token } };
        await axios.delete(`${API_URL}/cashbook/${id}`, config);
        await fetchTransactions();
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  // Helper: Sanitize string to standard ASCII printable characters for jsPDF
  const sanitizePdfText = (str) => {
    if (!str) return "";
    return String(str)
      .replace(/[₹\u20B9]/g, "Rs. ")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\x20-\x7E\t\n]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Helper: Number to Words for Bill Voucher
  const numberToWords = (num) => {
    if (!num || isNaN(num)) return "Zero Only";
    let amount = Math.abs(Math.round(num));
    if (amount === 0) return "Zero Only";

    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
      "Seventeen", "Eighteen", "Nineteen",
    ];
    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
    ];

    function convertLessThanThousand(n) {
      if (n === 0) return "";
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 !== 0 ? " " + convertLessThanThousand(n % 100) : "")
      );
    }

    let words = "";
    if (amount >= 10000000) {
      words += convertLessThanThousand(Math.floor(amount / 10000000)) + " Crore ";
      amount %= 10000000;
    }
    if (amount >= 100000) {
      words += convertLessThanThousand(Math.floor(amount / 100000)) + " Lakh ";
      amount %= 100000;
    }
    if (amount >= 1000) {
      words += convertLessThanThousand(Math.floor(amount / 1000)) + " Thousand ";
      amount %= 1000;
    }
    if (amount > 0) {
      words += convertLessThanThousand(amount);
    }

    return (words.trim() + " Only").replace(/\s+/g, " ");
  };

  // Handler: Generate and Download Bill / Voucher as PDF
  const handleDownloadBill = (transaction) => {
    if (!transaction) return;

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const isIncome = transaction.type === "income" || transaction.type === "cash_in";
      const primaryColor = isIncome ? [16, 185, 129] : [239, 68, 68]; // Emerald or Rose
      const darkColor = [30, 41, 59]; // Slate 800

      const businessName = sanitizePdfText(
        currentUser?.companyDetails?.name ||
        currentUser?.businessName ||
        currentUser?.companyName ||
        currentUser?.displayName ||
        currentUser?.name ||
        "Swordnex Billing"
      );

      const businessPhone = sanitizePdfText(
        currentUser?.companyDetails?.phone ||
        currentUser?.phone ||
        currentUser?.mobile ||
        ""
      );

      const businessGstin = sanitizePdfText(
        currentUser?.companyDetails?.gstin ||
        currentUser?.gstin ||
        ""
      );

      const businessAddress = sanitizePdfText(
        [
          currentUser?.companyDetails?.street || currentUser?.address?.street,
          currentUser?.companyDetails?.city || currentUser?.address?.city,
          currentUser?.companyDetails?.state || currentUser?.address?.state,
          currentUser?.companyDetails?.pincode || currentUser?.address?.pincode,
        ]
          .filter(Boolean)
          .join(", ")
      );

      const voucherId = sanitizePdfText(
        transaction.id
          ? `VCH-${transaction.id.toString().slice(-8).toUpperCase()}`
          : `VCH-${Date.now().toString().slice(-8)}`
      );

      const invoiceRef = sanitizePdfText(
        transaction.metadata?.invoiceNumber ||
        (transaction.description?.match(/#([A-Za-z0-9\-_/]+)/)?.[1] || null)
      );

      // --- Header Banner ---
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 10, "F");

      // --- Business Details (Left) ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(doc.splitTextToSize(businessName, 110), 14, 25);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);

      let businessY = 31;
      if (businessAddress) {
        const splitAddr = doc.splitTextToSize(businessAddress, 110);
        doc.text(splitAddr, 14, businessY);
        businessY += splitAddr.length * 4 + 2;
      }
      if (businessPhone) {
        doc.text(`Phone: ${businessPhone}`, 14, businessY);
        businessY += 5;
      }
      if (businessGstin) {
        doc.text(`GSTIN: ${businessGstin}`, 14, businessY);
        businessY += 5;
      }

      // --- Document Title & Meta (Right) ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(isIncome ? "INCOME RECEIPT" : "EXPENSE BILL", 196, 25, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`Voucher #: ${voucherId}`, 196, 32, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Date: ${transaction.date || new Date().toISOString().split("T")[0]}`, 196, 38, { align: "right" });
      if (invoiceRef) {
        doc.text(`Ref Invoice #: ${invoiceRef}`, 196, 44, { align: "right" });
      }

      // --- Divider Line ---
      const startSectionY = Math.max(businessY + 4, invoiceRef ? 50 : 46);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, startSectionY, 196, startSectionY);

      // --- Transaction Meta Box (Grid of 4 fields) ---
      const boxY = startSectionY + 6;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, boxY, 182, 26, 3, 3, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, boxY, 182, 26, 3, 3, "S");

      // Field 1: Transaction Type
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("TRANSACTION TYPE", 20, boxY + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(isIncome ? "Income (Cash In)" : "Expense (Cash Out)", 20, boxY + 16);

      // Field 2: Category
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("CATEGORY", 70, boxY + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(sanitizePdfText(transaction.category || "General"), 70, boxY + 16);

      // Field 3: Payment Method
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("PAYMENT METHOD", 120, boxY + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(sanitizePdfText((transaction.paymentMode || "Cash / Direct").toUpperCase()), 120, boxY + 16);

      // Field 4: Source / Channel
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("SOURCE / CHANNEL", 165, boxY + 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(sanitizePdfText(transaction.source || "Manual Entry"), 165, boxY + 16);

      // --- Items / Details Table ---
      const tableStartY = boxY + 32;
      const tableHeaders = [
        ["#", "Particulars / Description", "Category", "Type", "Amount (Rs.)"]
      ];

      const amountNum = Math.abs(parseFloat(transaction.amount) || 0);
      const formattedAmount = `Rs. ${amountNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const cleanItemDesc = sanitizePdfText(
        transaction.description || (isIncome ? "Income entry" : "Expense entry")
      );
      const cleanItemCat = sanitizePdfText(transaction.category || "-");

      const tableRows = [
        [
          "1",
          cleanItemDesc,
          cleanItemCat,
          isIncome ? "Income" : "Expense",
          formattedAmount
        ]
      ];

      autoTable(doc, {
        startY: tableStartY,
        head: tableHeaders,
        body: tableRows,
        theme: "plain",
        headStyles: {
          fillColor: primaryColor,
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
          halign: "left",
          cellPadding: 4,
        },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: 85 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25, halign: "right", fontStyle: "bold" },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      const currentY = (doc.lastAutoTable?.finalY || tableStartY + 25) + 8;

      // --- Amount in Words & Totals Summary ---
      const summaryBoxY = currentY;

      // Amount in Words (Left)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("AMOUNT IN WORDS:", 14, summaryBoxY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      const amountInWords = numberToWords(Math.round(amountNum));
      const splitWords = doc.splitTextToSize(`Indian Rupees ${amountInWords}`, 105);
      doc.text(splitWords, 14, summaryBoxY + 5);

      // Totals Box (Right)
      const totBoxX = 125;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(totBoxX, summaryBoxY - 4, 71, 24, 2, 2, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(totBoxX, summaryBoxY - 4, 71, 24, 2, 2, "S");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Total Amount:", totBoxX + 6, summaryBoxY + 5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(formattedAmount, totBoxX + 65, summaryBoxY + 5, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Status:", totBoxX + 6, summaryBoxY + 14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129);
      doc.text("PAID / SETTLED", totBoxX + 65, summaryBoxY + 14, { align: "right" });

      let postSummaryY = summaryBoxY + 28;

      // Additional Remarks / Audit Information
      let rawNotes = transaction.notes || "";
      if (
        transaction.metadata?.vendorGstin &&
        !rawNotes.includes(transaction.metadata.vendorGstin)
      ) {
        rawNotes = rawNotes
          ? `${rawNotes} | Vendor GSTIN: ${transaction.metadata.vendorGstin}`
          : `Vendor GSTIN: ${transaction.metadata.vendorGstin}`;
      }
      const cleanNotes = sanitizePdfText(rawNotes);

      if (cleanNotes) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const splitNotes = doc.splitTextToSize(cleanNotes, 168);
        const lineSpacing = 4;
        const textBlockHeight = splitNotes.length * lineSpacing;
        const boxHeight = Math.max(14, 10 + textBlockHeight);

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, postSummaryY, 182, boxHeight, 2, 2, "F");
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, postSummaryY, 182, boxHeight, 2, 2, "S");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("REMARKS / AUDIT INFO:", 18, postSummaryY + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(splitNotes, 18, postSummaryY + 11);

        postSummaryY += boxHeight + 8;
      }

      // --- Signatures & Footer ---
      const pageHeight = 297;
      const footerY = Math.max(postSummaryY + 16, pageHeight - 45);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(14, footerY + 15, 60, footerY + 15);
      doc.line(150, footerY + 15, 196, footerY + 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Prepared By", 37, footerY + 20, { align: "center" });
      doc.text("Authorized Signatory", 173, footerY + 20, { align: "center" });

      // Bottom note
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        "This is a computer-generated transaction bill/voucher recorded in Swordnex Billing.",
        105,
        pageHeight - 12,
        { align: "center" }
      );
      doc.text(
        `Generated on ${new Date().toLocaleString("en-IN")}`,
        105,
        pageHeight - 8,
        { align: "center" }
      );

      const safeDesc = cleanItemDesc
        .replace(/[^a-zA-Z0-9]/g, "_")
        .slice(0, 15);
      const fileName = `${isIncome ? "Income" : "Expense"}_Bill_${transaction.date || "record"}_${safeDesc || "voucher"}.pdf`;
      doc.save(fileName);
      toast.success("Bill downloaded successfully!");
    } catch (err) {
      console.error("Error generating bill PDF:", err);
      toast.error("Failed to generate bill download.");
    }
  };

  // Filtering & Sorting Logic
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (filterType !== "all" && t.type !== filterType) return false;
        if (filterCategory && t.category !== filterCategory) return false;
        if (filterStartDate && t.date < filterStartDate) return false;
        if (filterEndDate && t.date > filterEndDate) return false;
        if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortConfig.key === "date") {
          return sortConfig.direction === "ascending"
            ? new Date(a.date) - new Date(b.date)
            : new Date(b.date) - new Date(a.date);
        }
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "ascending" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
  }, [transactions, filterType, filterCategory, filterStartDate, filterEndDate, searchTerm, sortConfig]);

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const summary = useMemo(() => {
    const totalIncome = filteredTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = filteredTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, balance };
  }, [filteredTransactions]);

  const uniqueCategoriesForFilter = useMemo(() => {
    return ["", ...Array.from(new Set(transactions.map((t) => t.category))).sort()];
  }, [transactions]);

  const analyticsData = useMemo(() => {
    const monthlySummary = Array(12).fill(null).map(() => ({ income: 0, expense: 0, month: "" }));
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const incomeByCat = {};
    const expenseByCat = {};

    filteredTransactions.forEach((t) => {
      const monthIndex = new Date(t.date).getMonth();
      monthlySummary[monthIndex].month = monthNames[monthIndex];
      if (t.type === "income") {
        incomeByCat[t.category] = (incomeByCat[t.category] || 0) + t.amount;
        monthlySummary[monthIndex].income += t.amount;
      } else {
        expenseByCat[t.category] = (expenseByCat[t.category] || 0) + t.amount;
        monthlySummary[monthIndex].expense += t.amount;
      }
    });

    return {
      incomePieData: Object.entries(incomeByCat).map(([name, value]) => ({ name, value })),
      expensePieData: Object.entries(expenseByCat).map(([name, value]) => ({ name, value })),
      monthlyChartData: monthlySummary.filter((m) => m.month),
    };
  }, [filteredTransactions]);

  // --- UI Components ---

  const StatCard = ({ title, amount, icon: Icon, trend, colorClass }) => (
    <div className={`bg-white rounded-xl shadow-sm p-6 border-t-4 ${colorClass} transition-all hover:shadow-md`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-2">
            {typeof amount === 'number' ? `₹${amount.toLocaleString('en-IN')}` : amount}
          </h3>
        </div>
        <div className={`p-3 rounded-lg bg-slate-50`}>
          <Icon className="w-5 h-5 text-slate-600" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-xs">
          <span className={trend >= 0 ? "text-green-600" : "text-red-600"}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
          <span className="text-slate-400 ml-1.5">vs last month</span>
        </div>
      )}
    </div>
  );

  const Tabs = () => (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
      <button
        onClick={() => setActiveTab("list")}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === "list" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
      >
        <List size={16} /> Transactions
      </button>
      <button
        onClick={() => setActiveTab("analytics")}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === "analytics" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
      >
        <BarChart2 size={16} /> Analytics
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <BillingLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="mt-4 text-slate-600 font-medium">Loading your ledger...</p>
        </div>
      </BillingLayout>
    );
  }

  if (error && !currentUser) {
    return (
      <BillingLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
          <CircleX className="w-12 h-12 text-red-400 mb-4" />
          <h3 className="text-xl font-bold text-slate-800">Access Denied</h3>
          <p className="text-slate-500 mt-1">{error}</p>
        </div>
      </BillingLayout>
    );
  }

  return (
    <BillingLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Cash Book</h1>
            <p className="text-slate-500">Manage your financial flow efficiently.</p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs />
            <button
              onClick={() => setShowScannerModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold text-sm hover:from-purple-700 hover:to-indigo-700 shadow-sm shadow-purple-200 transition-all"
            >
              <Camera size={18} /> 📸 Scan Receipt
            </button>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-sm transition-colors"
            >
              <PlusCircle size={18} /> Add New
            </button>
          </div>
        </div>


        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Income" amount={summary.totalIncome} icon={TrendingUp} colorClass="border-green-500" />
          <StatCard title="Total Expenses" amount={summary.totalExpenses} icon={TrendingDown} colorClass="border-red-500" />
          <StatCard
            title="Net Balance"
            amount={summary.balance}
            icon={DollarSign}
            colorClass={summary.balance >= 0 ? "border-blue-500" : "border-orange-500"}
          />
          <StatCard
            title="Savings Rate"
            amount={summary.totalIncome > 0 ? `${((summary.balance / summary.totalIncome) * 100).toFixed(0)}%` : "0%"}
            icon={Activity}
            colorClass="border-purple-500"
          />
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

          {/* List View */}
          {activeTab === "list" && (
            <>
              {/* Controls Bar */}
              <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  <SlidersHorizontal size={16} /> Filters
                  {(filterType !== "all" || filterCategory || filterStartDate) && (
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  )}
                </button>
              </div>

              {/* Collapsible Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-b border-slate-100 bg-slate-50/50 animate-in slide-in-from-top-4 duration-200">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="all">All Types</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                    >
                      {uniqueCategoriesForFilter.map((cat) => (
                        <option key={cat} value={cat}>{cat || "All Categories"}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      {[
                        { key: "date", label: "Date" },
                        { key: "description", label: "Description" },
                        { key: "category", label: "Category" },
                        { key: "amount", label: "Amount", align: "right" }
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => requestSort(col.key)}
                          className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                        >
                          <div className={`flex items-center ${col.align === 'right' ? 'justify-end' : ''}`}>
                            {col.label}
                            {sortConfig.key === col.key && (
                              <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">{t.date}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{t.description}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
                              {t.category}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-right font-mono text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                            {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => handleDownloadBill(t)}
                              title="Download Bill"
                              aria-label="Download Bill"
                              className="p-2 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors inline-flex items-center justify-center"
                            >
                              <Download size={16} />
                              <span className="sr-only">Download Bill</span>
                            </button>
                            <button
                              onClick={() => openModal(t)}
                              title="Edit Entry"
                              aria-label="Edit Entry"
                              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              title="Delete Entry"
                              aria-label="Delete Entry"
                              className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-16 text-slate-400">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          No transactions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Analytics View */}
          {activeTab === "analytics" && (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                <h3 className="font-bold text-slate-700 mb-6">Monthly Overview</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={analyticsData.monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                      <Tooltip
                        contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => `₹${value.toLocaleString()}`}
                      />
                      <Bar dataKey="income" fill="#22C55E" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4 text-xs font-medium">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div> Income</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"></div> Expense</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                <h3 className="font-bold text-slate-700 mb-6">Expense Breakdown</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={analyticsData.expensePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                        {analyticsData.expensePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: "12px", fontWeight: "600" }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                {currentTransaction ? "Edit Entry" : "New Entry"}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Description</label>
                <input
                  type="text"
                  name="description"
                  placeholder="What was this for?"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Type</label>
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, type: 'expense', category: '' }))}
                      className={`w-full py-2 text-xs font-bold rounded-md transition-all ${formData.type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, type: 'income', category: '' }))}
                      className={`w-full py-2 text-xs font-bold rounded-md transition-all ${formData.type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      Income
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-slate-600">Category</label>
                    <button
                      type="button"
                      onClick={handleAiCategorize}
                      disabled={isAiCategorizing || !formData.description}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 flex items-center gap-1 transition-colors"
                      title="Auto-detect category with AI"
                    >
                      {isAiCategorizing ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Sparkles size={11} className="text-amber-500" />
                      )}
                      <span>AI Suggest</span>
                    </button>
                  </div>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="" disabled>Select...</option>
                    {categoriesForForm.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  {aiSuggestion && (
                    <div className="mt-1.5 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <Sparkles size={10} /> Suggested: <strong>{aiSuggestion.category}</strong> ({Math.round((aiSuggestion.confidence || 0.9) * 100)}% match)
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-semibold text-sm hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 3 Feature 11: AI Receipt & Invoice Scanner Modal */}
      <ReceiptScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onExpenseSaved={() => {
          fetchTransactions();
          setShowScannerModal(false);
        }}
      />
    </BillingLayout>
  );
};


export default CashBook;
