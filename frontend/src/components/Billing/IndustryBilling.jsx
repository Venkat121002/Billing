import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config/api";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Printer,
  CircleX,
  CheckCircle,
  CreditCard,
  Smartphone,
  Tag,
  Loader2,
  Download,
  X,
  User,
  MapPin,
  Phone,
  FileText,
  Receipt,
  IndianRupee,
  ScanBarcode,
  ArrowRight,
  Banknote,
  Wallet,
  TrendingUp,
  Hash,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import { useAuth } from "../../contexts/AuthContext";
import { resolveIndustryProfile } from "../../config/industryProfiles";
import _ from "lodash";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Fuse from "fuse.js";

// Complete literal Tailwind strings per named slot — Tailwind's JIT scanner
// only picks up classes it can see verbatim, so these must never be built
// from template-literal fragments. See IndustryGstBill.jsx / IndustryInventory.jsx
// for the same pattern. Card/UPI/Wallet payment-method colors and the "Due"/
// "Change" red banner stay fixed across themes — only the brand/cash accents
// (green vs pink) vary.
const THEMES = {
  green: {
    loadingBg: "bg-gradient-to-br from-emerald-50 to-teal-50",
    loadingIconBox: "bg-white shadow-xl shadow-emerald-100",
    loadingSpinner: "text-emerald-500",
    refreshBtn: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-100",
    pageBg: "bg-sky-50",
    headerBg: "bg-emerald-50 border-emerald-100",
    headerIconBg: "bg-emerald-500",
    headerTitle: "text-emerald-700",
    headerSubtitle: "text-emerald-600",
    inputRing: "focus:ring-emerald-400",
    barcodeIcon: "text-emerald-500",
    barcodeInputBg: "bg-emerald-50 border-emerald-300 focus:ring-emerald-400",
    categoryLabel: "text-emerald-700",
    categoryDot: "bg-emerald-500",
    productActiveRow: "bg-emerald-50/50 border-l-4 border-emerald-500 shadow-sm",
    productBarcodeText: "text-emerald-600",
    productPriceBadge: "text-emerald-700 bg-emerald-50",
    cartHeaderIconBg: "bg-emerald-100",
    cartHeaderIcon: "text-emerald-600",
    cartCountBadge: "bg-emerald-500",
    emptyCartIconBg: "bg-gradient-to-br from-emerald-50 to-teal-50",
    emptyCartIcon: "text-emerald-200",
    cartItemHover: "hover:bg-emerald-50/40 border-transparent hover:border-emerald-100",
    cartItemIndexBg: "bg-emerald-100/80 text-emerald-600",
    priceInputFocus: "focus:border-emerald-400",
    gstBadgeText: "text-emerald-500",
    qtyPlusHover: "hover:text-emerald-600 hover:bg-emerald-50",
    cartTotalText: "text-emerald-600",
    cashFlowIconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
    phoneIcon: "text-emerald-500",
    phoneInputBg: "bg-emerald-50/30 border-emerald-100 focus:ring-emerald-400 text-emerald-900",
    loyaltyBox: "bg-emerald-50 border-emerald-100",
    loyaltyPointsText: "text-emerald-800",
    loyaltyWalletText: "text-emerald-700",
    amountCard: "bg-gradient-to-br from-emerald-500 to-teal-500",
    amountLabel: "text-emerald-100",
    amountSubLabel: "text-emerald-200",
    discountIcon: "text-emerald-400",
    discountFocus: "focus:ring-emerald-400",
    paymentActiveCash: "bg-emerald-50 border-emerald-400 text-emerald-600",
    paymentActiveCashDot: "bg-emerald-500",
    paymentInactiveHover: "hover:border-gray-300 hover:bg-gray-50",
    cashInputBg: "bg-emerald-600 border-emerald-600 focus:ring-emerald-300/40 focus:border-emerald-300",
    completeSaleBtn: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200/50",
    modalHeaderBg: "bg-gradient-to-r from-emerald-500 to-teal-500",
    modalSubtext: "text-emerald-100",
    modalFieldIcon: "text-emerald-400",
    modalFieldFocus: "focus:ring-emerald-300 focus:border-emerald-300",
    modalContinueBtn: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md shadow-emerald-200/50",
    receiptHeaderBorder: "border-emerald-100",
    receiptIconBg: "bg-emerald-100",
    receiptIconColor: "text-emerald-600",
    formatBarBg: "bg-emerald-50/50 border-emerald-100",
    formatSelect: "border-emerald-200 focus:ring-emerald-300",
    receiptFooterBorder: "border-emerald-100",
    printBtn: "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
    finalizeBtn: "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md shadow-emerald-200/50",
  },
  pink: {
    loadingBg: "bg-[#f74faf]/5",
    loadingIconBox: "bg-white shadow-xl shadow-[#f74faf]/10",
    loadingSpinner: "text-[#f74faf]",
    refreshBtn: "bg-[#f74faf] text-white hover:opacity-90 shadow-lg shadow-[#f74faf]/10",
    pageBg: "bg-[#f74faf]/5",
    headerBg: "bg-[#f74faf]/10 border-[#f74faf]/20",
    headerIconBg: "bg-[#f74faf]",
    headerTitle: "text-[#f74faf]",
    headerSubtitle: "text-[#f74faf]/80",
    inputRing: "focus:ring-[#f74faf]",
    barcodeIcon: "text-[#f74faf]",
    barcodeInputBg: "bg-[#f74faf]/10 border-[#f74faf]/40 focus:ring-[#f74faf]",
    categoryLabel: "text-[#f74faf]",
    categoryDot: "bg-[#f74faf]",
    productActiveRow: "bg-[#f74faf]/10 border-l-4 border-[#f74faf] shadow-sm",
    productBarcodeText: "text-[#f74faf]",
    productPriceBadge: "text-[#f74faf] bg-[#f74faf]/10",
    cartHeaderIconBg: "bg-[#f74faf]/20",
    cartHeaderIcon: "text-[#f74faf]",
    cartCountBadge: "bg-[#f74faf]",
    emptyCartIconBg: "bg-[#f74faf]/10",
    emptyCartIcon: "text-[#f74faf]/40",
    cartItemHover: "hover:bg-[#f74faf]/5 border-transparent hover:border-[#f74faf]/20",
    cartItemIndexBg: "bg-[#f74faf]/20 text-[#f74faf]",
    priceInputFocus: "focus:border-[#f74faf]",
    gstBadgeText: "text-[#f74faf]",
    qtyPlusHover: "hover:text-[#f74faf] hover:bg-[#f74faf]/10",
    cartTotalText: "text-[#f74faf]",
    cashFlowIconBg: "bg-[#f74faf]",
    phoneIcon: "text-[#f74faf]",
    phoneInputBg: "bg-[#f74faf]/5 border-[#f74faf]/20 focus:ring-[#f74faf] text-[#f74faf]",
    loyaltyBox: "bg-[#f74faf]/10 border-[#f74faf]/20",
    loyaltyPointsText: "text-[#f74faf]",
    loyaltyWalletText: "text-[#f74faf]/90",
    amountCard: "bg-[#f74faf]",
    amountLabel: "text-white/80",
    amountSubLabel: "text-white/70",
    discountIcon: "text-[#f74faf]",
    discountFocus: "focus:ring-[#f74faf]",
    paymentActiveCash: "bg-[#f74faf]/10 border-[#f74faf] text-[#f74faf]",
    paymentActiveCashDot: "bg-[#f74faf]",
    paymentInactiveHover: "hover:border-[#f74faf]/40 hover:bg-gray-50",
    cashInputBg: "bg-[#f74faf] border-[#f74faf] focus:ring-white/40 focus:border-transparent",
    completeSaleBtn: "bg-[#f74faf] hover:opacity-90 shadow-lg shadow-[#f74faf]/30",
    modalHeaderBg: "bg-[#f74faf]",
    modalSubtext: "text-white/80",
    modalFieldIcon: "text-[#f74faf]",
    modalFieldFocus: "focus:ring-[#f74faf]/50 focus:border-[#f74faf]/50",
    modalContinueBtn: "bg-[#f74faf] hover:opacity-90 shadow-md shadow-[#f74faf]/20",
    receiptHeaderBorder: "border-[#f74faf]/20",
    receiptIconBg: "bg-[#f74faf]/10",
    receiptIconColor: "text-[#f74faf]",
    formatBarBg: "bg-[#f74faf]/5 border-[#f74faf]/20",
    formatSelect: "border-[#f74faf]/20 focus:ring-[#f74faf]",
    receiptFooterBorder: "border-[#f74faf]/20",
    printBtn: "border-[#f74faf]/20 text-[#f74faf] hover:bg-[#f74faf]/5",
    finalizeBtn: "bg-[#f74faf] hover:opacity-90 shadow-md shadow-[#f74faf]/20",
  },
};

