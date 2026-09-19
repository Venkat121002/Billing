
// import React, { useState, useEffect, useMemo, useCallback } from "react";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Package,
  FileText,
  Users,
  Wallet,
  Receipt,
  Download,
  TrendingUp,
  DollarSign,
  BarChart3,
  Calendar,
  Filter,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Database,
  ShoppingCart,
  Trash2,
  X,
  PlusCircle,
  Briefcase,
  Building2,
  Hash,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  CheckCircle,
  Printer
} from "lucide-react";
import axios from "axios";
import API_URL from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { INDUSTRY_DEFAULT_TABS } from "../../config/tabDefaults";

const dateFormat = (date) => {
  try {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return new Intl.DateTimeFormat("en-IN", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true }).format(d);
  } catch (error) {
    return date;
  }
};



const SDRecord = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [creditRecords, setCreditRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "inventory");
  const [loading, setLoading] = useState(true);
  const [cashRecords, setCashRecords] = useState([]);
  const [gstFilter, setGstFilter] = useState("all");
  const [gstRecords, setGstRecords] = useState([]);
  const [billingRecords, setBillingRecords] = useState([]);
  const [billingCustomers, setBillingCustomers] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [profit, setProfit] = useState(0);
  const [feeFilter, setFeeFilter] = useState("all");
  const [productMap, setProductMap] = useState({});
  const [productMapById, setProductMapById] = useState({});
  const [receiptDate, setReceiptDate] = useState(null);
 

  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isMobileIndustry, setIsMobileIndustry] = useState(false);
  const [isAcademyIndustry, setIsAcademyIndustry] = useState(false);
  const [isSoftwareDev, setIsSoftwareDev] = useState(false);
  const [tabs, setTabs] = useState([]);

  // Supplier Management State
  const [suppliers, setSuppliers] = useState([]);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [viewSupplier, setViewSupplier] = useState(null);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [supplierFormData, setSupplierFormData] = useState({
    name: "",
    company: "",
    code: "",
    gst: "",
    pan: "",
    mobile: "",
    email: "",
    address: "",
    paymentMode: "Cash",
  });

   const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [recordToPrint, setRecordToPrint] = useState(null);
    const printRef = useRef(null);
    const printAreaRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      const userIndustry =
        currentUser.industry || currentUser.companyDetails?.industry || currentUser.Tenant?.industry;
     
      let isSoftware = false;
      if (userIndustry) {
        const industryLower = userIndustry.toLowerCase();
        setIsSoftwareDev(isSoftware);
        isSoftware = industryLower.includes("software") || industryLower.includes("development");
      }

       
        setTabs([
          { id: "sales", label: "Billing", icon: ShoppingCart, color: "blue" },
          { id: "credit", label: "Credit", icon: FileText, color: "blue" },
          { id: "cashbook", label: "Cashbook", icon: Wallet, color: "blue" },
          { id: "gst", label: "GST Invoice", icon: Receipt, color: "blue" },
          { id: "customers", label: "Clients", icon: Users, color: "blue" },
          
        ]);
        if (activeTab === 'inventory' && !location.state?.activeTab) setActiveTab('sales');
      }
   
  }, [currentUser, location.state]);

  const fetchSuppliers = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    if (!token || !currentUser) return;

    try {
      const config = { headers: { "x-auth-token": token } };
      const suppliersRes = await axios.get(`${API_URL}/suppliers`, config);
      const userId = currentUser?.uid || currentUser?.userId;
      const role = currentUser?.role;
      const suppliersFiltered = suppliersRes.data.filter((item) => {
        if (role === "owner" || role === "TenantAdmin") {
          return item.source === "Owner" || item.createdBy === userId;
        }
        return item.createdBy === userId;
      });
      setSuppliers(suppliersFiltered);
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
      // Using toast for user feedback, assuming toast is configured in the project
      // toast.error("Could not refresh suppliers list.");
    }
  }, [currentUser]);

  const handlePrint = () => {
    if (printRef.current && printAreaRef.current) {
      printAreaRef.current.innerHTML = printRef.current.innerHTML;
      window.print();
      // Optional: Clear the print area after a delay
      setTimeout(() => {
        if (printAreaRef.current) printAreaRef.current.innerHTML = "";
      }, 1000);
    }
  };
  const handleOpenPrintModal = (record) => {
    setRecordToPrint(record);
    setIsPrintModalOpen(true);
  };

  useEffect(() => {
    // Check for either uid (Firebase standard) or userId (Backend standard)
    const userId = currentUser?.uid || currentUser?.userId;

    if (!userId) {
      console.log("⚠️ No user ID found, skipping fetch");
      setLoading(false);
      return;
    }
    setLoading(true);
    const token = sessionStorage.getItem("token");

    const fetchData = async () => {
      try {
        const config = { headers: { "x-auth-token": token } };

        // 1. Products (Inventory)
        const userId = currentUser?.uid || currentUser?.userId;
        const role = currentUser?.role;
        const productsRes = await axios.get(`${API_URL}/products`, config);
        const productsDocs = productsRes.data
          .filter((item) => {
            if (role === "owner" || role === "TenantAdmin") {
              return item.source === "Owner" || item.createdBy === userId;
            }
            return item.createdBy === userId;
          })
          .map((data) => ({
            id: data.id,
            productname: data.name || "N/A",
            productquantity: Number(data.quantity) || 0,
            purchaseDate: data.purchaseDate || null,
            salesDate: data.salesDate || null,
            type: data.category || "N/A",
            salesPrice: Number(data.salePrice || data.salesPrice) || 0,
            salesGST: Number(data.salesGst || data.gstRate || data.gst) || 0,
            purchasePrice: Number(data.purchasePrice) || 0,
            purchaseGST: Number(data.purchaseGst) || 0,
            sku: data.sku || data.id || "N/A",
            reorderLevel: Number(data.reorderLevel) || 0,
            brand: data.brand || "N/A",
            model: data.model || "N/A",
            imei1: data.imei1 || "N/A",
            color: data.color || "N/A",
            storage: data.storage || "N/A",
            // storage: data.storage || "N/A",
            duration: data.duration || "0",
            supplier: data.supplier || "N/A",
            purchaseGstAmount: Number(data.purchaseGstAmount) || 0,
            purchaseTotalAmount: Number(data.purchaseTotalAmount) || 0,
            purchaseLocation: data.purchaseLocation || "N/A",
            paymentMethod: data.paymentMethod || "N/A",
            isCredit: data.isCredit || "No",
            quantity: Number(data.quantity) || 0,
            createdAt: data.createdAt || null,
          }));
        setRecords(productsDocs);
        const map = {};
        const mapById = {};
        productsDocs.forEach((p) => {
          map[p.sku] = p;
          mapById[p.id] = p;
        });
        setProductMap(map);
        setProductMapById(mapById);

        // 2. Billing Customers
        const customersRes = await axios.get(`${API_URL}/clients`, config);
        let customerData = customersRes.data
          .filter((item) => {
            if (role === "owner" || role === "TenantAdmin") {
              return item.source === "Owner" || item.createdBy === userId;
            }
            return item.createdBy === userId;
          });

        const userIndustry = currentUser.industry || currentUser.companyDetails?.industry || currentUser.Tenant?.industry;
        if (userIndustry?.toLowerCase().includes("software_development")) {
          customerData = customerData.filter(c => c.source === 'Software_Development' || (c.projectName && c.projectType));
        }

        const customerDocs = customerData.map((d) => ({
            ...d,
            phone: d.phone || d.mobile || "N/A",
            location: d.location || d.address || "N/A",
            createdAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-IN") : "N/A"
          }));
        setBillingCustomers(customerDocs);

        // 3. Sales (Billing)
        const [billsRes, gstRes, creditRes, cashbookRes] = await Promise.all([
          axios.get(`${API_URL}/billing/bills`, config),
          axios.get(`${API_URL}/gst-bills`, config),
          axios.get(`${API_URL}/credit`, config),
          axios.get(`${API_URL}/cashbook`, config)
        ]);
       

        const customersMap = {};
        customersRes.data.forEach(c => customersMap[c.id] = c);

        const salesDocs = billsRes.data
          .filter((item) => {
            if (role === "owner" || role === "TenantAdmin") {
              return item.source === "Owner" || item.createdBy === userId;
            }
            return item.createdBy === userId;
          })
          .map((data) => {
            const customer = customersMap[data.customerId] || {};
            const totalAmount = Number(data.totals?.grandTotal) || 0;
            const totalGst = Number(data.totals?.totalGst) || data.items?.reduce((sum, item) => {
              const productGst = Number(item.gstRate) || Number(map[item.sku || item.id]?.salesGST) || 0;
              const itemTotal = Number(item.price || 0) * Number(item.qty || 1);
              return sum + (itemTotal * productGst) / 100;
            }, 0) || 0;

            return {
              id: data.id,
              receiptNo: data.receiptNo || data.id,
              date: data.receiptDate ? new Date(data.receiptDate).toLocaleDateString("en-IN") : "N/A",
              BillingcustomerName: customer.name || data.customerName || "Walk-in",
              BillingcustomerPhone: customer.phone || customer.mobile || "N/A",
              BillingcustomerLocation: customer.address || customer.location || "N/A",
              products: data.items || [],
              totalAmount: totalAmount,
              totalGst: totalGst,
              subtotal: totalAmount - totalGst,
            };
          });
        setBillingRecords(salesDocs);

        // 4. GST Bills
        const gstDocs = gstRes.data
          .filter((item) => {
            if (role === "owner" || role === "TenantAdmin") {
              return item.source === "Owner" || item.createdBy === userId;
            }
            return item.createdBy === userId;
          })
          .map((data) => {
            const invoiceRaw = data.invoiceDetails?.invoiceDate || data.invoiceDate;
            const invoiceDate = invoiceRaw?.toDate
              ? new Date(invoiceRaw.toDate()).toLocaleDateString("en-IN")
              : invoiceRaw
                ? new Date(invoiceRaw).toLocaleDateString("en-IN")
                : "N/A";

            const invoiceNoRaw = data.invoiceDetails?.invoiceNumber || data.invoiceNumber;
            const invoiceNo = invoiceNoRaw !== undefined && invoiceNoRaw !== null
              ? String(invoiceNoRaw).trim()
              : data.id;

            return {
              id: data.id,
              invoiceNo,
              invoiceDate,
              buyerDetails: {
                name: data.buyerDetails?.name || data.buyerName || "N/A",
                phone: data.buyerDetails?.phone || data.buyerPhone || "N/A",
                email: data.buyerDetails?.email || data.buyerEmail || "N/A",
                address: data.buyerDetails?.address || data.buyerAddress || "N/A",
              },
              sellerDetails: {
                name: data.sellerDetails?.name || data.sellerName || "N/A",
                phone: data.sellerDetails?.phone || data.sellerPhone || "N/A",
                email: data.sellerDetails?.email || data.sellerEmail || "N/A",
                address: data.sellerDetails?.address || data.sellerAddress || "N/A",
              },
              grandTotal: data.calculations?.grandTotal || data.grandTotal || 0,
              status: data.status || "N/A",
            };
          });
        setGstRecords(gstDocs);

        // 5. Credit Records
        const creditDocs = creditRes.data
          .filter((item) => {
            if (role === "owner" || role === "TenantAdmin") {
              return item.source === "Owner" || item.createdBy === userId;
            }
            return item.createdBy === userId;
          })
          .map((data) => {
            const firstProduct = data.products?.[0] || {};
            const quantity = Number(data.quantity) || data.products?.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0) || 0;
            const price = Number(data.price) || Number(firstProduct.price) || 0;
            const gst = Number(data.gst) || Number(firstProduct.gst) || Number(firstProduct.salesGst) || 0;
            const subTotal = price * quantity;
            const totalWithGst = subTotal + (subTotal * gst / 100);
           
            const total = Number(data.total) || 0;
            const credit = Number(data.credit) || 0;
            const dueSession = Number(data.dueSession) || 1;
            const perSessionDue = total / dueSession;

            let remainingPayment = credit;
            let runningBalance = total;

            let payments = data.payments;
            if (!payments || !Array.isArray(payments) || payments.length === 0) {
              payments = Array.from({ length: dueSession }).map((_, i) => {
                let paid = 0;
                if (remainingPayment > 0) {
                  paid = Math.min(remainingPayment, perSessionDue);
                }
                const sessionBalance = perSessionDue - paid;
                runningBalance -= paid;
                remainingPayment -= paid;
                return {
                  session: i + 1,
                  due: perSessionDue,
                  paid: paid,
                  balance: sessionBalance,
                  currentBalance: runningBalance,
                  date: (i === 0 && paid > 0) ? data.date : null
                };
              });
            }
           
            return {
              id: data.id,
              customerId: data.customerId || "N/A",
              name: data.name || "N/A",
              customerName: data.name || "N/A",
              phone: data.phone || data.mobile || "N/A",
              address: data.address || data.location || "N/A",
              email: data.email || "N/A",
              date: data.date || "N/A",
              description: data.description || data.products?.map(p => p.description).join(', ') || "N/A",
              quantity,
              price,
              gst,
              products: data.products || [],
              total: Number(data.total) || 0,
              total: total,
              totalWithGst, // ✅ New calculated total for mobile industry
              credit: Number(data.credit) || 0,
              credit: credit,
              balance: Number(data.balance) || 0,
              due: Number(data.due) || 0,
              dueSession: data.dueSession || 0,
              dueSession: dueSession,
              payments: payments,
              status: Number(data.balance) === 0 ? "Closed" : "Pending",
              createdAt: data.createdAt || null
            };
          });

        setCreditRecords(creditDocs);

        // 6. Cashbook Records
        const cashDocs = cashbookRes.data
          .filter((item) => {
            if (role === "owner" || role === "TenantAdmin") {
              return item.source === "Owner" || item.createdBy === userId;
            }
            return item.createdBy === userId;
          })
          .map((data) => ({
            id: data.id,
            date: data.date && data.date.split ? new Date(data.date).toLocaleDateString("en-IN") : "N/A",
            description: data.description || "N/A",
            description: data.description || "N/A", // Corrected: Use data.description
            type: data.type || "N/A",
            amount: Number(data.amount) || 0,
            paymentMode: data.paymentMode || "N/A",
            category: data.category || "",
            createdAt: data.createdAt ? new Date(data.createdAt).toLocaleString() : "N/A",
          }));
        setCashRecords(cashDocs);

        // 7. Suppliers
        fetchSuppliers();
        // Calculate Profit (Simple version based on loaded products)
        // Note: Profit calc might be inaccurate if products changed since sale,
        // but this matches the logic we had.
        let totalProfit = 0;
        salesDocs.forEach((sale) => {
          sale.products.forEach((item) => {
            // Logic can be added here if needed, consistent with previous implementation
          });
        });

      } catch (err) {
        console.error("API Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

  }, [currentUser, fetchSuppliers]);

  const handleEditSupplier = (supplier) => {
    setEditingSupplierId(supplier.id);
    setSupplierFormData({
      name: supplier.name || "",
      company: supplier.company || "",
      code: supplier.code || "",
      gst: supplier.gst || "",
      pan: supplier.pan || "",
      mobile: supplier.mobile || "",
      email: supplier.email || "",
      address: supplier.address || "",
      paymentMode: supplier.paymentMode || (isAcademyIndustry ? "" : "Cash"),
    });
    setIsSupplierModalOpen(true);
  };

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm(`Are you sure you want to delete this ${isAcademyIndustry ? "trainer" : "supplier"}?`)) return;
    const token = sessionStorage.getItem("token");
    try {
      await axios.delete(`${API_URL}/suppliers/${id}`, {
        headers: { "x-auth-token": token },
      });
      setSuppliers(suppliers.filter((s) => s.id !== id));
      toast.success(`${isAcademyIndustry ? "Trainer" : "Supplier"} deleted successfully!`);
    } catch (err) {
      console.error("Delete supplier error:", err);
      toast.error(`Failed to delete ${isAcademyIndustry ? "trainer" : "supplier"}`);
    }
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (supplierFormData.mobile && supplierFormData.mobile.length !== 10) {
      toast.error("Mobile number must be exactly 10 digits");
      return;
    }
    const token = sessionStorage.getItem("token");
    try {
      if (editingSupplierId) {
        await axios.put(`${API_URL}/suppliers/${editingSupplierId}`, supplierFormData, {
          headers: { "x-auth-token": token },
        });
        toast.success(`${isAcademyIndustry ? "Trainer" : "Supplier"} updated successfully!`);
      } else {
        await axios.post(`${API_URL}/suppliers`, supplierFormData, {
          headers: { "x-auth-token": token },
        });
        toast.success(`${isAcademyIndustry ? "Trainer" : "Supplier"} added successfully!`);
      }
      setIsSupplierModalOpen(false);
      setSupplierFormData({
        name: "",
        company: "",
        code: "",
        gst: "",
        pan: "",
        mobile: "",
        email: "",
        address: "",
        paymentMode: isAcademyIndustry ? "" : "Cash",
      });
      setEditingSupplierId(null);
      fetchSuppliers(); // Re-fetch suppliers to refresh the list
    } catch (err) {
      console.error("Save supplier error:", err);
      toast.error(`Failed to save ${isAcademyIndustry ? "trainer" : "supplier"}`);
    }
  };

  const handlePayCredit = (creditRecord) => {
    navigate("/billing", {
      state: {
        creditPayment: {
          id: creditRecord.id,
          name: creditRecord.name,
          customerName: creditRecord.name,
          payAmount: creditRecord.balance // Pre-fill with remaining balance
        }
      }
    });
  };

  const filteredRecords = useMemo(() => {
    const parseDate = (d) => {
      if (!d || d === "N/A") return null;
      if (typeof d === 'object' && d.seconds) {
        return new Date(d.seconds * 1000).setHours(0, 0, 0, 0);
      }
      // Handle DD/MM/YYYY format which is common in Indian locale
      if (typeof d === 'string' && d.includes('/')) {
        const parts = d.split('/');
        if (parts.length === 3) {
          // Assume DD/MM/YYYY format (parts[2]=YYYY, parts[1]=MM, parts[0]=DD)
          // Month is 0-indexed in JS Date constructor
          return new Date(parts[2], parts[1] - 1, parts[0]).setHours(0, 0, 0, 0);
        }
      }
      return new Date(d).setHours(0, 0, 0, 0);
    };
    const from = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
    const to = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;

    let recordsList = [];

    if (activeTab === "inventory") {
      const term = searchTerm.toLowerCase();
      recordsList = records.filter((p) => {
        if (isMobileIndustry) {
          return (
            (p.brand || "").toLowerCase().includes(term) ||
            (p.model || "").toLowerCase().includes(term) ||
            (p.imei1 || "").toLowerCase().includes(term) ||
            (p.color || "").toLowerCase().includes(term) ||
            (p.storage || "").toLowerCase().includes(term) ||
            (p.sku || "").toLowerCase().includes(term) ||
            (p.productname || "").toLowerCase().includes(term)
          );
        } else {
          return (
            (p.productname || "").toLowerCase().includes(term) ||
            (p.sku || "").toLowerCase().includes(term) ||
            (p.type || "").toLowerCase().includes(term) ||
            (p.category || "").toLowerCase().includes(term)
          );
        }
      });

      if (selectedCategory !== "all") {
        recordsList = recordsList.filter((p) => (p.type || p.category) === selectedCategory);
      }

      if (inventoryFilter === "purchase")
        recordsList = recordsList.filter((p) => p.purchasePrice > 0);
      else if (inventoryFilter === "sales")
        recordsList = recordsList.filter((p) => p.salesPrice > 0);
    } else if (activeTab === "buy") {
      const term = searchTerm.toLowerCase();
      recordsList = records.filter((p) =>
        (p.supplier || "").toLowerCase().includes(term) ||
        (p.brand || "").toLowerCase().includes(term) ||
        (p.model || "").toLowerCase().includes(term) ||
        (p.type || "").toLowerCase().includes(term)
      );

      if (selectedCategory !== "all") {
        recordsList = recordsList.filter((p) => (p.type || p.category) === selectedCategory);
      }
    } else if (activeTab === "sales") {
      recordsList = billingRecords.filter((b) => {
        const s = searchTerm.toLowerCase();
        return (
          (b.BillingcustomerName || "").toLowerCase().includes(s) ||
          (b.receiptNo || "").toString().toLowerCase().includes(s) ||
          b.products?.some((p) =>
            (p.name || "").toLowerCase().includes(s)
          )
        );
      });
    } else if (activeTab === "credit") {
      recordsList = creditRecords.filter((c) =>
        (c.customerName || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
      if ((isAcademyIndustry || isMobileIndustry) && feeFilter !== "all") {
        if (feeFilter === "pending") {
          recordsList = recordsList.filter((c) => Number(c.balance) > 0);
        } else if (feeFilter === "closed") {
          recordsList = recordsList.filter((c) => Number(c.balance) === 0);
        }
      }
    } else if (activeTab === "cashbook") {
      recordsList = cashRecords.filter((c) =>
        (c.description || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else if (activeTab === "gst") {
      recordsList = gstRecords.filter((g) => {
        const s = (searchTerm || "").toString().trim().toLowerCase();
        const invoiceNo = (g.invoiceNo || "").toString().trim().toLowerCase();
        const buyer = (g.buyerDetails?.name || "")
          .toString()
          .trim()
          .toLowerCase();
        const seller = (g.sellerDetails?.name || "")
          .toString()
          .trim()
          .toLowerCase();
        return (
          s === "" ||
          invoiceNo.includes(s) ||
          buyer.includes(s) ||
          seller.includes(s)
        );
      });
    } else if (activeTab === "customers") {
      recordsList = billingCustomers.filter((c) => {
        const term = searchTerm.toLowerCase();
        return (
          (c.name || "").toLowerCase().includes(term) ||
          (c.phone || "").toLowerCase().includes(term) ||
          (c.location || "").toLowerCase().includes(term)
        );
      });
    } else if (activeTab === "suppliers") {
      recordsList = suppliers.filter((s) => {
        const term = searchTerm.toLowerCase();
        return (
          (s.name || "").toLowerCase().includes(term) ||
          (s.company || "").toLowerCase().includes(term) ||
          (s.code || "").toLowerCase().includes(term) ||
          (s.mobile || "").toLowerCase().includes(term)
        );
      });
    }

    return recordsList.filter((r) => {
      let recordDate;
      if (activeTab === "sales") recordDate = parseDate(r.date);
      else if (activeTab === "inventory") recordDate = parseDate(r.purchaseDate || r.salesDate || r.createdAt);
      else if (activeTab === "cashbook") recordDate = parseDate(r.date);
      else if (activeTab === "gst") recordDate = parseDate(r.invoiceDate);
      else if (activeTab === "credit") {
        const d = (r.date && r.date !== "N/A") ? r.date : r.createdAt;
        recordDate = parseDate(d);
      }
      else if (activeTab === "customers" || activeTab === "suppliers") recordDate = parseDate(r.createdAt);
     
      if (from || to) {
        if (!recordDate) return false;
        if (from && recordDate < from) return false;
        if (to && recordDate > to) return false;
      }
      return true;
    });
  }, [
    records,
    creditRecords,
    cashRecords,
    gstRecords,
    billingRecords,
    billingCustomers,
    searchTerm,
    activeTab,
    fromDate,
    toDate,
    inventoryFilter,
    suppliers,
    feeFilter,
    isAcademyIndustry,
    isMobileIndustry,
  ]);

  const totals = useMemo(() => {
    let subtotal = 0,
      gstTotal = 0,
      grandTotal = 0,
      profitVal = 0;

    if (activeTab === "inventory") {
      const isSalesTaxInclusive = currentUser?.Tenant?.sales_tax_type === 'inclusive';
      const isPurchaseTaxInclusive = currentUser?.Tenant?.purchase_tax_type === 'inclusive';

      filteredRecords.forEach((item) => {
        const qty = Number(item.productquantity) || 0;

        // Sales-based inventory value
        const salesPrice = Number(item.salesPrice) || 0;
        const salesGstRate = Number(item.salesGST) || 0;
        let itemSaleSubtotal = 0;
        let itemSaleGst = 0;

        if (isSalesTaxInclusive) {
          const itemSaleGrandTotal = salesPrice * qty;
          itemSaleGst = itemSaleGrandTotal - (itemSaleGrandTotal / (1 + salesGstRate / 100));
          itemSaleSubtotal = itemSaleGrandTotal - itemSaleGst;
        } else {
          itemSaleSubtotal = salesPrice * qty;
          itemSaleGst = (itemSaleSubtotal * salesGstRate) / 100;
        }

        subtotal += itemSaleSubtotal;
        gstTotal += itemSaleGst;

        // Profit calculation
        const purchasePriceRaw = Number(item.purchasePrice) || 0;
        if (purchasePriceRaw > 0) {
          const purchaseGstRate = Number(item.purchaseGST) || 0;
          let basePurchasePrice = purchasePriceRaw;

          if (isPurchaseTaxInclusive) {
            basePurchasePrice = purchasePriceRaw / (1 + (purchaseGstRate / 100));
          }

          const cost = basePurchasePrice * qty;
          profitVal += (itemSaleSubtotal - cost);
        }
      });
      grandTotal = subtotal + gstTotal;
    } else if (activeTab === "credit") {
      filteredRecords.forEach((item) => {
        const isSalesTaxInclusive = currentUser?.Tenant?.sales_tax_type === 'inclusive';
        const isPurchaseTaxInclusive = currentUser?.Tenant?.purchase_tax_type === 'inclusive';

        let saleSubtotalForCredit = 0;
        let saleGstForCredit = 0;

        if (item.products && item.products.length > 0) {
          item.products.forEach(p => {
            const itemPrice = Number(p.price) || 0;
            const itemQty = Number(p.quantity) || 1;
            const itemGstRate = Number(p.gst) || 0;
            let itemRevenue = itemPrice * itemQty;
            let itemGst = 0;

            if (isSalesTaxInclusive) {
              itemGst = itemRevenue - (itemRevenue / (1 + itemGstRate / 100));
              itemRevenue = itemRevenue - itemGst;
            } else {
              itemGst = (itemRevenue * itemGstRate) / 100;
            }
            saleSubtotalForCredit += itemRevenue;
            saleGstForCredit += itemGst;

            let originalProduct = productMapById[p.productId];
            if (!originalProduct) {
              originalProduct = Object.values(productMapById).find(prod => String(prod.id) === String(p.productId));
            }
            if (!originalProduct && p.description) {
              originalProduct = Object.values(productMapById).find(prod => (prod.productname || "").toLowerCase() === (p.description || "").toLowerCase());
            }

            let costOfItem = 0;
            if (originalProduct) {
              const purchasePriceRaw = Number(originalProduct.purchasePrice) || 0;
              const purchaseGstRate = Number(originalProduct.purchaseGST) || 0;
              let basePurchasePrice = purchasePriceRaw;
              if (isPurchaseTaxInclusive) {
                basePurchasePrice = purchasePriceRaw / (1 + (purchaseGstRate / 100));
              }
              costOfItem = basePurchasePrice * itemQty;
            }
            profitVal += (itemRevenue - costOfItem);
          });
        } else {
          const totalAmount = Number(item.total) || 0;
          const gstRate = Number(item.gst) || 0;
          saleGstForCredit = totalAmount - (totalAmount / (1 + gstRate / 100));
          saleSubtotalForCredit = totalAmount - saleGstForCredit;
          profitVal += saleSubtotalForCredit;
        }
        subtotal += saleSubtotalForCredit;
        gstTotal += saleGstForCredit;
        grandTotal += saleSubtotalForCredit + saleGstForCredit;
      });
    } else if (activeTab === "cashbook") {
      grandTotal = filteredRecords.reduce(
        (acc, item) => acc + Number(item.amount || 0),
        0
      );
      subtotal = grandTotal;
    } else if (activeTab === "gst") {
      grandTotal = filteredRecords.reduce(
        (acc, item) => acc + Number(item.grandTotal || 0),
        0
      );
      subtotal = grandTotal;
    } else if (activeTab === "sales") {
      const isPurchaseTaxInclusive = currentUser?.Tenant?.purchase_tax_type === 'inclusive';
      const isSalesTaxInclusive = currentUser?.Tenant?.sales_tax_type === 'inclusive';
      if (isAcademyIndustry) {
        filteredRecords.forEach((item) => {
          subtotal += Number(item.subtotal) || 0;
          gstTotal += Number(item.totalGst) || 0;
          grandTotal += Number(item.totalAmount) || 0;
        });

        // Academy Profit = Sales Subtotal + Cashbook Income - Cashbook Expenses
        // (Trainer Salaries are included in Cashbook Expenses via the backend scheduled job)

        const parseDateLocal = (d) => {
          if (!d) return null;
          // Assuming date is in "dd/MM/yyyy" format from the backend mapping
          const parts = d.split('/');
          if (parts.length === 3) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).setHours(0, 0, 0, 0);
          }
          return new Date(d).setHours(0, 0, 0, 0);
        };
        const from = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
        const to = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;

        const relevantCashRecords = cashRecords.filter(c => {
          const rDate = parseDateLocal(c.date);
          if (!rDate || isNaN(rDate)) return true; // Include if date is invalid, or handle as error
          if (from && rDate < from) return false;
          if (to && rDate > to) return false;
          return true;
        });

        const totalIncome = relevantCashRecords.filter(c => c.type === 'income').reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
        const totalExpenses = relevantCashRecords.filter(c => c.type === 'expense').reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

        profitVal = subtotal + totalIncome - totalExpenses;
      } else {
        filteredRecords.forEach((item) => {
          subtotal += Number(item.subtotal) || 0;
          gstTotal += Number(item.totalGst) || 0;
          grandTotal += Number(item.totalAmount) || 0;

          // Profit calculation for each sale
          item.products.forEach((p) => {
            const productDetails = productMap[p.sku || p.id];
            if (productDetails) {
              const purchasePriceRaw = Number(productDetails.purchasePrice) || 0;
              if (purchasePriceRaw > 0) {
                // Determine cost of goods sold (COGS) for the item, pre-tax.
                const purchaseGstRate = Number(productDetails.purchaseGST) || 0;
                let basePurchasePrice = purchasePriceRaw;
                if (isPurchaseTaxInclusive) {
                  basePurchasePrice = purchasePriceRaw / (1 + (purchaseGstRate / 100));
                }
                const costOfItem = basePurchasePrice * (Number(p.qty) || 1);

                // Determine revenue from the item, pre-tax.
                const salePriceRaw = Number(p.price) || 0;
                const itemGstRate = Number(p.gstRate) || 0;
                let saleValuePreTax = salePriceRaw * (Number(p.qty) || 1);
                if (isSalesTaxInclusive) {
                  saleValuePreTax = saleValuePreTax / (1 + itemGstRate / 100);
                }

                profitVal += (saleValuePreTax - costOfItem);
              }
            }
          });
        });
      }
    } else if (activeTab === "buy") {
     
        filteredRecords.forEach((item) => {
          subtotal += Number(item.purchasePrice) || 0;
          gstTotal += Number(item.purchaseGstAmount) || 0;
          grandTotal += Number(item.purchaseTotalAmount) || 0;
        });
     
    } else if (activeTab === "suppliers" && isAcademyIndustry) {
      grandTotal = filteredRecords.reduce(
        (acc, s) => acc + (Number(s.paymentMode) || 0),
        0
      );
      subtotal = grandTotal;
    }
    return { subtotal, gstTotal, grandTotal, profit: profitVal };
  }, [filteredRecords, activeTab, inventoryFilter, productMap, productMapById, currentUser, isAcademyIndustry, suppliers, cashRecords, fromDate, toDate]);

  const handleExport = () => {
    if (!currentUser) return;
    const username = currentUser.email || "N/A";
    const reportDate = new Date().toLocaleDateString("en-IN");
    const systemDate = new Date().toLocaleString("en-IN");
    let data = [];

    if (activeTab === "inventory") {
      data = filteredRecords.map((p, i) => ({
        SNO: i + 1,
        Product: p.productname,
        Quantity: p.productquantity,
        "Purchase Date": p.purchaseDate
          ? new Date(p.purchaseDate).toLocaleDateString()
          : "N/A",
        "Sales Date": p.salesDate
          ? new Date(p.salesDate).toLocaleDateString()
          : "N/A",
        Type: p.type,
        "Purchase Price": p.purchasePrice,
        "Purchase GST": p.purchaseGST,
        "Sales Price": p.salesPrice,
        "Sales GST": p.salesGST,
      }));
    } else if (activeTab === "credit") {
      data = filteredRecords.map((c, i) => ({
        SNO: i + 1,
        "Customer ID": c.customerId,
        "Customer Name": c.customerName,
        Phone: c.phone,
        Email: c.email,
        Address: c.address,
        Product: c.description,
        Quantity: c.quantity,
        Price: c.price,
        GST: c.gst,
        Total: c.total,
        Credit: c.credit,
        Balance: c.balance,
        Due: c.due,
        "Due Sessions": c.dueSession,
      }));
    } else if (activeTab === "cashbook") {
      data = filteredRecords.map((c, i) => ({
        SNO: i + 1,
        Date: c.date,
        Description: c.description,
        Type: c.type,
        Amount: c.amount,
        "Payment Mode": c.paymentMode,
        Note: c.category,
      }));
    } else if (activeTab === "gst") {
      data = filteredRecords.map((g, i) => ({
        SNO: i + 1,
        "Invoice No": g.invoiceNo,
        "Invoice Date": g.invoiceDate,
        Buyer: g.buyerDetails?.name || "",
        Seller: g.sellerDetails?.name || "",
        "Grand Total": g.grandTotal,
        Status: g.status,
      }));
    } else if (activeTab === "sales") {
      data = filteredRecords.map((b, i) => ({
        SNO: i + 1,
        "Bill No": b.receiptNo,
        Date: b.date,
        Customer: b.BillingcustomerName,
        Products: b.products
          .map((p) => `${p.name} (${p.qty})`)
          .join(", "),
        "Sub Total": b.subtotal,
        "Total Amount": b.totalAmount,
        "Total GST": b.totalGst,
      }));
    } else if (activeTab === "customers") {
      data = filteredRecords.map((c, i) => ({
        SNO: i + 1,
        "Customer Name": c.name,
        Phone: c.phone,
        Location: c.location,
        GSTIN: c.gstin || "N/A",
        "Loyalty Points": c.loyaltyPoints || 0,
        "Wallet Balance": c.walletBalance || 0,
      }));
    } else if (activeTab === "buy") {
      data = filteredRecords.map((p, i) => ({
        SNO: i + 1,
        Supplier: p.supplier,
        Category: p.type,
        Brand: p.brand,
        Model: p.model,
        "Purchase Price": p.purchasePrice,
        "Purchase GST %": p.purchaseGST,
        "Purchase GST Amount": p.purchaseGstAmount,
        "Purchase Total Amount": p.purchaseTotalAmount,
        "Payment Method": p.paymentMethod,
        "Is Credit": p.isCredit,
        Location: p.purchaseLocation,
      }));
    }

    const ws = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(
      ws,
      [
        [`Username: ${username}`],
        [`Report Date: ${reportDate}`],
        [`System Date: ${systemDate}`],
        [""],
      ],
      { origin: "A1" }
    );
    XLSX.utils.sheet_add_json(ws, data, { origin: -1, skipHeader: false });

    if (["inventory", "credit", "sales"].includes(activeTab)) {
      XLSX.utils.sheet_add_aoa(
        ws,
        [
          [""],
          ["Subtotal", totals.subtotal],
          ["GST Payment", totals.gstTotal],
          ["Grand Total", totals.grandTotal],
          ["Profit", totals.profit],
        ],
        { origin: -1 }
      );
    } else if (activeTab === "buy") {
      XLSX.utils.sheet_add_aoa(
        ws,
        [
          [""],
          ["Subtotal (Purchase)", totals.subtotal],
          ["GST Payment (Purchase)", totals.gstTotal],
          ["Grand Total (Purchase)", totals.grandTotal],
        ],
        { origin: -1 }
      );
    } else {
      XLSX.utils.sheet_add_aoa(ws, [[""], ["Total", totals.grandTotal]], {
        origin: -1,
      });
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Records");
    XLSX.writeFile(wb, `${activeTab}_records.xlsx`);
  };

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case "inventory":
        return "Search products...";
      case "gst":
        return "Search invoice, buyer, seller...";
      case "sales":
        return "Search customer, bill, product...";
      case "credit":
        return "Search customer name...";
      case "cashbook":
        return "Search description...";
      case "customers":
        return "Search name, phone, location...";
      default:
        return "Search...";
    }
  };

  const SummaryCard = ({ icon: Icon, label, value, color, sub }) => (
    <div className="bg-white rounded-2xl border border-green-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} transition-transform group-hover:scale-110`}
        >
          <Icon className="w-5 h-5" />
        </div>
        {sub && (
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${sub >= 0
              ? "bg-green-50 text-green-600"
              : "bg-red-50 text-red-600"
              }`}
          >
            {sub >= 0 ? (
              <ArrowUpRight className="w-3 h-3 inline mr-0.5" />
            ) : (
              <ArrowDownRight className="w-3 h-3 inline mr-0.5" />
            )}
            {Math.abs(sub).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-xl font-bold text-gray-800">₹{value.toFixed(2)}</p>
    </div>
  );

  const renderTableHeaders = () => {
    const thClass =
      "py-4 px-5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider";
    switch (activeTab) {
      case "inventory":
       
          return (
            <tr>
              <th className={thClass}>#</th>
              <th className={thClass}>Product</th>
              <th className={thClass}>SKU</th>
              <th className={thClass}>Category</th>
              <th className={thClass}>Subtotal</th>
              <th className={thClass}>GST</th>
              <th className={thClass}>Total</th>
            </tr>
          );
       
      case "credit":
       
        return (
          <tr>
            <th className={thClass}>#</th>
            <th className={thClass}>Customer ID</th>
            <th className={thClass}>Name</th>
            <th className={thClass}>Phone</th>
            <th className={thClass}>Email</th>
            <th className={thClass}>Address</th>
            <th className={thClass}>Product</th>
            <th className={thClass}>Qty</th>
            <th className={thClass}>Price</th>
            <th className={thClass}>GST</th>
            <th className={thClass}>Total</th>
            <th className={thClass}>Credit</th>
            <th className={thClass}>Balance</th>
            <th className={thClass}>Due</th>
            <th className={thClass}>Sessions</th>
            <th className={thClass}>Action</th>
          </tr>
        );
      case "cashbook":
        return (
          <tr>
            <th className={thClass}>#</th>
            <th className={thClass}>Date</th>
            <th className={thClass}>Description</th>
            <th className={thClass}>Type</th>
            <th className={thClass}>Amount</th>
            <th className={thClass}>Payment Mode</th>
            <th className={thClass}>Note</th>
          </tr>
        );
      case "gst":
       
        return (
          <tr>
            <th className={thClass}>#</th>
            <th className={thClass}>Invoice No</th>
            <th className={thClass}>Date</th>
            {gstFilter === "all" && (
              <>
                <th className={thClass}>Buyer</th>
                <th className={thClass}>Seller</th>
              </>
            )}
            {gstFilter === "buyer" && (
              <>
                <th className={thClass}>Buyer</th>
                <th className={thClass}>Address</th>
              </>
            )}
            {gstFilter === "seller" && (
              <>
                <th className={thClass}>Seller</th>
                <th className={thClass}>Phone</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>Address</th>
              </>
            )}
            <th className={thClass}>Total</th>
            <th className={thClass}>Status</th>
          </tr>
        );
      case "sales":
       
        return (
          <tr>
            <th className={thClass}>#</th>
            <th className={thClass}>Bill No</th>
            <th className={thClass}>Date</th>
            
            <th className={thClass}>Clients</th>
            <th className={thClass}>Subtotal</th>
            <th className={thClass}>Total</th>
            <th className={thClass}>GST</th>
          </tr>
        );
      case "customers":
       
          return (
            <tr>
              <th className={thClass}>#</th>
              <th className={thClass}>Client Name</th>
              <th className={thClass}>Project</th>
              <th className={thClass}>Contact</th>
              <th className={thClass}>Project Type</th>
              <th className={thClass}>Budget</th>
              <th className={thClass}>Deadline</th>
            </tr>
          );
       
       
      case "suppliers":
       
          return (
            <tr>
              <th className={thClass}>#</th>
              <th className={thClass}>NAME</th>
              <th className={thClass}>COMPANY</th>
              <th className={thClass}>CODE</th>
              <th className={thClass}>MOBILE</th>
              <th className={thClass}>PAYMENT MODE</th>
              <th className={thClass}>ACTIONS</th>
            </tr>
          );
       
      case "buy":
       
          return (
            <tr>
              <th className={thClass}>#</th>
              <th className={thClass}>Trainer</th>
              <th className={thClass}>Service</th>
              <th className={thClass}>Code</th>
              <th className={thClass}>Category</th>
              <th className={thClass}>Duration</th>
              <th className={thClass}>Cost</th>
              <th className={thClass}>Total Cost</th>
            </tr>
          );
       
      default:
        return null;
    }
  };

  const renderTableRows = () => {
    const tdClass = "px-5 py-4 text-sm text-gray-700 whitespace-nowrap";
    if (filteredRecords.length === 0) {
      return (
        <tr>
          <td
            colSpan="20"
            className="text-center py-16 text-gray-400"
          >
            <div className="flex flex-col items-center gap-3">
              <Database className="w-12 h-12 text-gray-300" />
              <p className="text-lg font-medium">No records found</p>
              <p className="text-sm">
                Try adjusting your search or filters
              </p>
            </div>
          </td>
        </tr>
      );
    }

    switch (activeTab) {
      case "inventory":
        const isSalesTaxInclusive = currentUser?.Tenant?.sales_tax_type === 'inclusive';
       
        return filteredRecords.map((p, i) => {
          if (isMobileIndustry) {
            const price = Number(p.salesPrice) || 0;
            const qty = Number(p.productquantity) || 0;
            const gstRate = Number(p.salesGST) || 0;

            let itemSubtotal = 0;
            let itemGst = 0;
            let itemGrandTotal = 0;

            if (isSalesTaxInclusive) {
              itemGrandTotal = price * qty;
              itemGst = itemGrandTotal - (itemGrandTotal / (1 + gstRate / 100));
              itemSubtotal = itemGrandTotal - itemGst;
            } else { // Exclusive logic
              itemSubtotal = price * qty;
              itemGst = (itemSubtotal * gstRate) / 100;
              itemGrandTotal = itemSubtotal + itemGst;
            }
            return (
              <tr
                key={p.id}
                className="hover:bg-green-50/50 transition-colors border-b border-gray-50"
              >
                <td className={tdClass}>
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                    {i + 1}
                  </span>
                </td>
                <td className={`${tdClass} font-semibold text-gray-900`}>
                  {p.brand}
                </td>
                <td className={tdClass}>{p.model}</td>
                <td className={`${tdClass} font-mono text-xs text-gray-500`}>
                  {p.imei1}
                </td>
                <td className={tdClass}>{p.color}</td>
                <td className={`${tdClass} font-medium text-green-700`}>
                  ₹{itemSubtotal.toFixed(2)}
                </td>
                <td className={`${tdClass} text-orange-600`}>
                  ₹{itemGst.toFixed(2)}
                </td>
                <td className={`${tdClass} font-bold text-gray-900`}>
                  ₹{itemGrandTotal.toFixed(2)}
                </td>
                <td className={tdClass}>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                    {p.productquantity}
                  </span>
                </td>
              </tr>
            );
          } else {
            const price = Number(p.salesPrice) || 0;
            const qty = Number(p.productquantity) || 0;
            const gstRate = Number(p.salesGST) || 0;

            let itemSubtotal = 0;
            let itemGst = 0;
            let itemGrandTotal = 0;

            if (isSalesTaxInclusive) {
              itemGrandTotal = price * qty;
              itemGst = itemGrandTotal - (itemGrandTotal / (1 + gstRate / 100));
              itemSubtotal = itemGrandTotal - itemGst;
            } else { // Exclusive logic
              itemSubtotal = price * qty;
              itemGst = (itemSubtotal * gstRate) / 100;
              itemGrandTotal = itemSubtotal + itemGst;
            }
            return (
              <tr
                key={p.id}
                className="hover:bg-green-50/50 transition-colors border-b border-gray-50"
              >
                <td className={tdClass}>
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                    {i + 1}
                  </span>
                </td>
                <td className={`${tdClass} font-semibold text-gray-900`}>
                  {p.productname}
                </td>
                <td className={`${tdClass} font-mono text-xs text-gray-500`}>
                  {p.sku}
                </td>
                <td className={tdClass}>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                    {p.type}
                  </span>
                </td>
                <td className={`${tdClass} font-medium text-green-700`}>
                  ₹{itemSubtotal.toFixed(2)}
                </td>
                <td className={`${tdClass} text-orange-600`}>
                  ₹{itemGst.toFixed(2)}
                </td>
                <td className={`${tdClass} font-bold text-gray-900`}>
                  ₹{itemGrandTotal.toFixed(2)}
                </td>
              </tr>
            );
          }
        });

      case "credit":
       
        return filteredRecords.map((c, i) => (
          <tr
            key={c.customerId + i}
            className="hover:bg-green-50/50 transition-colors border-b border-gray-50"
          >
            <td className={tdClass}>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                {i + 1}
              </span>
            </td>
            <td className={`${tdClass} font-mono text-xs`}>
              {c.customerId}
            </td>
            <td className={`${tdClass} font-semibold text-gray-900`}>
              {c.name}
            </td>
            <td className={tdClass}>{c.phone}</td>
            <td className={tdClass}>{c.email}</td> 
                <td className={tdClass}>{c.address}</td> 
            <td className={tdClass}>{c.description}</td>
             <td className={tdClass}>{c.quantity}</td> 
            <td className={tdClass}>₹{c.price.toFixed(2)}</td> 
            <td className={tdClass}>
              <span className="text-orange-600">{c.gst}%</span>
            </td>
            <td className={`${tdClass} font-semibold`}>
              ₹{c.total.toFixed(2)}
            </td>
            <td className={`${tdClass} text-green-600`}>
              ₹{c.credit.toFixed(2)}
            </td>
            <td className={`${tdClass} font-bold text-red-600`}>₹{c.balance.toFixed(2)}</td>
           <td
              className={`${tdClass} ${c.due > 0 ? "text-red-600 font-semibold" : "text-gray-500"
                }`}
            >
              ₹{c.due.toFixed(2)}
            </td> 
          <td className={tdClass}>{c.dueSession}</td> 
            <td className={tdClass}>
              {c.balance > 0 ? (
                <button
                  onClick={() => handlePayCredit(c)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold shadow-sm"
                >
                  Pay Now
                </button>
              ) :<button onClick={() => handleOpenPrintModal(c)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-900 transition-colors text-xs font-semibold shadow-sm flex items-center gap-1">
                                <Printer size={12} /> Print
                              </button>}
            </td>
          </tr>
        ));

      case "cashbook":
        return filteredRecords.map((c, i) => (
          <tr
            key={c.id}
            className="hover:bg-green-50/50 transition-colors border-b border-gray-50"
          >
            <td className={tdClass}>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                {i + 1}
              </span>
            </td>
            <td className={tdClass}>{c.date}</td>
            <td className={`${tdClass} font-medium`}>{c.description}</td>
            <td className={tdClass}>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${c.type === "income"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
                  }`}
              >
                {c.type === "income" ? (
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                )}
                {c.type}
              </span>
            </td>
            <td
              className={`${tdClass} font-semibold ${c.type === "income" ? "text-green-600" : "text-red-600"
                }`}
            >
              ₹{c.amount.toFixed(2)}
            </td>
            <td className={tdClass}>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                {c.paymentMode}
              </span>
            </td>
            <td className={`${tdClass} text-gray-500`}>{c.category}</td>
          </tr>
        ));

      case "gst":
       
        return filteredRecords.map((g, i) => (
          <tr
            key={g.id}
            className="hover:bg-green-50/50 transition-colors border-b border-gray-50"
          >
            <td className={tdClass}>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                {i + 1}
              </span>
            </td>
            <td className={`${tdClass} font-mono font-semibold`}>
              {g.invoiceNo}
            </td>
            <td className={tdClass}>{g.invoiceDate}</td>
            {gstFilter === "all" && (
              <>
                <td className={tdClass}>{g.buyerDetails?.name}</td>
                <td className={tdClass}>{g.sellerDetails?.name}</td>
              </>
            )}
            {gstFilter === "buyer" && (
              <>
                <td className={`${tdClass} font-medium`}>
                  {g.buyerDetails?.name}
                </td>
                <td className={tdClass}>{g.buyerDetails?.address}</td>
              </>
            )}
            {gstFilter === "seller" && (
              <>
                <td className={`${tdClass} font-medium`}>
                  {g.sellerDetails?.name}
                </td>
                <td className={tdClass}>{g.sellerDetails?.phone}</td>
                <td className={tdClass}>{g.sellerDetails?.email}</td>
                <td className={tdClass}>{g.sellerDetails?.address}</td>
              </>
            )}
            <td className={`${tdClass} font-semibold text-green-700`}>
              ₹{Number(g.grandTotal).toFixed(2)}
            </td>
            <td className={tdClass}>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${g.status === "paid"
                  ? "bg-green-50 text-green-700"
                  : g.status === "pending"
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-600"
                  }`}
              >
                {g.status}
              </span>
            </td>
          </tr>
        ));

      case "sales":
       
        return filteredRecords.map((b, i) => (
          <tr
            key={b.id}
            className="hover:bg-green-50/50 transition-colors border-b border-gray-50"
          >
            <td className={tdClass}>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                {i + 1}
              </span>
            </td>
            <td className={`${tdClass} font-mono font-semibold`}>
              {b.receiptNo}
            </td>
            <td className={tdClass}>{b.date}</td>
            
            <td className={`${tdClass} whitespace-normal min-w-[200px]`}>
              <div className="flex flex-wrap gap-1">
                {b.products.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium"
                  >
                    {p.name}
                    <span className="ml-1 text-green-500">×{p.qty}</span>
                  </span>
                ))}
              </div>
            </td>
            <td className={tdClass}>₹{b.subtotal.toFixed(2)}</td>
            <td className={`${tdClass} font-semibold text-green-700`}>
              ₹{b.totalAmount.toFixed(2)}
            </td>
            <td className={`${tdClass} text-orange-600`}>
              ₹{b.totalGst.toFixed(2)}
            </td>
          </tr>
        ));

      case "customers":

          return filteredRecords.map((c, i) => (
            <tr key={c.id} className="hover:bg-green-50/50 transition-colors border-b border-gray-50">
              <td className={tdClass}>
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                  {i + 1}
                </span>
              </td>
              <td className={`${tdClass} font-semibold text-gray-900`}>
                <div className="flex flex-col">
                  <span>{c.name}</span>
                  <span className="text-xs text-gray-500">{c.contactPerson}</span>
                </div>
              </td>
              <td className={tdClass}>{c.projectName || '—'}</td>
              <td className={tdClass}>
                <div className="flex flex-col">
                  <span>{c.email || '—'}</span>
                  <span className="text-xs text-gray-500">{c.phone || '—'}</span>
                </div>
              </td>
              <td className={tdClass}>
                {c.projectType ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                    {c.projectType}
                  </span>
                ) : '—'}
              </td>
              <td className={tdClass}>{c.budget || '—'}</td>
              <td className={tdClass}>{c.deadline ? new Date(c.deadline).toLocaleDateString('en-IN') : '—'}</td>
            </tr>
          ));
       
       

      case "suppliers":
        const iconBtnClass = "p-2 rounded-lg transition-colors";
        return filteredRecords.map((s, i) => (
          <tr
            key={s.id}
            className="hover:bg-green-50/50 transition-colors border-b border-gray-50"
          >
            <td className={tdClass}>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                {i + 1}
              </span>
            </td>
            <td className={`${tdClass} font-semibold text-gray-900`}>
              {s.name}
            </td>
            <td className={tdClass}>{s.company || "—"}</td>
            <td className={`${tdClass} font-mono text-xs text-gray-500`}>
              {s.code || "—"}
            </td>
            <td className={tdClass}>{s.mobile || "—"}</td>
            {isAcademyIndustry ? (
              <td className={`${tdClass} font-semibold text-green-700`}>
                ₹{Number(s.paymentMode || 0).toLocaleString('en-IN')}
              </td>
            ) : (
              <td className={tdClass}>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                  {s.paymentMode}
                </span>
              </td>
            )}
            <td className={tdClass}>
              <div className="flex items-center gap-2">
                <button
                  title="View"
                  onClick={() => setViewSupplier(s)}
                  className={`${iconBtnClass} text-gray-500 hover:bg-gray-100`}
                >
                  <Search size={16} />
                </button>
                <button
                  title="Edit"
                  onClick={() => handleEditSupplier(s)}
                  className={`${iconBtnClass} text-green-600 hover:bg-green-50`}
                >
                  <FileText size={16} />
                </button>
                <button
                  title="Delete"
                  onClick={() => handleDeleteSupplier(s.id)}
                  className={`${iconBtnClass} text-red-600 hover:bg-red-50`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        ));

      case "buy":
       
        return filteredRecords.map((p, i) => {
          return (
              <tr
                key={p.id}
                className="hover:bg-green-50/50 transition-colors border-b border-gray-50"
              >
                <td className={tdClass}>
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                    {i + 1}
                  </span>
                </td>
                <td className={`${tdClass} font-semibold text-gray-900`}>
                  {p.supplier}
                </td>
                <td className={`${tdClass} font-medium text-gray-900`}>
                  {p.productname}
                </td>
                <td className={`${tdClass} font-mono text-xs text-gray-500`}>
                  {p.sku}
                </td>
                <td className={tdClass}>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase">
                    {p.type}
                  </span>
                </td>
                <td className={`${tdClass} font-medium text-green-700`}>
                  ₹{p.purchasePrice.toFixed(2)}
                </td>
                <td className={`${tdClass} text-orange-600`}>
                  ₹{p.purchaseGstAmount.toFixed(2)}
                </td>
                <td className={`${tdClass} font-bold text-gray-900`}>
                  ₹{p.purchaseTotalAmount.toFixed(2)}
                </td>
              </tr>
            );
        })
         
           
         

      default:
        return null;
    }
  };

  return (
    <BillingLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50/30 via-white to-green-50/20 -m-4 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Records
              </h1>
              <p className="mt-1 text-gray-500 font-medium">
                Track and manage all your business data in one place
              </p>
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl shadow-lg shadow-green-200 hover:shadow-xl hover:shadow-green-300 hover:from-green-700 hover:to-green-800 transition-all duration-300 font-semibold text-sm"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap justify-around gap-2 p-1.5 bg-white rounded-2xl border border-green-100 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${isActive
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md shadow-green-200"
                    : "text-gray-600 hover:text-green-700 hover:bg-green-50"
                    }`}
                >
                  <Icon className="w-4 h-4 " />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Cards */}
        {(activeTab === "inventory" ||
          activeTab === "buy" ||
          activeTab === "credit" ||
          activeTab === "sales") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                icon={DollarSign}
                label={activeTab === "buy" ? "Purchase Subtotal" : "Subtotal"}
                value={totals.subtotal}
                color="bg-green-50 text-green-600"
              />
              <SummaryCard
                icon={Receipt}
                label={activeTab === "buy" ? "Purchase GST" : "GST Payment"}
                value={totals.gstTotal}
                color="bg-orange-50 text-orange-600"
              />
              <SummaryCard
                icon={BarChart3}
                label={activeTab === "buy" ? "Total Procurement" : "Grand Total"}
                value={totals.grandTotal}
                color="bg-green-50 text-green-600"
              />
              {activeTab !== "buy" ? (
                <SummaryCard
                  icon={TrendingUp}
                  label="Profit"
                  value={totals.profit}
                  color="bg-green-50 text-green-600"
                />
              ) : (
                <div className="bg-white rounded-2xl border border-green-100 p-5 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Procurement Items
                  </p>
                  <p className="text-xl font-bold text-gray-800">{filteredRecords.length}</p>
                </div>
              )}
            </div>
          )}

        {(activeTab === "cashbook" || activeTab === "gst") && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <SummaryCard
              icon={BarChart3}
              label="Total"
              value={totals.grandTotal}
              color="bg-green-50 text-green-600"
            />
            <SummaryCard
              icon={Database}
              label="Records"
              value={filteredRecords.length}
              color="bg-green-50 text-green-600"
            />
            <div className="bg-white rounded-2xl border border-green-100 p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Active Tab
              </p>
              <p className="text-xl font-bold text-gray-800 capitalize">
                {activeTab}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {filteredRecords.length} records displayed
              </p>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={getSearchPlaceholder()}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-all"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${showFilters
                ? "bg-green-50 border-green-300 text-green-700"
                : "bg-gray-50 border-green-200 text-gray-600 hover:bg-green-50"
                }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""
                  }`}
              />
            </button>

            {activeTab === "suppliers" && (
              <button
                onClick={() => {
                  setEditingSupplierId(null);
                  setSupplierFormData({
                    name: "",
                    company: "",
                    code: "",
                    gst: "",
                    pan: "",
                    mobile: "",
                    email: "",
                    address: "",
                    paymentMode: isAcademyIndustry ? "" : "Cash",
                  });
                  setIsSupplierModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl shadow-lg shadow-green-100 hover:shadow-xl hover:bg-green-700 transition-all font-semibold text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                {isAcademyIndustry ? "Add Trainer" : "Add Supplier"}
              </button>
            )}
          </div>
        </div>

        {/* Expanded Filters */}
        <div
          className={`overflow-hidden transition-all duration-300 ${showFilters ? "max-h-40 mt-4 opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          <div className="flex flex-wrap gap-3 pt-4 border-t border-green-100">
            <div className="flex items-center gap-2 mr-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
                placeholder="From"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
                placeholder="To"
              />
            </div>

            {activeTab === "inventory" && (
              <select
                value={inventoryFilter}
                onChange={(e) => setInventoryFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-green-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-400 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">All Items</option>
                <option value="purchase">Purchase Only</option>
                <option value="sales">Sales Only</option>
              </select>
            )}

            {["inventory", "buy"].includes(activeTab) && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-green-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-400 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="Mobile">Mobile</option>
                <option value="Bluetooth">Bluetooth</option>
                <option value="Charger">Charger</option>
                <option value="Headset">Headset</option>
                <option value="Cable">Cable</option>
                <option value="Adapter">Adapter</option>
              </select>
            )}

            {activeTab === "gst" && (
              <select
                value={gstFilter}
                onChange={(e) => setGstFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-green-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-400 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">All</option>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
              </select>
            )}

            {activeTab === "credit" && (isAcademyIndustry || isMobileIndustry) && (
              <select
                value={feeFilter}
                onChange={(e) => setFeeFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-green-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-400 focus:outline-none appearance-none cursor-pointer ml-2"
              >
                <option value="all">{isAcademyIndustry ? "All Students" : "All Customers"}</option>
                <option value="pending">{isAcademyIndustry ? "Pending Fees" : "Pending Dues"}</option>
                <option value="closed">{isAcademyIndustry ? "Paid" : "Cleared"}</option>
              </select>
            )}

            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
              >
                Clear dates
              </button>
            )}
          </div>
        </div>


        {/* Record Count Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-sm font-semibold border border-green-200">
              {filteredRecords.length} records
            </span>
            {searchTerm && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                Searching: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm("")}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-10 h-10 animate-spin text-green-500 mb-4" />
              <p className="text-lg font-medium text-gray-500">
                Loading records...
              </p>
              <p className="text-sm text-gray-400">
                Please wait while we fetch your data
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-100">
                  {renderTableHeaders()}
                </thead>
                <tbody>{renderTableRows()}</tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom Summary Bar */}
        {!loading && filteredRecords.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-green-100 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-gray-500 font-medium">
                Showing {filteredRecords.length} of{" "}
                {activeTab === "inventory"
                  ? records.length
                  : activeTab === "credit"
                    ? creditRecords.length
                    : activeTab === "cashbook"
                      ? cashRecords.length
                      : activeTab === "gst"
                        ? gstRecords.length
                        : activeTab === "sales"
                          ? billingRecords.length
                          : billingCustomers.length}{" "}
                total records
              </p>
              <div className="flex flex-wrap gap-4">
                {(activeTab === "inventory" ||
                  activeTab === "credit" ||
                  activeTab === "sales") && (
                    <>
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl">
                        <span className="text-xs font-semibold text-green-600 uppercase">
                          Subtotal
                        </span>
                        <span className="text-sm font-bold text-green-700">
                          ₹{totals.subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-xl">
                        <span className="text-xs font-semibold text-orange-600 uppercase">
                          GST
                        </span>
                        <span className="text-sm font-bold text-orange-700">
                          ₹{totals.gstTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl">
                        <span className="text-xs font-semibold text-green-600 uppercase">
                          Grand Total
                        </span>
                        <span className="text-sm font-bold text-green-700">
                          ₹{totals.grandTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-xl">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-semibold text-green-600 uppercase">
                          Profit
                        </span>
                        <span className="text-sm font-bold text-green-700">
                          ₹{totals.profit.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                {(activeTab === "cashbook" ||
                  activeTab === "gst" ||
                  (activeTab === "suppliers" && isAcademyIndustry)) && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl">
                      <span className="text-xs font-semibold text-green-600 uppercase">
                        {activeTab === "suppliers" && isAcademyIndustry
                          ? "Total Salaries"
                          : "Total"}
                      </span>
                      <span className="text-sm font-bold text-green-700">
                        ₹{totals.grandTotal.toFixed(2)}
                      </span>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* View Supplier Modal */}
        {viewSupplier && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
              <button
                onClick={() => setViewSupplier(null)}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
              >
                <X size={24} />
              </button>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 border-b border-green-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-green-600 border border-green-100">
                    <Users size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{viewSupplier.name}</h2>
                    <p className="text-green-700 font-medium">{viewSupplier.company || "No Company Specified"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/80 text-green-800 text-[10px] font-bold uppercase tracking-wider border border-green-100">
                    Code: {viewSupplier.code || "N/A"}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/80 text-green-800 text-[10px] font-bold uppercase tracking-wider border border-green-100">
                    {viewSupplier.paymentMode}
                  </span>
                </div>
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mobile Number</p>
                    <p className="text-gray-700 font-medium flex items-center gap-2">
                      <Phone size={14} className="text-green-500" />
                      {viewSupplier.mobile || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</p>
                    <p className="text-gray-700 font-medium flex items-center gap-2">
                      <Mail size={14} className="text-green-500" />
                      {viewSupplier.email || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">GST Number</p>
                    <p className="text-gray-700 font-mono font-medium">{viewSupplier.gst || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">PAN Number</p>
                    <p className="text-gray-700 font-mono font-medium">{viewSupplier.pan || "—"}</p>
                  </div>
                </div>

                <div className="space-y-1 border-t border-gray-50 pt-6">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={14} className="text-green-500" />
                    Billing Address
                  </p>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 italic">
                    {viewSupplier.address || "No address provided."}
                  </p>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setViewSupplier(null)}
                  className="px-8 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all text-sm uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Supplier Modal */}
        {isSupplierModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50 overflow-y-auto custom-scrollbar">
            <div className="bg-white rounded-3xl w-full max-w-2xl p-8 animate-fade-in relative my-8 shadow-2xl">
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100 shadow-sm">
                  {editingSupplierId ? <FileText size={28} /> : <PlusCircle size={28} />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingSupplierId
                      ? isAcademyIndustry ? "Edit Trainer" : "Edit Supplier"
                      : isAcademyIndustry ? "Add New Trainer" : "Add New Supplier"}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {isAcademyIndustry ? "Fill in the details below to save the trainer" : "Fill in the details below to save the supplier"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveSupplier} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-green-800 uppercase tracking-widest">
                    <Briefcase size={14} className="text-green-500" />
                    {isAcademyIndustry ? "Trainer Name" : "Supplier Name"}
                    <span className="text-red-400 text-xs">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierFormData.name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                    className="px-4 py-3.5 rounded-2xl border border-green-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-gray-900"
                    placeholder={isAcademyIndustry ? "Enter trainer name" : "Enter supplier name"}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-green-800 uppercase tracking-widest">
                    <Building2 size={14} className="text-green-500" />
                    {isAcademyIndustry ? "Specialization" : "Company Name"}
                  </label>
                  <input
                    type="text"
                    value={supplierFormData.company}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, company: e.target.value })}
                    className="px-4 py-3.5 rounded-2xl border border-green-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-gray-900"
                    placeholder={isAcademyIndustry ? "e.g. fullstack, java" : "Enter company name"}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-green-800 uppercase tracking-widest">
                    <Hash size={14} className="text-green-500" />
                    {isAcademyIndustry ? "Trainer Code" : "Supplier Code"}
                  </label>
                  <input
                    type="text"
                    value={supplierFormData.code}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, code: e.target.value })}
                    className="px-4 py-3.5 rounded-2xl border border-green-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-gray-900"
                    placeholder={isAcademyIndustry ? "e.g. TRN001" : "e.g. SUP001"}
                  />
                </div>

                {!isAcademyIndustry && (
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-green-800 uppercase tracking-widest">
                      <DollarSign size={14} className="text-green-500" />
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={supplierFormData.gst}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, gst: e.target.value.toUpperCase() })}
                      className="px-4 py-3.5 rounded-2xl border border-green-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-mono font-medium text-gray-900 uppercase"
                      placeholder="22AAAAA0000A1Z5"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-green-800 uppercase tracking-widest">
                    <DollarSign size={14} className="text-green-500" />
                    PAN Number
                  </label>
                  <input
                    type="text"
                    value={supplierFormData.pan}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, pan: e.target.value.toUpperCase() })}
                    className="px-4 py-3.5 rounded-2xl border border-green-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-mono font-medium text-gray-900 uppercase"
                    placeholder="ABCDE1234F"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-green-800 uppercase tracking-widest">
                    <Phone size={14} className="text-green-500" />
                    Mobile Number
                  </label>
                  <input
                    type="number"
                    value={supplierFormData.mobile}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 10);
                      setSupplierFormData({ ...supplierFormData, mobile: val });
                    }}
                    className="px-4 py-3.5 rounded-2xl border border-green-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-gray-900"
                    placeholder="10 digit mobile"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-green-800 uppercase tracking-widest">
                    <Mail size={14} className="text-green-500" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={supplierFormData.email}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                    className="px-4 py-3.5 rounded-2xl border border-green-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-gray-900"
                    placeholder="supplier@email.com"
                  />
                </div>

                {isAcademyIndustry ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-green-800 uppercase tracking-widest">
                      <DollarSign size={14} className="text-green-500" />
                      Trainer Salary (₹)
                    </label>
                    <input
                      type="number"
                      value={supplierFormData.paymentMode}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, paymentMode: e.target.value })}
                      className="px-4 py-3.5 rounded-2xl border border-green-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-gray-900"
                      placeholder="Enter monthly salary"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-green-800 uppercase tracking-widest">
                      <CreditCard size={14} className="text-green-500" />
                      Payment Mode
                    </label>
                    <select value={supplierFormData.paymentMode} onChange={(e) => setSupplierFormData({ ...supplierFormData, paymentMode: e.target.value })} className="px-4 py-[15px] rounded-2xl border border-green-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all font-medium text-gray-900 cursor-pointer" >
                      <option value="Cash">Cash</option> <option value="UPI">UPI</option> <option value="Card">Card</option> <option value="Net Banking">Net Banking</option> <option value="Credit">Credit</option>
                    </select>
                  </div>
                )}

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-green-800 uppercase tracking-widest">
                    <MapPin size={14} className="text-green-500" />
                    Billing Address
                  </label>
                  <textarea
                    rows="2"
                    value={supplierFormData.address}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                    className="px-4 py-3.5 rounded-2xl border border-green-50 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all resize-none font-medium text-gray-900"
                    placeholder="Enter full address..."
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3 md:col-span-2 pt-6 border-t border-gray-100 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsSupplierModalOpen(false)}
                    className="px-8 py-3 rounded-2xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all font-bold text-sm uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 rounded-2xl bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg shadow-green-100 font-bold text-sm uppercase tracking-wider"
                  >
                    {editingSupplierId
                      ? isAcademyIndustry ? "Update Trainer" : "Update Supplier"
                      : isAcademyIndustry ? "Save Trainer" : "Save Supplier"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isPrintModalOpen && recordToPrint && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-gray-800">
                          Payment Receipt
                      </h2>
                      <button
                          onClick={() => setIsPrintModalOpen(false)}
                          className="text-gray-500 hover:text-red-500"
                      >
                          <X size={24} />
                      </button>
                  </div>
                  <div className="flex-grow overflow-y-auto">
                      <div ref={printRef} className="p-4">
                          <div className="text-center mb-6">
                              <h2 className="text-lg font-bold">
                                  {currentUser.companyDetails?.name || "Company Name"}
                              </h2>
                              <p className="text-xs">
                                  {currentUser?.address?.street || "123 Sample Street"},{" "}
                                  {currentUser?.address?.city || "Sample City"},{" "}
                                  {currentUser?.address?.state || "ST"}{" "}
                                  {currentUser?.address?.pincode || "12345"}
                              </p>
                              <p className="text-xs">
                                  Phone: {currentUser?.phone || "(123) 456-7890"}
                              </p>
                              {currentUser?.gstin && (
                                  <p className="text-xs">GSTIN: {currentUser.gstin}</p>
                              )}
                          </div>

                          <div className="flex justify-between text-xs mb-2">
                              <span>Receipt #: RCPT-{recordToPrint.id.slice(-6)}</span>
                              <span>Date: {new Date().toLocaleDateString()}</span>
                             
                          </div>

                          <div className="text-xs mb-4">
                              <span>
                                  Cashier:{" "}
                                  {currentUser?.firstName?.charAt(0).toUpperCase() + currentUser?.firstName?.slice(1)|| currentUser?.email || "N/A"}
                              </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                              <p><strong>Name:</strong> {recordToPrint.name}</p>
                              <p><strong>Email:</strong> {recordToPrint.email}</p>
                              <p><strong>Phone:</strong> {recordToPrint.phone}</p>
                              <p><strong>Address:</strong> {recordToPrint.address}</p>
                              <p><strong>{isAcademyIndustry ? "Course" : "Product"}:</strong> {recordToPrint.description || "N/A"}</p>
                             {/*  <p><strong>Quantity:</strong> {recordToPrint.quantity}</p> */}
                              <p><strong>Total:</strong> {recordToPrint.total?.toFixed(2)}</p>
                              <p><strong>Paid:</strong> {recordToPrint.credit?.toFixed(2)}</p>
                              <p><strong>Balance:</strong> {recordToPrint.balance?.toFixed(2)}</p>
                              <p><strong>Due Sessions:</strong> {recordToPrint.dueSession}</p>
                          </div>

                          <table className="w-full border-collapse text-sm">
                              <thead className="bg-gray-100">
                                  <tr>
                                      <th className="p-2 border text-left">Session</th>
                                      <th className="p-2 border text-left">Date</th>
                                      <th className="p-2 border text-left">Due</th>
                                      <th className="p-2 border text-left">Paid</th>
                                      <th className="p-2 border text-left">Balance</th>
                                      <th className="p-2 border">Current Balance</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {(recordToPrint?.payments || []).map((p, index) => (
                                      <tr key={index}>
                                          <td className="p-2 border">{p.session}</td>
                                          <td className="p-2 border">
                                              {recordToPrint.date ? recordToPrint.date.slice(0, 10) : '-'}
                                          </td>
                                          <td className="p-2 border">{p.due?.toFixed(2)}</td>
                                          <td className="p-2 border">{p.paid?.toFixed(2)}</td>
                                          <td className="p-2 border">{p.balance?.toFixed(2)}</td>
                                          <td className="p-2 border">{p.currentBalance?.toFixed(2)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2 pt-4 border-t">
                      <button type="button" onClick={handlePrint } className="bg-green-500 text-white px-4 py-2 rounded-md">
                          Print
                      </button>
                      <button
                        onClick={() => setIsPrintModalOpen(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                      >
                        Close
                      </button>
                  </div>
              </div>
          </div>
        )}
      </div>
      {/* Hidden Print Area */}
      <div id="print-area" ref={printAreaRef} className="hidden"></div>
     
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }
        }
      `}</style>
    </BillingLayout >
  );
};

export default SDRecord;