const PAYMENT_METHODS = [
  { key: "cash", label: "Cash", icon: <Banknote size={16} /> },
  { key: "card", label: "Card", icon: <CreditCard size={16} />, active: "bg-blue-50 border-blue-400 text-blue-600", dot: "bg-blue-500" },
  { key: "upi", label: "UPI", icon: <Smartphone size={16} />, active: "bg-purple-50 border-purple-400 text-purple-600", dot: "bg-purple-500" },
  { key: "wallet", label: "Wallet", icon: <Wallet size={16} />, active: "bg-orange-50 border-orange-400 text-orange-600", dot: "bg-orange-500" },
];

const numberToWord = (num) => {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (num === 0) return "Zero";
  const convert = (n) => {
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + units[n % 10] : "");
    if (n < 1000) return units[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + convert(n % 10000000) : "");
  };
  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);
  let result = convert(integerPart) + " Rupees";
  if (decimalPart > 0) result += " and " + convert(decimalPart) + " Paise";
  return result + " Only";
};

const IndustryBilling = () => {
  const { currentUser, updateProfile, hasCapability } = useAuth();
  const canWhatsappBill = hasCapability("whatsappInvoices");
  // How bills go out on WhatsApp, set by the super admin: "pdf" (receipt attached) or "text".
  const billViaText = currentUser?.Tenant?.bill_delivery_mode === "text";
  const [sendWhatsappBill, setSendWhatsappBill] = useState(true);
  const userData = currentUser;
  const profile = resolveIndustryProfile(currentUser);
  const theme = THEMES[profile.theme] || THEMES.green;
  const flags = profile.featureFlags;
  const paymentMethods = PAYMENT_METHODS.filter(
    (m) => profile.paymentMethods.includes(m.key) && (m.key !== "wallet" || flags.wallet)
  );

  const [barcodeInput, setBarcodeInput] = useState("");
  const handleBarcodeScan = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const scanned = barcodeInput.trim();
      if (!scanned) return;
      const product = productsToDisplay?.find(
        (p) => (p.barcode && p.barcode === scanned) || (p.sku && p.sku === scanned)
      );
      if (product) {
        addToCart(product);
        beep();
      } else {
        alert("Product not found!");
      }
      setBarcodeInput("");
    }
  };

  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);

  const [existingCustomers, setExistingCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    let retries = 0;
    const MAX_RETRIES = 10;

    const fetchProducts = async () => {
      if (!currentUser) return;
      setProductsError(null);
      const token = sessionStorage.getItem("token");

      if (!token) {
        if (retries < MAX_RETRIES) {
          retries++;
          return setTimeout(fetchProducts, 1000);
        }
        setProductsError({ message: "Authentication session not found. Please refresh the page." });
        setProductsLoading(false);
        return;
      }

      setProductsLoading(true);
      try {
        const res = await axios.get(`${API_URL}/products`, {
          headers: { 'x-auth-token': token }
        });
        setProducts(res.data);

        const customersRes = await axios.get(`${API_URL}/customers`, {
          headers: { 'x-auth-token': token }
        });
        setExistingCustomers(customersRes.data);

        setProductsError(null);
      } catch (err) {
        if (retries < MAX_RETRIES) {
          retries++;
          console.warn(`Billing products fetch attempt ${retries} failed, retrying...`);
          return setTimeout(fetchProducts, 1000);
        }
        console.error("Final product fetch error:", err);
        setProductsError(err || { message: "Could not load products." });
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [currentUser]);

  const initialCart = () => {
    const savedCart = localStorage.getItem("pos-cart");
    return savedCart ? JSON.parse(savedCart) : [];
  };
  const initialCash = () => {
    const savedCash = localStorage.getItem("pos-cash");
    return savedCash ? parseFloat(savedCash) : 0;
  };

  const [keyword, setKeyword] = useState("");
  const [cart, setCart] = useState(initialCart);
  const [cash, setCash] = useState(initialCash);
  // Cash Received follows the bill total until the cashier types an amount;
  // clearing the field or emptying the cart hands control back to the total.
  const [cashEdited, setCashEdited] = useState(() => localStorage.getItem("pos-cash-edited") === "true");
  const [discount, setDiscount] = useState(0);
  const [change, setChange] = useState(0);
  const dateFormat = (date) => new Intl.DateTimeFormat("en-IN", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true }).format(date);

  const generateNextReceiptNo = () => {
    const receiptPrefix = userData?.invoiceSettings?.prefix || userData?.businessName?.substring(0, 3).toUpperCase() || "INV";
    let receiptSequence = userData?.invoiceSettings?.sequence;
    if (!receiptSequence) receiptSequence = Date.now().toString().slice(-6);
    return `${receiptPrefix}-${receiptSequence}`;
  };

  const [isShowModalReceipt, setIsShowModalReceipt] = useState(false);
  const [receiptNo, setReceiptNo] = useState(() => {
    const prefix = currentUser?.invoiceSettings?.prefix || currentUser?.businessName?.substring(0, 3).toUpperCase() || "INV";
    const seq = currentUser?.invoiceSettings?.sequence || Date.now().toString().slice(-6);
    return `${prefix}-${seq}`;
  });
  const [receiptDate, setReceiptDate] = useState(() => dateFormat(new Date()));
  const [filterCategory, setFilterCategory] = useState("All");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [categories, setCategories] = useState([]);
  const [isDueBill, setIsDueBill] = useState(false);
  const [printerFormat, setPrinterFormat] = useState(currentUser?.Tenant?.printer_format || "A4");
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [creditPaymentData, setCreditPaymentData] = useState(null);

  useEffect(() => {
    if (userData) {
      const prefix = userData?.invoiceSettings?.prefix || userData?.businessName?.substring(0, 3).toUpperCase() || "INV";
      const seq = userData?.invoiceSettings?.sequence;
      if (seq) {
        setReceiptNo(`${prefix}-${seq}`);
      }
      setReceiptDate(dateFormat(new Date()));
    }
  }, [userData]);


  const receiptContentRef = useRef(null);
  const printAreaRef = useRef(null);

  useEffect(() => { localStorage.setItem("pos-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem("pos-cash", cash.toString()); }, [cash]);
  useEffect(() => { localStorage.setItem("pos-cash-edited", String(cashEdited)); }, [cashEdited]);
  useEffect(() => { if (cart.length === 0) setCashEdited(false); }, [cart.length]);
  useEffect(() => { updateChange(); }, [cart, cash, discount]);

  // Handle Credit Payment Redirect (from the Credit page's "Pay Now")
  useEffect(() => {
    if (flags.credit && location.state?.creditPayment) {
      const { id, customerName, name, payAmount } = location.state.creditPayment;
      const displayName = customerName || name || "Customer";

      setCreditPaymentData(location.state.creditPayment);
      setCart([{
        productId: "CREDIT_PAYMENT",
        productSku: "CP-" + id,
        name: `Credit Repayment - ${displayName}`,
        price: payAmount,
        qty: 1,
        category: "Credit Payment",
        gstRate: 0
      }]);
    }
  }, [location.state]);

  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", location: "", gstin: "" });
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  const handleCompleteSaleClick = () => {
    if (!submitable()) return;
    if (paymentMethod === "cash" && cash < currentGrandTotal) {
      alert("The sale cannot be completed. Full payment is required for the 'Paid' status.");
      return;
    }
    if (paymentMethod === "wallet") {
      const walletBal = Number(selectedCustomer?.walletBalance || 0);
      if (walletBal < currentGrandTotal) {
        alert(`Insufficient wallet balance. Available: ₹${walletBal}`);
        return;
      }
    }
    setShowCustomerForm(true);
  };
  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomerForm({ ...customerForm, [name]: value });

    if (name === "phone" && value.length === 10) {
      const found = existingCustomers.find(c => (c.phone === value || c.mobile === value));
      if (found) {
        setSelectedCustomer(found);
        setCustomerForm({ name: found.name, phone: value, location: found.location || found.address || "", gstin: found.gstin || "" });
        beep();
      } else {
        setSelectedCustomer(null);
      }
    }
  };
  const handleCustomerSubmit = () => {
    setShowCustomerForm(false);
    submit(false);
  };

  useEffect(() => {
    if (products) {
      const uniqueCategories = _.uniq(_.map(products, "category").filter(Boolean));
      setCategories(["All", ..._.sortBy(uniqueCategories)]);
    }
  }, [products]);

  const productsToDisplay = products || [];

  const fuse = useMemo(() => {
    try {
      const FuseClass = (typeof Fuse === "function" ? Fuse : Fuse?.default);
      if (FuseClass && Array.isArray(productsToDisplay) && productsToDisplay.length > 0) {
        return new FuseClass(productsToDisplay, {
          keys: [
            { name: "name", weight: 0.5 },
            { name: "sku", weight: 0.2 },
            { name: "barcode", weight: 0.2 },
            { name: "brandName", weight: 0.1 },
            { name: "category", weight: 0.1 }
          ],
          threshold: 0.38,
          ignoreLocation: true,
          minMatchCharLength: 2
        });
      }
    } catch (e) {
      console.warn("Fuse init warning:", e);
    }
    return null;
  }, [productsToDisplay]);

  const filteredProducts = () => {
    let result = productsToDisplay || [];
    const trimmed = (keyword || "").trim();
    if (trimmed) {
      const lower = trimmed.toLowerCase();
      // 1. Direct match (name, barcode, sku, brand)
      const directMatches = result.filter(p =>
        (p?.name && String(p.name).toLowerCase().includes(lower)) ||
        (p?.barcode && String(p.barcode).toLowerCase().includes(lower)) ||
        (p?.sku && String(p.sku).toLowerCase().includes(lower)) ||
        (p?.brandName && String(p.brandName).toLowerCase().includes(lower))
      );

      if (directMatches.length > 0) {
        result = directMatches;
      } else if (fuse && typeof fuse.search === "function") {
        // 2. Intelligent fuzzy search fallback
        try {
          const fuseResults = fuse.search(trimmed);
          result = fuseResults.map(r => r.item);
        } catch (e) {
          result = directMatches;
        }
      } else {
        result = directMatches;
      }
    }

    if (filterCategory !== "All") {
      result = result.filter(p => p?.category === filterCategory);
    }
    return result;
  };

  const beep = () => playSound("/sound/beep-29.mp3");

  const addToCart = (product) => {
    const validSku = product.sku || product.id;

    const unitPrice = product.salePrice || product.salesPrice || product.price || 0;
    const qtyPerUnit = Number(product.unit) || 1;
    const itemRate = unitPrice / qtyPerUnit;

    const validGst = product.salesGst || product.gstRate || product.gst || 0;
    const existingItem = _.find(cart, { productSku: validSku });

    const currentQtyInCart = existingItem ? existingItem.qty : 0;
    const availableStock = Number(product.quantity || 0) * (Number(product.unit) || 1);

    if (currentQtyInCart + 1 > availableStock) {
      alert(`Insufficient stock! Only ${availableStock} units available.`);
      return;
    }

    if (!existingItem) {
      setCart([...cart, { productId: product.id, productSku: validSku, image: product.imageUrl || product.image, name: product.name, price: itemRate, category: product.category, qty: 1, gstRate: validGst }]);
    } else {
      setCart(_.map(cart, (item) => item.productSku === validSku ? { ...item, qty: (Number(item.qty) || 0) + 1 } : item));
    }
    beep();
    updateChange();
  };

  const addQty = (itemSku, qtyChange) => {
    const product = products.find(p => (p.sku || p.id) === itemSku);
    const availableStock = Number(product?.quantity || 0) * (Number(product?.unit) || 1);

    const updatedCart = _.map(cart, (cartItem) => {
      if (cartItem.productSku === itemSku) {
        if (qtyChange > 0 && (cartItem.qty + qtyChange > availableStock)) {
          alert(`Insufficient stock! Only ${availableStock} units available.`);
          return cartItem;
        }
        const newQty = cartItem.qty + qtyChange;
        return newQty > 0 ? { ...cartItem, qty: newQty } : null;
      }
      return cartItem;
    });
    setCart(_.compact(updatedCart));
    const updatedItem = cart.find((c) => c.productSku === itemSku);
    if (updatedItem && updatedItem.qty + qtyChange <= 0) clearSound();
    else beep();
    updateChange();
  };

  const setQty = (itemSku, newQtyValue) => {
    const newQty = newQtyValue === "" ? "" : (parseInt(newQtyValue) || 0);
    const product = products.find(p => (p.sku || p.id) === itemSku);
    const availableStock = Number(product?.quantity || 0) * (Number(product?.unit) || 1);

    if (newQty !== "" && newQty > availableStock) {
      alert(`Insufficient stock! Only ${availableStock} units available.`);
    }

    const updatedCart = _.map(cart, (cartItem) => {
      if (cartItem.productSku === itemSku) {
        return (newQty === "" || newQty > 0) ? { ...cartItem, qty: newQty === "" ? "" : Math.min(newQty, availableStock) } : null;
      }
      return cartItem;
    });
    setCart(_.compact(updatedCart));
    updateChange();
  };

  const updatePrice = (itemSku, newPrice) => {
    const numericPrice = parseFloat(newPrice);
    if (isNaN(numericPrice) || numericPrice < 0) return;

    const updatedCart = _.map(cart, (item) =>
      item.productSku === itemSku ? { ...item, price: numericPrice } : item
    );
    setCart(updatedCart);
  };

  const getItemsCount = () => _.sumBy(cart, "qty");
  const updateChange = () => setChange(cash - getTotals().grandTotal);
  const updateCashInput = (value) => {
    const numericValue = parseFloat(value.replace(/[^0-9.]/g, ""));
    setCashEdited(!isNaN(numericValue));
    setCash(isNaN(numericValue) ? 0 : numericValue);
  };

  const getTotals = () => {
    let subtotalAmt = 0;
    let totalGst = 0;
    let grandTotal = 0;

    let redemptionDiscount = 0;
    if (flags.loyalty && redeemPoints && selectedCustomer?.loyaltyPoints) {
      const ls = userData?.loyaltySettings || { enabled: true, redemptionThreshold: 100, redemptionAmount: 10 };
      const th = Number(ls.redemptionThreshold) || 100;
      const ra = Number(ls.redemptionAmount) || 10;
      if (selectedCustomer.loyaltyPoints >= th) {
        const multiples = Math.floor(selectedCustomer.loyaltyPoints / th);
        redemptionDiscount = multiples * ra;
      }
    }

    const isInclusive = userData?.Tenant?.sales_tax_type === "inclusive";

    cart.forEach((item) => {
      const price = Number(item.price);
      const qty = Number(item.qty) || 0;
      const gstRate = Number(item.gstRate || 0);
      const lineTotal = price * qty;

      if (isInclusive) {
        const lineGst = lineTotal - (lineTotal / (1 + gstRate / 100));
        const lineSubtotal = lineTotal - lineGst;

        totalGst += lineGst;
        subtotalAmt += lineSubtotal;
        grandTotal += lineTotal;
      } else {
        const lineGst = (lineTotal * gstRate) / 100;

        totalGst += lineGst;
        subtotalAmt += lineTotal;
        grandTotal += (lineTotal + lineGst);
      }
    });

    grandTotal = Math.max(0, grandTotal - discount - redemptionDiscount);

    return {
      subtotal: Math.round(subtotalAmt * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      discount: discount + redemptionDiscount
    };
  };

  const submitable = () => cart.length > 0;

  const submit = async (dueBill = false) => {
    if (!currentUser) { alert("Error: Not logged in."); return; }
    const time = new Date();
    const receiptPrefix = userData?.invoiceSettings?.prefix || userData?.businessName?.substring(0, 3).toUpperCase() || "INV";
    let receiptSequence = userData?.invoiceSettings?.sequence;
    if (!receiptSequence) receiptSequence = Date.now().toString().slice(-6);
    setReceiptNo(`${receiptPrefix}-${receiptSequence}`);
    setReceiptDate(dateFormat(time));
    setIsDueBill(dueBill);
    setIsShowModalReceipt(true);
  };

  const closeModalReceipt = () => { setIsShowModalReceipt(false); setIsDueBill(false); };

  const numberFormat = (number) => (number || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const priceFormat = (number) => `₹${numberFormat(number)}`;

  const clear = () => { setCash(0); setCashEdited(false); setDiscount(0); setCart([]); setPaymentMethod("cash"); updateChange(); clearSound(); };
  const clearSound = () => playSound("/sound/button-21.mp3");
  const playSound = (src) => { const sound = new Audio(src); sound.play().catch(() => { }); sound.onended = () => sound.remove(); };

  // compact: JPEG instead of PNG (~10x smaller), used for the WhatsApp copy.
  const buildReceiptPdf = async ({ compact = false } = {}) => {
    if (!receiptContentRef.current) return null;
    const formatStr = printerFormat.toLowerCase();
    let format = { width: 70, height: null };

    if (formatStr.includes('80mm')) format.width = 80;
    else if (formatStr.includes('58mm')) format.width = 58;
    else if (formatStr.includes('thermal')) format.width = 72;

    if (formatStr.includes('a4') || formatStr.includes('dotmatrix')) format = { width: 210, height: 297 };
    else if (formatStr.includes('a5')) format = { width: 148, height: 210 };
    const original = receiptContentRef.current;
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-10000px';
    container.style.left = '-10000px';
    container.style.width = format.width + 'mm';
    container.style.backgroundColor = '#ffffff';
    const clone = original.cloneNode(true);
    container.appendChild(clone);
    document.body.appendChild(container);
    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: container.scrollWidth, windowHeight: container.scrollHeight });
      const imgType = compact ? "JPEG" : "PNG";
      const imgData = compact ? canvas.toDataURL("image/jpeg", 0.85) : canvas.toDataURL("image/png");
      const ratio = canvas.height / canvas.width;
      let pdf;
      if (formatStr.includes('thermal')) {
        const pdfWidth = format.width;
        pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [pdfWidth, pdfWidth * ratio] });
        pdf.addImage(imgData, imgType, 0, 0, pdfWidth, pdfWidth * ratio);
      } else if (formatStr.includes('a5')) {
        pdf = new jsPDF('p', 'mm', 'a5');
        pdf.addImage(imgData, imgType, 0, 0, 148, 148 * ratio);
      } else {
        pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(imgData, imgType, 0, 0, 210, 210 * ratio);
      }
      return pdf;
    } finally { document.body.removeChild(container); }
  };

  const handleDownloadPdf = async () => {
    try {
      const pdf = await buildReceiptPdf();
      if (pdf) pdf.save(`${receiptNo || "receipt"}.pdf`);
    } catch (err) { console.error("PDF Gen Error:", err); alert("Error generating PDF."); }
  };

  // Sends the saved bill (same PDF as the receipt) to the customer's WhatsApp.
  // Never blocks the sale: a failure only shows a message.
  const sendBillOnWhatsapp = async (billId, token) => {
    try {
      // Text mode (super admin setting): the server builds the message from the saved bill, no PDF needed.
      const pdf = billViaText ? null : await buildReceiptPdf({ compact: true });
      if (!billViaText && !pdf) return;
      await axios.post(`${API_URL}/billing/bills/${billId}/whatsapp`, pdf ? pdf.output("blob") : null, {
        headers: { "x-auth-token": token, "Content-Type": "application/octet-stream" },
      });
    } catch (err) {
      console.error("WhatsApp bill error:", err);
      alert(`Sale saved, but the bill could not be sent on WhatsApp.\n${err.response?.data?.msg || err.message}`);
    }
  };

  const handlePrint = () => {
    if (!receiptContentRef.current || !printAreaRef.current) return;
    printAreaRef.current.innerHTML = receiptContentRef.current.innerHTML;
    const titleBefore = document.title;
    document.title = receiptNo || "Receipt";
    window.print();
    document.title = titleBefore;
    setTimeout(() => { printAreaRef.current.innerHTML = ""; }, 1000);
  };

  const storeBillingCustomer = async (customer) => {
    if (!currentUser) return null;
    try {
      const token = sessionStorage.getItem("token");
      if (!token) return null;

      const { grandTotal } = getTotals();

      const existing = selectedCustomer || existingCustomers.find(c => (c.phone === customer.phone || c.mobile === customer.phone));

      const payload = {
        name: customer.name,
        mobile: customer.phone,
        address: customer.location || "",
        gstin: customer.gstin || "",
        loyaltyPoints: Number(existing?.loyaltyPoints || 0),
        walletBalance: Number(existing?.walletBalance || 0),
        products: cart.map(item => {
          const price = Number(item.price);
          const gstRate = Number(item.gstRate || 0);
          const gstAmount = (price * gstRate) / 100;
          return {
            name: item.name,
            quantity: item.qty,
            price: item.price,
            gst: gstRate || 0,
            gstamount: gstAmount * item.qty,
            totalamount: (price + gstAmount) * item.qty
          }
        }),
        paymentamount: cash,
        changeamount: change,
        discountamount: discount,
        totalamount: grandTotal,
        date: new Date().toISOString()
      };

      if (selectedCustomer?.id) {
        await axios.put(`${API_URL}/customers/${selectedCustomer.id}`, payload, {
          headers: { 'x-auth-token': token }
        });
        return selectedCustomer.id;
      }

      if (existing) {
        await axios.put(`${API_URL}/customers/${existing.id}`, payload, {
          headers: { 'x-auth-token': token }
        });
        return existing.id;
      }

      const res = await axios.post(`${API_URL}/customers`, payload, {
        headers: { 'x-auth-token': token }
      });

      return res.data.id;
    } catch (err) {
      console.error("Error storing customer via API:", err);
      return null;
    }
  };

  // Guards Finalize against double-clicks: the ref blocks a second click
  // before React re-renders, the state disables the button.
  const finalizingRef = useRef(false);
  const [finalizing, setFinalizing] = useState(false);
  const handleFinalize = async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    setFinalizing(true);
    try {
      await printAndProceed();
    } finally {
      finalizingRef.current = false;
      setFinalizing(false);
    }
  };

  const printAndProceed = async () => {
    if (!receiptContentRef.current || !printAreaRef.current || !currentUser) { alert("Error preparing receipt or user not logged in."); return; }

    const token = sessionStorage.getItem("token");
    if (!token) {
      alert("Session expired. Please log in again.");
      return;
    }

    try {
      const customerId = await storeBillingCustomer(customerForm);
      const { grandTotal } = getTotals();
      const dueAmount = grandTotal - cash;
      const isDueSale = flags.credit && dueAmount > 0;
      const saleData = {
        receiptNo: receiptNo || "N/A", receiptDate: receiptDate || new Date().toISOString(), customerId: customerId || null,
        customerName: customerForm.name || "", customerPhone: customerForm.phone || "",
        items: cart.map(item => ({ sku: item.productSku || "NA", name: item.name || "Unknown", price: Number(item.price || 0), qty: Number(item.qty || 1), category: item.category || "Uncategorized", gstRate: Number(item.gstRate || 0) })),
        totals: getTotals(),
        paymentMethod: paymentMethod,
        discount: Number(discount || 0), soldBy: currentUser.email || currentUser.uid, createdAt: new Date().toISOString(),
        dueBill: isDueSale, dueAmount: isDueSale ? dueAmount : 0
      };

      const config = { headers: { 'x-auth-token': token } };

      let savedBillId = null;
      try {
        const billRes = await axios.post(`${API_URL}/billing/bills`, saleData, config);
        savedBillId = billRes.data?.id || null;
      } catch (err) {
        console.error("Error creating bill via API:", err);
      }

      if (savedBillId && canWhatsappBill && sendWhatsappBill && customerForm.phone) {
        await sendBillOnWhatsapp(savedBillId, token);
      }

      if (flags.credit && creditPaymentData) {
        try {
          const creditId = creditPaymentData.id;
          const paymentAmount = getTotals().grandTotal;

          const creditRes = await axios.get(`${API_URL}/credit`, config);
          const currentCredit = creditRes.data.find(c => c.id === creditId);

          if (currentCredit) {
            const newBalance = Math.max(0, currentCredit.balance - paymentAmount);
            const newCredit = (currentCredit.credit || 0) + paymentAmount;

            const updatePayload = {
              balance: newBalance,
              totalbalance: newBalance,
              credit: newCredit
            };

            await axios.put(`${API_URL}/credit/${creditId}`, updatePayload, config);
          }
        } catch (err) {
          console.error("Error updating credit balance:", err);
          alert("Sale recorded, but failed to update credit balance automatically. Please check Records.");
        }
      }

      if (isDueSale) {
        const creditData = {
          name: customerForm.name, phone: customerForm.phone, address: customerForm.location,
          date: new Date().toISOString(), total: grandTotal, credit: cash, balance: dueAmount, totalbalance: dueAmount,
          products: cart.map(item => ({ productId: item.productId, description: item.name, quantity: item.qty, price: item.price, gst: item.gstRate })),
          dueSession: 1,
          payments: [{ session: 1, due: grandTotal, paid: cash, balance: dueAmount, currentBalance: dueAmount }],
          customerId, createdBy: currentUser.uid || currentUser.userId,
        };
        try {
          await axios.post(`${API_URL}/credit`, creditData, config);
        } catch (err) {
          console.error("Error creating credit record:", err);
          alert("Failed to create credit record. The sale was saved, but the due amount was not added to the credit list.");
        }
      }

      const stockUpdates = cart.map(async (item) => {
        if (item.productId) {
          try {
            const product = products.find(p => p.id === item.productId);
            if (product) {
              const unitMultiplier = Number(product.unit) || 1;
              const totalUnitsBefore = Number(product.quantity || 0) * unitMultiplier;
              const newTotalUnits = Math.max(totalUnitsBefore - item.qty, 0);
              const newQty = newTotalUnits / unitMultiplier;

              await axios.put(`${API_URL}/products/${item.productId}`, { quantity: newQty }, config);
            }
          } catch (err) {
            console.error(`Failed to update stock for ${item.name}:`, err);
          }
        }
      });

      await Promise.all(stockUpdates);

      if (customerId) await processCustomerUpdates(customerId, grandTotal);

      printAreaRef.current.innerHTML = receiptContentRef.current.innerHTML;
      const titleBefore = document.title;
      document.title = receiptNo;
      window.print();

      setIsShowModalReceipt(false);
      setIsDueBill(false);
      printAreaRef.current.innerHTML = "";
      document.title = titleBefore;

      if (userData?.Tenant?.printer_auto_print) {
        setTimeout(() => {
          handlePrint();
        }, 500);
      }

      if (userData?.invoiceSettings?.sequence) {
        try { await updateProfile({ invoiceSettings: { ...userData.invoiceSettings, sequence: Number(userData.invoiceSettings.sequence) + 1 } }); } catch (e) { }
      }
      clear();

      window.location.reload();

    } catch (error) { console.error("Sale error:", error); alert("Error saving sale. See console."); }
  };

  const processCustomerUpdates = async (customerId, totalAmount) => {
    if (!flags.loyalty && !flags.wallet) return;
    const ls = userData?.loyaltySettings || { enabled: true, spendPerPoint: 100, redemptionThreshold: 100, redemptionAmount: 10 };

    try {
      const token = sessionStorage.getItem("token");
      const config = { headers: { 'x-auth-token': token } };

      const custRes = await axios.get(`${API_URL}/customers`, config);
      const customer = custRes.data.find(c => c.id === customerId);
      if (!customer) return;

      let currentPoints = Number(customer.loyaltyPoints || 0);
      let currentWallet = Number(customer.walletBalance || 0);

      if (flags.loyalty && ls.enabled !== false) {
        if (redeemPoints) {
          const th = Number(ls.redemptionThreshold) || 100;
          const multiples = Math.floor(currentPoints / th);
          currentPoints -= (multiples * th);
        }
        const spp = Number(ls.spendPerPoint) || 100;
        currentPoints += Math.floor(totalAmount / spp);
      }

      if (flags.wallet && paymentMethod === "wallet") {
        currentWallet -= totalAmount;
      }

      await axios.put(`${API_URL}/customers/${customerId}`, {
        loyaltyPoints: currentPoints,
        walletBalance: Math.max(0, currentWallet)
      }, config);

    } catch (err) { console.error("Customer loyalty/wallet update error:", err); }
  };

  const renderReceiptContent = () => {
    const businessName =
      userData?.companyDetails?.name ||
      userData?.Tenant?.name ||
      userData?.businessName ||
      userData?.storeName ||
      currentUser?.displayName ||
      "Your Store Name";

    const businessAddress = {
      street: userData?.companyDetails?.street || userData?.address?.street || "",
      city: userData?.companyDetails?.city || userData?.address?.city || "",
      state: userData?.companyDetails?.state || userData?.address?.state || "",
      pincode: userData?.companyDetails?.pincode || userData?.address?.pincode || ""
    };

    const businessPhone = userData?.companyDetails?.phone || userData?.phone || userData?.mobile || "";
    const businessGstin = userData?.companyDetails?.gstin || userData?.gstin || userData?.Tenant?.gstin || "";
    const businessEmail = currentUser?.email || userData?.email || "";

    const formatStr = (printerFormat || "A4").toLowerCase();
    const isThermal = formatStr.includes("thermal") || formatStr.includes("80mm") || formatStr.includes("58mm") || formatStr === "a4" || formatStr === "a5";
    const isA5 = formatStr.includes("a5");

    if (isThermal) {
      let thermalClass = "receipt-thermal-80";
      if (formatStr.includes("58mm")) thermalClass = "receipt-thermal-58";
      else if (formatStr === "a5") thermalClass = "receipt-a5";
      else if (formatStr === "a4") thermalClass = "receipt-a4";

      return (
        <div className={`${thermalClass} text-gray-800 bg-white`}>
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold">{businessName}</h2>
            <p className="text-xs">
              {[businessAddress.street, businessAddress.city, businessAddress.state, businessAddress.pincode].filter(Boolean).join(", ") || [userData.street, userData.city, userData.state, userData.pincode].filter(Boolean).join(", ")}
            </p>
            {businessPhone && <p className="text-xs">Phone: {businessPhone}</p>}
            {businessGstin && <p className="text-xs">GSTIN: {businessGstin}</p>}
          </div>
          <div className="flex justify-between text-xs mb-2"><span>Receipt #: {receiptNo}</span><span>Date: {receiptDate}</span></div>
          <div className="text-xs mb-2">
            <span>Customer: {customerForm.name}</span><br /><span>Phone: {customerForm.phone}</span><br /><span>Location: {customerForm.location}</span>
            {customerForm.gstin && <><br /><span>GSTIN: {customerForm.gstin}</span></>}
          </div>
          <table className="w-full text-xs mb-4">
            <thead><tr className="border-b-2 border-t-2 border-dashed border-gray-400"><th className="text-left py-1.5 font-semibold">Item</th><th className="text-center py-1.5 font-semibold">Qty</th><th className="text-right py-1.5 font-semibold">Price</th><th className="text-right py-1.5 font-semibold">Total</th></tr></thead>
            <tbody>{cart.map((item, i) => (<tr key={i} className="border-b border-dashed border-gray-300"><td className="py-1.5 text-left">{item.name}</td><td className="py-1.5 text-center">{item.qty}</td><td className="py-1.5 text-right">{numberFormat(item.price)}</td><td className="py-1.5 text-right">{numberFormat(item.qty * item.price)}</td></tr>))}</tbody>
          </table>
          <div className="text-xs">
            <div className="flex justify-between mb-0.5"><span>Subtotal (Excl. GST):</span><span>{priceFormat(currentSubtotal)}</span></div>
            <div className="flex justify-between mb-0.5"><span>Total GST:</span><span>{priceFormat(currentTotalGst)}</span></div>
            {discount > 0 && <div className="flex justify-between mb-0.5 text-red-500 font-medium"><span>Discount:</span><span>-{priceFormat(discount)}</span></div>}
            <div className="flex justify-between font-bold text-sm border-t border-gray-400 pt-1 mt-1"><span>Grand Total:</span><span>{priceFormat(currentGrandTotal)}</span></div>
          </div>
          <div className="text-xs mt-3">
            <div className="flex justify-between"><span>Payment:</span><span className="capitalize">{paymentMethod}</span></div>
            {paymentMethod === "cash" && (<><div className="flex justify-between"><span>Cash Received:</span><span>{priceFormat(cash)}</span></div>{isDueBill ? <div className="flex justify-between"><span>Due:</span><span>{priceFormat(currentGrandTotal - cash)}</span></div> : <div className="flex justify-between"><span>Change:</span><span>{priceFormat(change)}</span></div>}</>)}
          </div>
          <div className="text-center mt-6 text-xs"><p>Thank you for your purchase!</p></div>
        </div>
      );
    }
    const isDotMatrix = formatStr.includes("dotmatrix");
    const containerClass = isDotMatrix ? "receipt-dotmatrix font-mono" : (isA5 ? "receipt-a5 font-arial" : "receipt-a4 font-arial");
    return (
      <div className={`${containerClass} w-full bg-white text-black text-sm`}>
        <div className="flex justify-between border-b-2 border-black pb-4 mb-4">
          <div className="w-[60%]">
            <h1 className="text-2xl font-bold uppercase mb-1">{businessName}</h1>
            <p>{businessAddress.street || "Street Address"}</p>
            <p>{[businessAddress.city, businessAddress.state].filter(Boolean).join(", ")} {businessAddress.pincode ? `- ${businessAddress.pincode}` : ""}</p>
            {businessPhone && <p>Phone: {businessPhone}</p>}
            {businessEmail && <p>Email: {businessEmail}</p>}
            {businessGstin && <p className="font-semibold mt-1">GSTIN: {businessGstin}</p>}
            {businessAddress.state && <p>State / POS: {businessAddress.state}</p>}
          </div>
          <div className="w-[40%] text-right"><h2 className="text-xl font-bold uppercase mb-2">{formatStr.includes("gst") ? "TAX INVOICE" : "RECEIPT"}</h2><div className="space-y-1"><div className="flex justify-end gap-4"><span className="font-semibold">{formatStr.includes("gst") ? "Invoice No" : "Receipt No"}:</span><span>{receiptNo}</span></div><div className="flex justify-end gap-4"><span className="font-semibold">{formatStr.includes("gst") ? "Invoice Date" : "Receipt Date"}:</span><span>{receiptDate}</span></div></div></div>
        </div>
        <div className="border border-black mb-4 flex">
          <div className="w-1/2 p-2 border-r border-black"><p className="font-bold border-b border-black w-full mb-2 pb-1">Issued To:</p><p className="font-semibold">{customerForm.name || "Cash Sale"}</p>{customerForm.gstin && <p>GSTIN: {customerForm.gstin}</p>}<p>POS: {customerForm.location || businessAddress.state || "State"}</p></div>
          <div className="w-1/2 p-2"><p className="font-bold border-b border-black w-full mb-2 pb-1">Billing & Shipping Address:</p><p>{customerForm.location || "N/A"}</p><p>Mobile: {customerForm.phone}</p></div>
        </div>
        <table className="w-full border-collapse border border-black mb-4 text-[11px]">
          <thead className="bg-gray-100"><tr><th className="border border-black px-1 py-2 text-center w-[5%]">S.No</th><th className="border border-black px-1 py-2 text-center w-[10%]">Batch</th><th className="border border-black px-1 py-2 text-left w-[25%]">Item Description</th><th className="border border-black px-1 py-2 text-center w-[10%]">Mfg Date</th><th className="border border-black px-1 py-2 text-center w-[10%]">Exp Date</th><th className="border border-black px-1 py-2 text-center w-[5%]">Qty</th><th className="border border-black px-1 py-2 text-right w-[10%]">Rate</th><th className="border border-black px-1 py-2 text-right w-[10%]">Tax</th><th className="border border-black px-1 py-2 text-right w-[15%]">Amount</th></tr></thead>
          <tbody>{cart.map((item, i) => (<tr key={i}><td className="border border-black px-1 py-1 text-center">{i + 1}</td><td className="border border-black px-1 py-1 text-center">-</td><td className="border border-black px-1 py-1 text-left">{item.name}</td><td className="border border-black px-1 py-1 text-center">-</td><td className="border border-black px-1 py-1 text-center">-</td><td className="border border-black px-1 py-1 text-center font-bold">{item.qty}</td><td className="border border-black px-1 py-1 text-right">{numberFormat(item.price)}</td><td className="border border-black px-1 py-1 text-right">{item.gstRate}%</td><td className="border border-black px-1 py-1 text-right font-bold">{numberFormat(item.qty * item.price)}</td></tr>))}</tbody>
        </table>
        <div className="flex border border-black min-h-[150px]">
          <div className="w-[60%] border-r border-black flex flex-col justify-between p-2"><div><p className="font-bold mb-1">Amount (in words):</p><p className="italic mb-4">{numberToWord(currentGrandTotal)}</p></div><div className="text-xs"><p className="font-bold">Terms & Conditions:</p><ol className="list-decimal list-inside pl-1"><li>Goods once sold will not be taken back.</li><li>Subject to local jurisdiction.</li><li>Interest @18% pa charged if not paid on due date.</li></ol><p className="border-t border-black mt-2 pt-1 font-bold">Thanks for your Business</p></div></div>
          <div className="w-[40%] flex flex-col"><div className="flex-grow p-2 space-y-1 text-sm"><div className="flex justify-between"><span>Sub Total:</span><span>{priceFormat(currentSubtotal)}</span></div><div className="flex justify-between"><span>CGST:</span><span>{priceFormat(currentTotalGst / 2)}</span></div><div className="flex justify-between"><span>SGST:</span><span>{priceFormat(currentTotalGst / 2)}</span></div>{discount > 0 && <div className="flex justify-between text-red-600 font-bold"><span>Discount:</span><span>-{priceFormat(discount)}</span></div>}<div className="flex justify-between text-gray-400"><span>IGST:</span><span>-</span></div><div className="flex justify-between"><span>Round Off:</span><span>0.00</span></div></div><div className="border-t-2 border-black p-2 bg-gray-100 flex justify-between items-center"><span className="font-bold text-lg">Grand Total:</span><span className="font-bold text-lg">{priceFormat(currentGrandTotal)}</span></div><div className="pt-8 pb-2 px-2 text-center border-t border-black"><p className="mb-8"></p><p className="font-bold text-xs">For {businessName}</p><p className="text-[10px]">Authorized Signature</p></div></div>
        </div>
        <div className="text-center text-[10px] mt-2">This is a computer generated document</div>
      </div>
    );
  };

  const getPaymentIcon = () => {
    switch (paymentMethod) {
      case "card": return <CreditCard size={18} />;
      case "upi": return <Smartphone size={18} />;
      case "wallet": return <Wallet size={18} />;
      default: return <IndianRupee size={18} />;
    }
  };

  const { subtotal: currentSubtotal, totalGst: currentTotalGst, grandTotal: currentGrandTotal } = getTotals();

  const displayTotal = currentGrandTotal;

  // Card/UPI/Wallet always take the full total; cash does too until the cashier types an amount.
  useEffect(() => {
    if (paymentMethod !== "cash" || !cashEdited) {
      setCash(currentGrandTotal);
    }
  }, [paymentMethod, currentGrandTotal, cashEdited]);

  if (productsLoading && !products) {
    return (
      <BillingLayout hideHeader>
        <div className={`flex flex-col items-center justify-center h-screen ${theme.loadingBg}`}>
          <div className="relative mb-6">
            <div className={`w-20 h-20 rounded-2xl ${theme.loadingIconBox} flex items-center justify-center`}>
              <Loader2 className={`w-10 h-10 ${theme.loadingSpinner} animate-spin`} />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Setting Up POS</h2>
          <p className="text-sm text-gray-400">Loading products & inventory...</p>
        </div>
      </BillingLayout>
    );
  }

  if (productsError) {
    return (
      <BillingLayout hideHeader>
        <div className="flex flex-col items-center justify-center h-screen bg-white p-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <CircleX size={32} className="text-red-400" />
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-2">Failed to Load Products</p>
          <p className="text-sm text-gray-400 max-w-sm text-center">{productsError.message}</p>
          <button onClick={() => window.location.reload()} className={`mt-6 flex items-center gap-2 px-6 py-2 rounded-xl transition-all font-bold ${theme.refreshBtn}`}>
            <RotateCcw size={16} /> Refresh Page
          </button>
        </div>
      </BillingLayout>
    );
  }

  if (!currentUser) {
    return (
      <BillingLayout hideHeader>
        <div className="flex flex-col items-center justify-center h-screen bg-white">
          <CircleX size={48} className="text-red-400 mb-4" />
          <p className="text-lg font-semibold text-gray-700">Please log in to continue</p>
        </div>
      </BillingLayout>
    );
  }

  const cartItemCount = getItemsCount();

  return (
    <BillingLayout hideHeader>
      <div className={`hide-print flex h-screen ${theme.pageBg}`}>

        {/* ═══════════ LEFT PANEL — PRODUCTS ═══════════ */}
        <div className="flex flex-col w-full lg:w-[35%] h-full border-r border-gray-100 bg-white">

          <div className={`${theme.headerBg} border-b px-4 py-2.5 flex-shrink-0`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 ${theme.headerIconBg} rounded-lg flex items-center justify-center`}>
                <ScanBarcode size={15} className="text-white" />
              </div>
              <div>
                <h1 className={`${theme.headerTitle} font-bold text-[13px] tracking-tight`}>
                  Billing Counter
                </h1>
                <p className={`${theme.headerSubtitle} text-[11px]`}>
                  {productsToDisplay.length} Products
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 border-b border-gray-100 space-y-2">

            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={14}
              />
              <input
                type="text"
                placeholder="Search product..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                autoFocus={!flags.barcode}
                className={`w-full h-9 pl-8 pr-3 text-[11px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${theme.inputRing}`}
              />
            </div>

            {flags.barcode && (
              <div className="relative">
                <ScanBarcode
                  className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.barcodeIcon}`}
                  size={14}
                />
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeScan}
                  placeholder="Scan barcode..."
                  className={`w-full h-9 pl-8 pr-3 text-[11px] ${theme.barcodeInputBg} border rounded-lg focus:outline-none focus:ring-2`}
                  autoFocus
                />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">

            {filteredProducts().length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
                No Products Found
              </div>
            ) : (
              Object.entries(_.groupBy(filteredProducts(), p => p.category || "Uncategorized")).map(([category, items]) => (
                <div key={category} className="mb-2">
                  <div className="bg-gray-50/90 px-4 py-1.5 sticky top-0 z-10 backdrop-blur-sm border-b border-gray-100">
                    <div className={`text-[10px] font-bold ${theme.categoryLabel} uppercase tracking-widest flex items-center gap-1.5`}>
                      <div className={`w-1 h-3 ${theme.categoryDot} rounded-full`}></div>
                      {category}
                    </div>
                  </div>
                  {items.map((product) => {
                    const inCart = cart.find(
                      (c) => c.productSku === (product.sku || product.id)
                    );

                    return (
                      <div
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className={`flex justify-between items-center px-4 py-2.5 border-b border-gray-50 cursor-pointer transition-all
                  ${inCart
                            ? theme.productActiveRow
                            : "hover:bg-gray-50/80"
                          }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-[13px] font-semibold text-gray-700 leading-tight truncate">
                            {product.name}
                          </p>
                          {product.brandName && (
                            <p className="text-[10px] text-gray-500 font-medium">
                              {product.brandName}
                            </p>
                          )}
                          {product.barcode && (
                            <p className={`text-[10px] ${theme.productBarcodeText} font-medium mt-0.5`}>
                              #{product.barcode}
                            </p>
                          )}
                          {(() => {
                            const unitMultiplier = Number(product.unit) || 1;
                            const stock = (Number(product.quantity || 0) * unitMultiplier);
                            const threshold = Number(product.minStockThreshold !== undefined ? product.minStockThreshold : (product.reorderLevel || 5));
                            if (stock <= 0) {
                              return (
                                <span className="text-[10px] text-red-700 font-bold bg-red-100 border border-red-200 px-1.5 py-0.5 rounded mt-1 inline-block">
                                  Out of Stock (0)
                                </span>
                              );
                            }
                            if (stock <= threshold) {
                              return (
                                <span className="text-[10px] text-amber-800 font-bold bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded mt-1 inline-block animate-pulse">
                                  ⚠️ Low Stock ({stock})
                                </span>
                              );
                            }
                            return (
                              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                                Stock: {stock}
                              </span>
                            );
                          })()}
                        </div>

                        <span className={`text-sm font-bold ${theme.productPriceBadge} px-2 py-1 rounded-md flex-shrink-0`}>
                          ₹{product.salePrice || product.salesPrice || product.price}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>


        {/* ═══════════ CENTER PANEL — CART ═══════════ */}
        <div className="hidden lg:flex flex-col w-[35%] h-full bg-white border-r border-gray-100">

          <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 ${theme.cartHeaderIconBg} rounded-lg flex items-center justify-center`}>
                <ShoppingCart size={14} className={theme.cartHeaderIcon} />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                Cart
                {cartItemCount > 0 && (
                  <span className={`${theme.cartCountBadge} text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold`}>
                    {cartItemCount}
                  </span>
                )}
              </span>
            </div>
            {cart.length > 0 && (
              <button onClick={clear} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-all font-medium">
                <RotateCcw size={10} /> Reset
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6">
                <div className={`w-12 h-12 rounded-xl ${theme.emptyCartIconBg} flex items-center justify-center mb-2.5`}>
                  <ShoppingCart size={20} className={theme.emptyCartIcon} />
                </div>
                <p className="text-xs text-gray-400 font-medium">No items added</p>
                <p className="text-xs text-gray-300 mt-0.5">Tap products to add</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {cart.map((item, index) => (
                  <div key={item.productSku} className={`flex items-center gap-2 p-2 rounded-lg bg-gray-50/60 border ${theme.cartItemHover} transition-all`}>
                    <span className={`w-5 h-5 rounded-md ${theme.cartItemIndexBg} text-[10px] font-bold flex items-center justify-center flex-shrink-0`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate leading-tight">{item.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-gray-400">₹</span>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updatePrice(item.productSku, e.target.value)}
                          className={`w-20 bg-transparent border-b border-dashed border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none ${theme.priceInputFocus} transition-colors`}
                        />
                        {item.gstRate > 0 && <span className={`${theme.gstBadgeText} text-[10px]`}>+{item.gstRate}%</span>}
                      </div>
                    </div>
                    <div className="flex items-center bg-white border border-gray-200 rounded-md overflow-hidden flex-shrink-0">
                      <button onClick={() => addQty(item.productSku, -1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Minus size={10} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        placeholder="0"
                        value={item.qty}
                        onChange={(e) => setQty(item.productSku, e.target.value)}
                        className="w-10 h-6 text-center text-sm font-bold text-gray-700 border-x border-gray-200 bg-gray-50/50 focus:outline-none"
                      />
                      <button onClick={() => addQty(item.productSku, 1)} className={`w-6 h-6 flex items-center justify-center text-gray-400 ${theme.qtyPlusHover} transition-colors`}>
                        <Plus size={10} />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-16 text-right flex-shrink-0">
                      ₹{numberFormat(item.price * item.qty)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="px-4 py-10 border-t border-gray-100 bg-white flex-shrink-0">
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-gray-500 font-medium">{priceFormat(currentSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>GST</span>
                  <span className="text-gray-500 font-medium">{priceFormat(currentTotalGst)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-red-400">
                    <span>Discount</span>
                    <span className="font-medium">-{priceFormat(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-gray-200">
                  <span className="text-base font-bold text-gray-700">Total</span>
                  <span className={`text-lg font-bold ${theme.cartTotalText}`}>{priceFormat(currentGrandTotal)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════ RIGHT PANEL — CASH FLOW ═══════════ */}
        <div className="hidden lg:flex flex-col w-[30%] h-full bg-white">

          <div className="px-4 py-2.5 border-b border-gray-100 flex-shrink-0 bg-white">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg ${theme.cashFlowIconBg} flex items-center justify-center shadow-sm`}>
                <Wallet size={14} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Cash Flow</h2>
                <p className="text-xs text-gray-400">Payment & Checkout</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">

            <div className="px-3 pb-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-2 mb-2 block flex items-center gap-1">
                <User size={10} /> Customer Identification
              </label>
              <div className="relative mb-2">
                <Phone size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.phoneIcon}`} />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={customerForm.phone}
                  name="phone"
                  onChange={handleCustomerChange}
                  className={`w-full h-10 pl-9 pr-3 text-[11px] ${theme.phoneInputBg} border rounded-xl focus:outline-none focus:ring-2 transition-all font-bold`}
                />
              </div>

              {selectedCustomer && (flags.loyalty || flags.wallet) && (
                <div className={`${theme.loyaltyBox} rounded-xl p-3 border space-y-2`}>
                  <div className="flex items-center justify-between">
                    {flags.loyalty && (
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={12} className="text-amber-500" />
                        <span className={`text-[10px] font-bold ${theme.loyaltyPointsText} uppercase`}>Points: {selectedCustomer.loyaltyPoints || 0}</span>
                      </div>
                    )}
                    {flags.wallet && (
                      <span className={`text-[10px] font-bold ${theme.loyaltyWalletText} uppercase`}>Wallet: ₹{numberFormat(selectedCustomer.walletBalance)}</span>
                    )}
                  </div>

                  {flags.loyalty && Number(selectedCustomer.loyaltyPoints) >= (userData?.loyaltySettings?.redemptionThreshold || 100) && (
                    <button
                      onClick={() => { setRedeemPoints(!redeemPoints); beep(); }}
                      className={`w-full py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                        redeemPoints
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                        : "bg-white text-amber-600 border-amber-200 hover:bg-amber-50"
                      }`}
                    >
                      {redeemPoints ? "Redemption Applied" : "Redeem Points Now"}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="p-3">
              <div className={`${theme.amountCard} rounded-xl p-3.5 text-white w-full overflow-x-auto`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`${theme.amountLabel} text-xs font-semibold uppercase tracking-wider`}>Amount Payable</span>
                  <div className="flex items-center gap-1 bg-white/15 px-1.5 py-0.5 rounded-full">
                    <Hash size={8} />
                    <span className="text-[9px] font-medium">{cart.length} items</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-0.5 min-w-0">
                  <span className="text-sm font-light opacity-80 whitespace-nowrap">₹</span>
                  <span className="text-2xl font-extrabold tracking-tight whitespace-nowrap">
                    {displayTotal > 0 ? numberFormat(displayTotal) : "0.00"}
                  </span>
                </div>
                {currentGrandTotal > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/20 flex gap-4">
                    <div>
                      <p className={`${theme.amountSubLabel} text-[10px] uppercase tracking-wider`}>Excl. Tax</p>
                      <p className="text-white font-semibold text-sm">{priceFormat(currentSubtotal)}</p>
                    </div>
                    <div>
                      <p className={`${theme.amountSubLabel} text-[10px] uppercase tracking-wider`}>GST</p>
                      <p className="text-white font-semibold text-sm">{priceFormat(currentTotalGst)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-3 pb-3">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                <Tag size={10} /> Add Discount
              </label>
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.discountIcon} text-sm font-bold`}>₹</span>
                <input
                  type="number"
                  value={discount > 0 ? discount : ""}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="Discount Amount"
                  className={`w-full h-10 pl-8 pr-3 text-[11px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${theme.discountFocus} transition-all font-semibold`}
                />
              </div>
            </div>

            <div className="px-3 pb-3">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                <CreditCard size={10} /> Payment Method
              </label>
              {/* One compact row so the whole cash-flow panel fits without scrolling. */}
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${paymentMethods.length}, minmax(0, 1fr))` }}>
                {paymentMethods.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setPaymentMethod(m.key)}
                    className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg border-2 transition-all duration-200 ${paymentMethod === m.key
                      ? (m.key === "cash" ? `${theme.paymentActiveCash} shadow-sm` : `${m.active} shadow-sm`)
                      : `bg-white border-gray-200 text-gray-400 ${theme.paymentInactiveHover}`
                      }`}
                  >
                    {m.icon}
                    <span className="text-[11px] font-semibold leading-tight">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === "cash" && (
              <div className="px-3 pb-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                  <IndianRupee size={10} /> Cash Received
                </label>
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white text-sm font-bold">₹</span>
                  <input
                    value={cash > 0 ? cash.toLocaleString("en-IN") : ""}
                    onChange={(e) => updateCashInput(e.target.value)}
                    type="text"
                    placeholder="0.00"
                    className={`w-full h-11 pl-8 pr-3 text-right text-base font-bold ${theme.cashInputBg} text-white caret-white placeholder-white/70 border rounded-lg focus:outline-none focus:ring-2 transition-all`}
                  />
                </div>

                {(cash > 0 || currentGrandTotal > 0) && (
                  <div className={`mt-2 p-3 rounded-lg border transition-all text-white ${change >= 0 ? "bg-emerald-500 border-emerald-500" : "bg-red-500 border-red-500"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                          <CheckCircle size={12} className="text-white" />
                        </div>
                        <span className="text-sm font-semibold">
                          {change >= 0 ? "Change" : "Due"}
                        </span>
                      </div>
                      <span className="text-base font-extrabold">
                        {priceFormat(Math.abs(change))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === "upi" && (
              <div className="px-3 pb-3">
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Smartphone size={12} className="text-purple-500" />
                    <span className="text-[11px] font-semibold text-purple-700">UPI Payment</span>
                  </div>
                  <p className="text-[11px] text-purple-500">{priceFormat(currentGrandTotal)} via UPI</p>
                </div>
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="px-3 pb-3">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CreditCard size={12} className="text-blue-500" />
                    <span className="text-[11px] font-semibold text-blue-700">Card Payment</span>
                  </div>
                  <p className="text-[11px] text-blue-500">{priceFormat(currentGrandTotal)} to card</p>
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-gray-100 bg-white flex-shrink-0 space-y-2">
            {cart.length > 0 && (
              <button
                onClick={clear}
                className="w-full h-9 rounded-lg flex items-center justify-center gap-1.5 text-sm font-semibold text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-all"
              >
                <Trash2 size={12} />
                Clear All
              </button>
            )}

            <button
              onClick={handleCompleteSaleClick}
              disabled={!submitable()}
              className={`w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all duration-300 ${submitable()
                ? `${theme.completeSaleBtn} text-white active:scale-[0.98]`
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
            >
              {getPaymentIcon()}
              <span>Complete Sale</span>
              {cart.length > 0 && (
                <>
                  <ChevronRight size={12} className="opacity-60" />
                  <span className="bg-white/20 px-2 py-0.5 rounded-md text-xs">
                    {priceFormat(displayTotal)}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ CUSTOMER FORM MODAL ═══════════ */}
      {showCustomerForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-modal-in">
            <div className={`${theme.modalHeaderBg} px-5 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <User className="text-white" size={14} />
                </div>
                <div>
                  <h2 className="text-[13px] font-bold text-white">Customer Details</h2>
                  <p className={`${theme.modalSubtext} text-[11px]`}>Add billing information</p>
                </div>
              </div>
              <button onClick={() => setShowCustomerForm(false)} className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                <X size={12} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {[
                { name: "name", label: "Name", icon: <User size={12} />, placeholder: "Customer name", required: true },
                { name: "phone", label: "Phone", icon: <Phone size={12} />, placeholder: "Phone number", required: true },
                { name: "location", label: "Location", icon: <MapPin size={12} />, placeholder: "City / Area" },
                { name: "gstin", label: "GSTIN", icon: <FileText size={12} />, placeholder: "22AAAAA0000A1Z5", extra: "uppercase" },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    {f.label} {f.required && <span className="text-red-400">*</span>}
                  </label>
                  <div className="relative">
                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.modalFieldIcon}`}>{f.icon}</span>
                    <input
                      type="text"
                      name={f.name}
                      value={customerForm[f.name]}
                      onChange={handleCustomerChange}
                      className={`w-full h-9 pl-8 pr-3 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${theme.modalFieldFocus} transition-all ${f.extra || ""}`}
                      placeholder={f.placeholder}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 px-4 pb-4">
              <button onClick={() => setShowCustomerForm(false)} className="flex-1 h-9 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 text-[11px] font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleCustomerSubmit} className={`flex-1 h-9 rounded-lg ${theme.modalContinueBtn} text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1`}>
                Continue <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ RECEIPT MODAL ═══════════ */}
      {isShowModalReceipt && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-[95vw] h-[95vh] flex flex-col overflow-hidden animate-modal-in">
            <div className={`flex items-center justify-between px-4 py-2.5 border-b ${theme.receiptHeaderBorder} flex-shrink-0 bg-white`}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg ${theme.receiptIconBg} flex items-center justify-center`}>
                  <Receipt size={13} className={theme.receiptIconColor} />
                </div>
                <h2 className="text-[11px] font-bold text-gray-800">Receipt Preview</h2>
              </div>
              <button onClick={closeModalReceipt} className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                <X size={12} />
              </button>
            </div>

            <div className={`flex items-center justify-between px-4 py-2 ${theme.formatBarBg} border-b flex-shrink-0`}>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Printer size={10} /> Format
              </span>
              <select value={printerFormat} onChange={(e) => setPrinterFormat(e.target.value)} className={`text-[11px] border rounded-md focus:ring-2 px-2 py-1 bg-white ${theme.formatSelect}`}>
                <option value="A4">A4</option>
                <option value="A4 GST Invoice">A4 GST Invoice</option>
                <option value="A5">A5</option>
                <option value="A5 GST Invoice">A5 GST Invoice</option>
                <option value="Thermal 80mm">Thermal 80mm</option>
                <option value="Thermal 58mm">Thermal 58mm</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-100 p-8 flex justify-center min-h-[400px]">
              <div
                id="receipt-content"
                ref={receiptContentRef}
                className="bg-white shadow-2xl origin-top transition-all duration-300"
                style={{
                  width: (printerFormat.toLowerCase().includes('80mm')) ? '80mm' :
                    (printerFormat.toLowerCase().includes('58mm')) ? '58mm' :
                      (printerFormat.toLowerCase().includes('a5')) ? '148mm' : '210mm',
                  minHeight: (printerFormat.toLowerCase().includes('thermal')) ? 'auto' :
                    (printerFormat.toLowerCase().includes('a5')) ? '210mm' : '297mm',
                  transform: 'scale(0.85)',
                  marginBottom: '-10%'
                }}
              >
                {renderReceiptContent()}
              </div>
            </div>

            <div className={`border-t ${theme.receiptFooterBorder} p-3 flex flex-wrap gap-1.5 flex-shrink-0 bg-white print:hidden`}>
              {canWhatsappBill && (
                <label className="w-full flex items-center gap-2 px-1 pb-1 text-[11px] font-medium text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-green-600"
                    checked={sendWhatsappBill}
                    onChange={(e) => setSendWhatsappBill(e.target.checked)}
                  />
                  {customerForm.phone
                    ? `Send bill ${billViaText ? "details" : "PDF"} on WhatsApp to ${customerForm.phone}`
                    : "Send bill on WhatsApp (enter customer phone)"}
                </label>
              )}
              <button onClick={handleDownloadPdf} className="flex-1 min-w-[100px] h-9 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
                <Download size={12} /> PDF
              </button>
              <button onClick={handlePrint} className={`flex-1 min-w-[100px] h-9 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold bg-white border transition-all ${theme.printBtn}`}>
                <Printer size={12} /> Print
              </button>
              <button onClick={handleFinalize} disabled={finalizing} className={`disabled:opacity-60 disabled:cursor-not-allowed flex-1 min-w-[120px] h-9 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold text-white transition-all ${theme.finalizeBtn}`}>
                <CheckCircle size={12} /> {finalizing ? "Saving..." : "Finalize"}
              </button>
            </div>
          </div>
        </div>
      )}


      <div ref={printAreaRef} id="print-area" className="hidden"></div>

      <style jsx="true" global="true">{`
    @keyframes modal-in {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .animate-modal-in { animation: modal-in 0.25s ease-out; }

    .receipt-thermal-80 {
      width: 80mm; padding: 4mm;
      font-family: inherit; font-size: 10pt;
    }
    .receipt-thermal-58 {
      width: 58mm; padding: 2mm;
      font-family: inherit; font-size: 8pt;
    }
    .receipt-a4 {
      width: 210mm; min-height: 297mm;
      padding: 15mm; font-size: 11pt;
    }
    .receipt-a5 {
      width: 148mm; min-height: 210mm;
      padding: 10mm; font-size: 9pt;
    }
    .receipt-dotmatrix {
      width: 210mm; padding: 10mm;
      font-family: "Courier New", Courier, monospace;
      font-size: 10pt; line-height: 1.2;
    }

    @media print {
      @page { margin: 0; }
      body * { visibility: hidden; }
      #print-area, #print-area * { visibility: visible; }
      #print-area {
        display: block !important;
        position: absolute;
        left: 0; top: 0;
        width: 100%; height: 100%;
        margin: 0; padding: 0;
        background: #fff !important;
        z-index: 9999;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color: #000;
      }
      .hide-print { display: none !important; }
      .print\\:hidden { display: none !important; }
    }

    .overflow-y-auto::-webkit-scrollbar {
      width: 3px;
    }
    .overflow-y-auto::-webkit-scrollbar-track {
      background: transparent;
    }
    .overflow-y-auto::-webkit-scrollbar-thumb {
      background: #e5e7eb;
      border-radius: 999px;
    }
    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
      background: #d1d5db;
    }
  `}</style>
    </BillingLayout>
  );
};

export default IndustryBilling;
