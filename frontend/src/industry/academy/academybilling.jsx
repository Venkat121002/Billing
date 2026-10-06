
import React, { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { previewInvoiceNumber } from "../../utils/invoiceNumber";
import { printReceipt } from "../../utils/printReceipt";
import GstInvoice from "../../components/Billing/GstInvoice";
import ThermalReceipt from "../../components/Billing/ThermalReceipt";
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
  Hash,
  RotateCcw,
  ChevronRight,
  Calendar,
} from "lucide-react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import { useAuth } from "../../contexts/AuthContext";
import _ from "lodash";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

const AcademyBilling = () => {
  // =========================
  // BARCODE STATE
  // =========================
  const [barcodeInput, setBarcodeInput] = useState("");
  // =========================
  // BARCODE SCAN HANDLER
  // =========================
  const handleBarcodeScan = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const scanned = barcodeInput.trim();
      if (!scanned) return;

      const product = productsToDisplay?.find(
        (p) =>
          (p.barcode && p.barcode === scanned) ||
          (p.sku && p.sku === scanned)
      );

      if (product) {
        addToCart(product);
        beep(); // using your existing sound
      } else {
        alert("Product not found!");
      }

      setBarcodeInput("");
    }
  };

  const location = useLocation();
  const { currentUser, updateProfile, hasCapability } = useAuth();
  const canWhatsappBill = hasCapability("whatsappInvoices");
  // How bills go out on WhatsApp, set by the super admin: "pdf" (receipt attached) or "text".
  const billViaText = currentUser?.Tenant?.bill_delivery_mode === "text";
  const [sendWhatsappBill, setSendWhatsappBill] = useState(true);
  const userData = currentUser;

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);


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
  const [discount, setDiscount] = useState(0); // Added discount state
  const [change, setChange] = useState(0);
  const [isShowModalReceipt, setIsShowModalReceipt] = useState(false);
  const [receiptNo, setReceiptNo] = useState(null);
  const [receiptDate, setReceiptDate] = useState(null);
  const [filterCategory, setFilterCategory] = useState("All");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [categories, setCategories] = useState([]);
  const [isDueBill, setIsDueBill] = useState(false);
  const [printerFormat, setPrinterFormat] = useState(currentUser?.Tenant?.printer_format || "A4");
  const [termDuration, setTermDuration] = useState("Monthly");
  const [creditPaymentData, setCreditPaymentData] = useState(null);

  // Complete literal Tailwind strings per slot, per payment method — Tailwind's
  // JIT content scanner only picks up classes it can see verbatim in source, so
  // these must never be built from `${themeColor}`-style template interpolation
  // (that was the previous approach here and silently produced unstyled elements
  // in the production build for every payment method except whichever raw color
  // string happened to appear literally elsewhere in the file).
  const themeStyles = {
    cash: {
      card: "bg-gradient-to-br from-green-700 to-emerald-700",
      text100: "text-green-100", text200: "text-green-200", icon400: "text-green-400",
      ring400: "focus:ring-green-400", cashInput: "bg-green-600 border-green-600 focus:ring-green-300/40",
      completeSaleShadow: "shadow-green-200/50", ringBorder300: "focus:ring-green-300 focus:border-green-300",
      gradientBtn: "bg-gradient-to-r from-green-700 to-emerald-700 hover:from-green-800 hover:to-emerald-800 shadow-md shadow-green-200/50",
      border100: "border-green-100", bg100: "bg-green-100", text600: "text-green-600",
      bg50half: "bg-green-50/50", border200: "border-green-200", ring300: "focus:ring-green-300",
      printBtn: "border-green-200 text-green-600 hover:bg-green-50",
    },
    card: {
      card: "bg-gradient-to-br from-green-700 to-emerald-700",
      text100: "text-green-100", text200: "text-green-200", icon400: "text-green-400",
      ring400: "focus:ring-green-400", cashInput: "bg-green-600 border-green-600 focus:ring-green-300/40",
      completeSaleShadow: "shadow-green-200/50", ringBorder300: "focus:ring-green-300 focus:border-green-300",
      gradientBtn: "bg-gradient-to-r from-green-700 to-emerald-700 hover:from-green-800 hover:to-emerald-800 shadow-md shadow-green-200/50",
      border100: "border-green-100", bg100: "bg-green-100", text600: "text-green-600",
      bg50half: "bg-green-50/50", border200: "border-green-200", ring300: "focus:ring-green-300",
      printBtn: "border-green-200 text-green-600 hover:bg-green-50",
    },
    upi: {
      card: "bg-gradient-to-br from-emerald-700 to-teal-700",
      text100: "text-emerald-100", text200: "text-emerald-200", icon400: "text-emerald-400",
      ring400: "focus:ring-emerald-400", cashInput: "bg-emerald-600 border-emerald-600 focus:ring-emerald-300/40",
      completeSaleShadow: "shadow-emerald-200/50", ringBorder300: "focus:ring-emerald-300 focus:border-emerald-300",
      gradientBtn: "bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 shadow-md shadow-emerald-200/50",
      border100: "border-emerald-100", bg100: "bg-emerald-100", text600: "text-emerald-600",
      bg50half: "bg-emerald-50/50", border200: "border-emerald-200", ring300: "focus:ring-emerald-300",
      printBtn: "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
    },
    term: {
      card: "bg-gradient-to-br from-orange-700 to-rose-700",
      text100: "text-orange-100", text200: "text-orange-200", icon400: "text-orange-400",
      ring400: "focus:ring-orange-400", cashInput: "bg-orange-600 border-orange-600 focus:ring-orange-300/40",
      completeSaleShadow: "shadow-orange-200/50", ringBorder300: "focus:ring-orange-300 focus:border-orange-300",
      gradientBtn: "bg-gradient-to-r from-orange-700 to-rose-700 hover:from-orange-800 hover:to-rose-800 shadow-md shadow-orange-200/50",
      border100: "border-orange-100", bg100: "bg-orange-100", text600: "text-orange-600",
      bg50half: "bg-orange-50/50", border200: "border-orange-200", ring300: "focus:ring-orange-300",
      printBtn: "border-orange-200 text-orange-600 hover:bg-orange-50",
    },
  };

  const activeTheme = themeStyles[paymentMethod] || themeStyles.cash;


  const receiptContentRef = useRef(null);
  const printAreaRef = useRef(null);

  useEffect(() => { localStorage.setItem("pos-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem("pos-cash", cash.toString()); }, [cash]);
  useEffect(() => { updateChange(); }, [cart, cash, discount]);

  // Handle Credit Payment Redirect
  useEffect(() => {
    if (location.state?.creditPayment) {
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
    setShowCustomerForm(true);
  };
  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomerForm({ ...customerForm, [name]: value });
  };
  const handleCustomerSubmit = () => {
    // if (!customerForm.name || !customerForm.phone) {
    //   alert("Please fill at least Name and Phone");
    //   return;
    // }
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

  const filteredProducts = () => {
    const lowerKeyword = keyword.toLowerCase();
    return productsToDisplay.filter((p) => {
      const matchesKeyword = !keyword || p.name.toLowerCase().includes(lowerKeyword);
      const matchesCategory = filterCategory === "All" || p.category === filterCategory;
      return matchesKeyword && matchesCategory;
    });
  };

  const beep = () => playSound("/sound/beep-29.mp3");

  const addToCart = (product) => {
    const validSku = product.sku || product.id;
    const validPrice = product.salePrice || product.salesPrice || product.price || 0;
    const validGst = product.salesGst || product.gstRate || product.gst || 0;
    const existingItem = _.find(cart, { productSku: validSku });

    const currentQtyInCart = existingItem ? existingItem.qty : 0;
    const availableStock = Number(product.quantity || 0);

    if (currentQtyInCart + 1 > availableStock) {
      alert(`Insufficient stock! Only ${availableStock} available.`);
      return;
    }

    if (!existingItem) {
      setCart([...cart, { productId: product.id, productSku: validSku, image: product.imageUrl || product.image, name: product.name, price: validPrice, category: product.category, qty: 1, gstRate: validGst, hsn: product.hsnSac || product.hsn || "", batch: product.batchNumber || product.batchNo || "", expiryDate: product.expiryDate || "" }]);
    } else {
      setCart(_.map(cart, (item) => item.productSku === validSku ? { ...item, qty: item.qty + 1 } : item));
    }
    beep();
    updateChange();
  };

  const addQty = (itemSku, qtyChange) => {
    const product = products.find(p => (p.sku || p.id) === itemSku);
    const availableStock = Number(product?.quantity || 0);

    const updatedCart = _.map(cart, (cartItem) => {
      if (cartItem.productSku === itemSku) {
        if (qtyChange > 0 && (cartItem.qty + qtyChange > availableStock)) {
          alert(`Insufficient stock! Only ${availableStock} available.`);
          return cartItem;
        }
        const newQty = cartItem.qty + qtyChange;
        return newQty > 0 ? { ...cartItem, qty: newQty } : null;
      }
      return cartItem;
    });
    setCart(_.compact(updatedCart));
    const updatedItem = cart.find((c) => c.productSku === itemSku);
    // Beep logic slightly adjusted as updatedItem might be from old cart state before compact
    // but effectively if we return same cartItem above, no change.
    // Simple check:
    if (updatedItem && updatedItem.qty + qtyChange <= 0) clearSound();
    else beep();
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
    setCash(isNaN(numericValue) ? 0 : numericValue);
  };

  const getTotals = () => {
    let subtotalAmt = 0;
    let totalGst = 0;
    let grandTotal = 0;

    const isInclusive = userData?.Tenant?.sales_tax_type === "inclusive";

    cart.forEach((item) => {
      const price = Number(item.price);
      const qty = Number(item.qty);
      const gstRate = Number(item.gstRate || 0);
      const lineTotal = price * qty;

      if (isInclusive) {
        // Price already includes Tax
        const lineGst = lineTotal - (lineTotal / (1 + gstRate / 100));
        const lineSubtotal = lineTotal - lineGst;

        totalGst += lineGst;
        subtotalAmt += lineSubtotal;
        grandTotal += lineTotal;
      } else {
        // Price + Tax (Exclusive)
        const lineGst = (lineTotal * gstRate) / 100;

        totalGst += lineGst;
        subtotalAmt += lineTotal;
        grandTotal += (lineTotal + lineGst);
      }
    });

    // Apply overall discount to the final grand total
    grandTotal = Math.max(0, grandTotal - discount);

    // Round to 2 decimal places
    return {
      subtotal: Math.round(subtotalAmt * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      discount
    };
  };

  const getTotalPrice = () => getTotals().grandTotal;
  const submitable = () => cart.length > 0;
  const isAmountDue = paymentMethod === "cash" && change < 0;

  const submit = async (dueBill = false) => {
    if (!currentUser) { alert("Error: Not logged in."); return; }
    const time = new Date();
    // Likely number; the server assigns the real one when the bill is saved.
    setReceiptNo(previewInvoiceNumber(userData));
    setReceiptDate(dateFormat(time));
    setIsDueBill(dueBill);
    setIsShowModalReceipt(true);
  };

  const closeModalReceipt = () => { setIsShowModalReceipt(false); setIsDueBill(false); };

  const dateFormat = (date) => new Intl.DateTimeFormat("en-IN", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true }).format(date);
  const numberFormat = (number) => (number || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const priceFormat = (number) => `₹${numberFormat(number)}`;

  const clear = () => { setCash(0); setDiscount(0); setCart([]); setPaymentMethod("cash"); updateChange(); clearSound(); };
  const clearSound = () => playSound("/sound/button-21.mp3");
  const playSound = (src) => { const sound = new Audio(src); sound.play().catch(() => { }); sound.onended = () => sound.remove(); };

  // compact: JPEG instead of PNG (~10x smaller), used for the WhatsApp copy.
  const buildReceiptPdf = async ({ compact = false } = {}) => {
    if (!receiptContentRef.current) return null;
    const formatStr = printerFormat.toLowerCase();
    let format = { width: 70, height: null };

    if (formatStr.includes('80mm')) format.width = 80;
    else if (formatStr.includes('58mm')) format.width = 58;
    else if (formatStr.includes('thermal')) format.width = 72; // Default for generic thermal

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
      } else {
        const isA5Pdf = formatStr.includes('a5');
        const [pageW, pageH] = isA5Pdf ? [148, 210] : [210, 297];
        pdf = new jsPDF('p', 'mm', isA5Pdf ? 'a5' : 'a4');
        const imgH = pageW * ratio;
        // Long bills continue on extra pages: the same image, shifted up one page at a time.
        for (let offset = 0; offset < imgH - 1; offset += pageH) {
          if (offset > 0) pdf.addPage();
          pdf.addImage(imgData, imgType, 0, -offset, pageW, imgH);
        }
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
    printReceipt({ format: printerFormat, contentEl: receiptContentRef.current, printAreaEl: printAreaRef.current, title: receiptNo || "Receipt" });
  };

  const storeBillingCustomer = async (customer) => {
    if (!currentUser) return null;
    try {
      const token = sessionStorage.getItem("token");
      if (!token) return null;

      const { grandTotal } = getTotals();

      const payload = {
        name: customer.name,
        mobile: customer.phone,
        address: customer.location || "",
        gstin: customer.gstin || "",
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

      const res = await axios.post(`${API_URL}/customers`, payload, {
        headers: { 'x-auth-token': token }
      });

      return res.data.id;
    } catch (err) {
      console.error("Error storing customer via API:", err);
      // Fallback: If API fails, we might still want to proceed with the sale locally or alert?
      // For now, return null so sale continues but maybe without customer link if it fails hard.
      // But user likely wants it to be robust.
      // I'll Log and return null.
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
      const isDueSale = dueAmount > 0;
      const saleData = {
        receiptNo: receiptNo || "N/A", receiptDate: receiptDate || new Date().toISOString(), customerId: customerId || null,
        customerName: customerForm.name || "", customerPhone: customerForm.phone || "",
        items: cart.map(item => ({ sku: item.productSku || "NA", name: item.name || "Unknown", price: Number(item.price || 0), qty: Number(item.qty || 1), category: item.category || "Uncategorized", gstRate: Number(item.gstRate || 0), hsn: item.hsn || "" })),
        totals: getTotals(),
        paymentMethod: paymentMethod === "term" ? `Term - ${termDuration}` : paymentMethod,
        printFormat: printerFormat, // names the WhatsApp PDF (Bill / Tax_Invoice)
        discount: Number(discount || 0), soldBy: currentUser.email || currentUser.uid, createdAt: new Date().toISOString(),
        dueBill: isDueSale, dueAmount: isDueSale ? dueAmount : 0
      };

      const config = { headers: { 'x-auth-token': token } };

      // 1. Create Bill / Sale Record
      let savedBillId = null;
      let finalReceiptNo = receiptNo;
      try {
        const billRes = await axios.post(`${API_URL}/billing/bills`, saleData, config);
        savedBillId = billRes.data?.id || null;
        finalReceiptNo = billRes.data?.receiptNo || receiptNo;
      } catch (err) {
        console.error("Error creating bill via API:", err);
        alert(`The bill was not saved, so stock and records were not changed. Please try again.\n${err.response?.data?.msg || err.message}`);
        return;
      }
      // Re-render the receipt with the real number before it is printed or
      // turned into the WhatsApp PDF (both copy the rendered receipt).
      flushSync(() => setReceiptNo(finalReceiptNo));

      if (savedBillId && canWhatsappBill && sendWhatsappBill && customerForm.phone) {
        await sendBillOnWhatsapp(savedBillId, token);
      }

      // 1.5 Update Credit Record if this is a Credit Repayment
      if (creditPaymentData) {
        try {
          const creditId = creditPaymentData.id;
          const paymentAmount = getTotals().grandTotal;
         
          // Fetch current credit data to ensure we have latest state
          const creditRes = await axios.get(`${API_URL}/credit`, config);
          const currentCredit = creditRes.data.find(c => c.id === creditId);

          if (currentCredit) {
            const newBalance = Math.max(0, currentCredit.balance - paymentAmount);
            const newCreditAmt = (currentCredit.credit || 0) + paymentAmount;

            let updatedPayments = currentCredit.payments;

            // Initialize payments array if missing (for legacy records)
            if (!updatedPayments || !Array.isArray(updatedPayments) || updatedPayments.length === 0) {
              const dueSession = Number(currentCredit.dueSession) || 1;
              const total = Number(currentCredit.total) || 0;
              const perSessionDue = total / dueSession;
              let oldCredit = Number(currentCredit.credit) || 0;
              let runningBalance = total;

              updatedPayments = Array.from({ length: dueSession }).map((_, i) => {
                let paid = 0;
                if (oldCredit > 0) {
                  paid = Math.min(oldCredit, perSessionDue);
                }
                const sessionBalance = perSessionDue - paid;
                runningBalance -= paid;
                oldCredit -= paid;
                return {
                  session: i + 1,
                  due: perSessionDue,
                  paid: paid,
                  balance: sessionBalance,
                  currentBalance: runningBalance,
                  date: (i === 0 && paid > 0) ? currentCredit.date : null
                };
              });
            }

            // Apply the new payment to the schedule sequentially
            if (updatedPayments.length > 0) {
              let remainingToPay = paymentAmount;
              const paymentDate = receiptDate || new Date().toISOString();

              updatedPayments = updatedPayments.map(p => {
                if (remainingToPay <= 0) return p;
                const sessionDue = Number(p.due) || 0;
                const sessionPaid = Number(p.paid) || 0;
                const sessionRemaining = sessionDue - sessionPaid;
                if (sessionRemaining > 0) {
                  const payForThisSession = Math.min(remainingToPay, sessionRemaining);
                  const newPaid = sessionPaid + payForThisSession;
                  const newSessionBalance = sessionDue - newPaid;
                  remainingToPay -= payForThisSession;
                  return { ...p, paid: newPaid, balance: newSessionBalance, date: paymentDate };
                }
                return p;
              });

              // Update running balances for all sessions
              let runningTotal = Number(currentCredit.total);
              updatedPayments.forEach(p => { runningTotal -= (Number(p.paid) || 0); p.currentBalance = runningTotal; });
            }
           
            const updatePayload = {
              balance: newBalance,
              totalbalance: newBalance, // Sync totalbalance
              credit: newCreditAmt,
              payments: updatedPayments
            };

            await axios.put(`${API_URL}/credit/${creditId}`, updatePayload, config);
            console.log("Credit balance updated successfully");
          }
        } catch (err) {
          console.error("Error updating credit balance:", err);
          alert("Sale recorded, but failed to update credit balance automatically. Please check Records.");
        }
      }

      // Create credit record if there is a due amount
      if (isDueSale) {
        let dueSession = 1;
        let payments = [];

        if (paymentMethod === 'term') {
            const divisors = { "Monthly": 12, "Quarterly": 4, "Half-Yearly": 2, "Yearly": 1 };
            dueSession = divisors[termDuration] || 1;
            const perSessionDue = grandTotal / dueSession;

            payments = Array.from({ length: dueSession }).map((_, i) => ({
                session: i + 1,
                due: perSessionDue,
                paid: i === 0 ? cash : 0,
                balance: i === 0 ? grandTotal - cash : 0,
                currentBalance: i === 0 ? grandTotal - cash : 0,
            }));
        } else {
            payments = [{ session: 1, due: grandTotal, paid: cash, balance: dueAmount, currentBalance: dueAmount }];
        }

        const creditData = {
            name: customerForm.name, phone: customerForm.phone, address: customerForm.location,
            date: new Date().toISOString(), total: grandTotal, credit: cash, balance: dueAmount, totalbalance: dueAmount,
            products: cart.map(item => ({ productId: item.productId, description: item.name, quantity: item.qty, price: item.price, gst: item.gstRate })),
            dueSession: paymentMethod === 'term' ? dueSession : 1, payments, customerId, createdBy: currentUser.uid || currentUser.userId,
        };
        try {
            await axios.post(`${API_URL}/credit`, creditData, config);
        } catch (err) {
            console.error("Error creating credit record:", err);
            alert("Failed to create credit record. The sale was saved, but the due amount was not added to the credit list.");
        }
      }

      // 2. Update Stock for each item
      const stockUpdates = cart.map(async (item) => {
        if (item.productId) {
          try {
            const product = products.find(p => p.id === item.productId);
            if (product) {
              const currentQty = Number(product.quantity || 0);
              const newQty = Math.max(currentQty - item.qty, 0);
              console.log(`Updating stock for ${item.name}: ${currentQty} -> ${newQty}`);
              await axios.put(`${API_URL}/products/${item.productId}`, { quantity: newQty }, config);
            }
          } catch (err) {
            console.error(`Failed to update stock for ${item.name}:`, err);
          }
        }
      });

      await Promise.all(stockUpdates);

      if (customerId && userData?.loyaltySettings?.enabled) await processLoyaltyPoints(customerId, getTotals().grandTotal);

      // Settings → Printing → "Print automatically on Finalize" (on unless turned off).
      if (userData?.Tenant?.print_on_finalize !== false) {
        printReceipt({ format: printerFormat, contentEl: receiptContentRef.current, printAreaEl: printAreaRef.current, title: finalReceiptNo });
      }

      setIsShowModalReceipt(false);
      setIsDueBill(false);
      clear();

      // Reload to refresh stock
      window.location.reload();

      // If it was a credit payment, go back to records after reload/print
      if (creditPaymentData) {
         // window.location.href = '/record'; // Optional: Redirect back
      }

    } catch (error) { console.error("Sale error:", error); alert("Error saving sale. See console."); }
  };

  const processLoyaltyPoints = async (customerId, totalAmount) => {
    const ls = userData?.loyaltySettings;
    if (!ls?.enabled) return;
    try {
      const spp = Number(ls.spendPerPoint) || 100;
      const pe = Math.floor(totalAmount / spp);
      if (pe <= 0) return;
      const token = sessionStorage.getItem("token");
      const config = { headers: { "x-auth-token": token } };
      const custRes = await axios.get(`${API_URL}/customers`, config);
      const customer = (custRes.data || []).find((c) => c.id === customerId);
      if (!customer) return;
      let np = Number(customer.loyaltyPoints || 0) + pe;
      let nw = Number(customer.walletBalance || 0);
      const th = Number(ls.redemptionThreshold) || 100;
      const ra = Number(ls.redemptionAmount) || 10;
      if (np >= th) { const m = Math.floor(np / th); nw += m * ra; np -= m * th; }
      await axios.put(`${API_URL}/customers/${customerId}`, { loyaltyPoints: np, walletBalance: nw }, config);
    } catch (err) { console.error("Loyalty error:", err); }
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
    const isThermalFormat = formatStr.includes("thermal") || formatStr.includes("80mm") || formatStr.includes("58mm");
    const totals = getTotals();
    const manualDiscount = Number(discount) || 0;
    const business = { name: businessName, ...businessAddress, phone: businessPhone, email: businessEmail, gstin: businessGstin };
    const inclusive = userData?.Tenant?.sales_tax_type === "inclusive";

    // "Thermal 80mm" / "Thermal 58mm"
    if (isThermalFormat) {
      return (
        <ThermalReceipt
          width={formatStr.includes("58mm") ? "58" : "80"}
          title={"FEE RECEIPT"}
          business={business}
          customer={customerForm}
          customerLabel={"Student"}
          items={cart}
          receiptNo={receiptNo}
          receiptDate={receiptDate}
          inclusive={inclusive}
          subtotal={currentSubtotal}
          totalGst={currentTotalGst}
          discount={manualDiscount}
          loyaltyDiscount={Math.max((totals.discount || 0) - manualDiscount, 0)}
          grandTotal={currentGrandTotal}
          paymentMethod={paymentMethod}
          cash={cash}
          change={change}
          isDue={isDueBill}
        />
      );
    }

    // "A4" / "A5" → full-page receipt; "A4 GST Invoice" / "A5 GST Invoice" → GST invoice
    const isGstFormat = formatStr.includes("gst");
    return (
      <GstInvoice
        variant={isGstFormat ? "gst" : "receipt"}
        title={isGstFormat ? undefined : "FEE RECEIPT"}
        customerLabel={"Student"}
        size={formatStr.includes("a5") ? "a5" : "a4"}
        business={business}
        customer={customerForm}
        items={cart}
        invoiceNo={receiptNo}
        invoiceDate={new Date()}
        inclusive={inclusive}
        discount={totals.discount || 0}
        grandTotal={currentGrandTotal}
        paymentLabel={paymentMethod ? paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1) : ""}
        paid={cash}
        isDue={isDueBill || (paymentMethod === "cash" && Number(cash) < currentGrandTotal)}
        terms={userData?.Tenant?.invoice_terms}
        showBatch={false}
        amountInWords={numberToWord}
      />
    );
  };

  const getPaymentIcon = () => {
    switch (paymentMethod) {
      case "card": return <CreditCard size={18} />;
      case "upi": return <Smartphone size={18} />;
      case "term": return <Calendar size={18} />;
      default: return <IndianRupee size={18} />;
    }
  };

  const { subtotal: currentSubtotal, totalGst: currentTotalGst, grandTotal: currentGrandTotal } = getTotals();

  const displayTotal = paymentMethod === "term"
    ? (termDuration === "Monthly" ? Math.ceil(currentGrandTotal / 12) :
       termDuration === "Quarterly" ? Math.ceil(currentGrandTotal / 4) :
       termDuration === "Half-Yearly" ? Math.ceil(currentGrandTotal / 2 ):
       currentGrandTotal)
    : currentGrandTotal;

  useEffect(() => {
    if (paymentMethod === "term") {
      const divisors = { "Monthly": 12, "Quarterly": 4, "Half-Yearly": 2, "Yearly": 1 };
      const divisor = divisors[termDuration] || 1;
      const termAmount = Math.round((currentGrandTotal / divisor) * 100) / 100;
      setCash(termAmount);
    }
  }, [paymentMethod, termDuration, currentGrandTotal]);

  if (productsLoading && !products) {
    return (
      <BillingLayout hideHeader>
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl bg-white shadow-xl shadow-emerald-100 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
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
          <button onClick={() => window.location.reload()} className="mt-6 flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all font-bold shadow-lg shadow-emerald-100">
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
      <div className="hide-print flex h-screen bg-green-50">

        {/* ═══════════ LEFT PANEL — PRODUCTS ═══════════ */}
        {/* ═══════════ LEFT PANEL — PRODUCTS WITH BARCODE ═══════════ */}
        <div className="flex flex-col w-full lg:w-[35%] h-full border-r border-gray-100 bg-white">

          {/* ── Header ── */}
          <div className="bg-green-50 border-b border-green-100 px-4 py-2.5 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <ScanBarcode size={15} className="text-white" />
              </div>
              <div>
                <h1 className="text-green-700 font-bold text-[13px] tracking-tight">
                  Billing Counter 
                </h1>
                <p className="text-green-600 text-[11px]">
                  {productsToDisplay.length} Products
                </p>
              </div>
            </div>
          </div>

          {/* ── Search + Barcode ── */}
          <div className="p-3 border-b border-gray-100 space-y-2">

            {/* Search */}
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
                className="w-full h-9 pl-8 pr-3 text-[11px] bg-green-50 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            {/* Barcode Input */}
            <div className="relative">
              <ScanBarcode
                className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500"
                size={14}
              />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeScan}
                placeholder="Scan barcode..."
                className="w-full h-9 pl-8 pr-3 text-[11px] bg-green-50 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                autoFocus
              />
            </div>
          </div>

          {/* ── Product List ── */}
          <div className="flex-1 overflow-y-auto">

            {filteredProducts().length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
                No Courses Found
              </div>
            ) : (
              Object.entries(_.groupBy(filteredProducts(), p => p.category || "Uncategorized")).map(([category, items]) => (
                <div key={category} className="mb-2">
                  <div className="bg-gray-50/90 px-4 py-1.5 sticky top-0 z-10 backdrop-blur-sm border-b border-gray-100">
                    <div className="text-[10px] font-bold text-green-700 uppercase tracking-widest flex items-center gap-1.5">
                      <div className="w-1 h-3 bg-green-500 rounded-full"></div>
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
                            ? "bg-green-50/50 border-l-4 border-green-500 shadow-sm"
                            : "hover:bg-gray-50/80"
                          }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-[13px] font-semibold text-gray-700 leading-tight truncate">
                            {product.name}
                          </p>
                          {product.barcode && (
                            <p className="text-[10px] text-green-600 font-medium mt-0.5">
                              #{product.barcode}
                            </p>
                          )}
                        </div>

                        <span className="text-sm font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md flex-shrink-0">
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

          {/* Cart Header */}
          <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingCart size={14} className="text-green-600" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                Cart
                {cartItemCount > 0 && (
                  <span className="bg-green-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
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

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center mb-2.5">
                  <ShoppingCart size={20} className="text-green-200" />
                </div>
                <p className="text-xs text-gray-400 font-medium">No items added</p>
                <p className="text-xs text-gray-300 mt-0.5">Tap products to add</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {cart.map((item, index) => (
                  <div key={item.productSku} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50/60 hover:bg-green-50/40 border border-transparent hover:border-green-100 transition-all">
                    <span className="w-5 h-5 rounded-md bg-green-100/80 text-green-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate leading-tight">{item.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-gray-400">₹</span>
                        <input
                          type="number"
                          value={Math.ceil(item.price)}
                          onChange={(e) => updatePrice(item.productSku, e.target.value)}
                          className="w-20 bg-transparent border-b border-dashed border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:border-green-400 transition-colors"
                        />
                        {item.gstRate > 0 && <span className="text-green-500 text-[10px]">+{item.gstRate}%</span>}
                      </div>
                    </div>
                    <div className="flex items-center bg-white border border-gray-200 rounded-md overflow-hidden flex-shrink-0">
                      <button onClick={() => addQty(item.productSku, -1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Minus size={10} />
                      </button>
                      <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-700 border-x border-gray-200 bg-gray-50/50">
                        {item.qty}
                      </span>
                      <button onClick={() => addQty(item.productSku, 1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                        <Plus size={10} />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-16 text-right flex-shrink-0">
                      ₹{numberFormat(Math.ceil(item.price) * item.qty)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary */}
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
                  <span className="text-lg font-bold text-green-600">{priceFormat(currentGrandTotal)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════ RIGHT PANEL — CASH FLOW (30%) ═══════════ */}
        <div className="hidden lg:flex flex-col w-[30%] h-full bg-white">

          {/* Cash Flow Header */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex-shrink-0 bg-white">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg ${activeTheme.card} flex items-center justify-center shadow-sm`}>
                <Wallet size={14} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Cash Flow</h2>
                <p className="text-xs text-gray-400">Payment & Checkout</p>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Amount Card ── */}
            <div className="p-3">
              <div className={`${activeTheme.card} rounded-2xl p-4 text-white w-full overflow-x-auto shadow-xl shadow-slate-200/50`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`${activeTheme.text100} text-xs font-semibold uppercase tracking-wider`}>Amount Payable</span>
                  <div className="flex items-center gap-1 bg-white/15 px-1.5 py-0.5 rounded-full">
                    <Hash size={8} />
                    <span className="text-[9px] font-medium">{cart.length} items</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-0.5 min-w-0">
                  <span className="text-sm font-light opacity-80 whitespace-nowrap">₹</span>
                  <span className="text-2xl font-extrabold tracking-tight whitespace-nowrap">
                    {displayTotal > 0 ? numberFormat(Math.ceil(displayTotal)) : "0.00"}
                  </span>
                </div>
                {currentGrandTotal > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/20 flex gap-4">
                    <div>
                      <p className={`${activeTheme.text200} text-[10px] uppercase tracking-wider`}>Excl. Tax</p>
                      <p className="text-white font-semibold text-sm">{priceFormat(currentSubtotal)}</p>
                    </div>
                    <div>
                      <p className={`${activeTheme.text200} text-[10px] uppercase tracking-wider`}>GST</p>
                      <p className="text-white font-semibold text-sm">{priceFormat(currentTotalGst)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Discount ── */}
            <div className="px-3 pb-3">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                <Tag size={10} /> Add Discount
              </label>
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${activeTheme.icon400} text-sm font-bold`}>₹</span>
                <input
                  type="number"
                  value={discount > 0 ? discount : ""}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="Discount Amount"
                  className={`w-full h-10 pl-8 pr-3 text-[11px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${activeTheme.ring400} transition-all font-semibold`}
                />
              </div>
            </div>

            {/* ── Payment Method ── */}
            <div className="px-3 pb-3">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                <CreditCard size={10} /> Payment Method
              </label>
              {/* <div className="grid grid-cols-3 gap-1.5"> */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: "cash", label: "Cash", icon: <Banknote size={16} />, active: "bg-green-600 border-green-600 text-white", dot: "bg-white" },
                  { key: "card", label: "Card", icon: <CreditCard size={16} />, active: "bg-green-600 border-green-600 text-white", dot: "bg-white" },
                  { key: "upi", label: "UPI", icon: <Smartphone size={16} />, active: "bg-emerald-600 border-emerald-600 text-white", dot: "bg-white" },
                  { key: "term", label: "Term", icon: <Calendar size={16} />, active: "bg-orange-600 border-orange-600 text-white", dot: "bg-white" },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setPaymentMethod(m.key)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 transition-all duration-200 ${paymentMethod === m.key
                      ? `${m.active} shadow-sm`
                      : "bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    {m.icon}
                    <span className="text-xs font-semibold">{m.label}</span>
                    {paymentMethod === m.key && (
                      <div className={`w-1 h-1 rounded-full ${m.dot}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Cash Received ── */}
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
                    className={`w-full h-11 pl-8 pr-3 text-right text-base font-bold text-white caret-white placeholder-white/70 rounded-lg focus:outline-none focus:ring-2 transition-all border ${activeTheme.cashInput}`}
                  />
                </div>

                {/* Removed quick cash and exact buttons for cleaner layout */}

                {/* Change / Due */}
                {(cash > 0 || currentGrandTotal > 0) && (
                  <div className="mt-2 p-3 rounded-lg border transition-all bg-red-500 border-red-500 text-white">
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
                        {priceFormat(Math.floor(Math.abs(change)))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── UPI Info ── */}
            {paymentMethod === "upi" && (
              <div className="px-3 pb-3">
                <div className="bg-emerald-100/50 rounded-lg p-3 border border-emerald-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Smartphone size={12} className="text-emerald-600" />
                    <span className="text-[11px] font-semibold text-emerald-700">UPI Payment</span>
                  </div>
                  <p className="text-[11px] text-emerald-600 font-medium">{priceFormat(currentGrandTotal)} via UPI</p>
                </div>
              </div>
            )}

            {/* ── Card Info ── */}
            {paymentMethod === "card" && (
              <div className="px-3 pb-3">
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CreditCard size={12} className="text-green-500" />
                    <span className="text-[11px] font-semibold text-green-700">Card Payment</span>
                  </div>
                  <p className="text-[11px] text-green-500">{priceFormat(currentGrandTotal)} to card</p>
                </div>
              </div>
            )}

            {/* ── Term Info ── */}
            {paymentMethod === "term" && (
              <div className="px-3 pb-3">
                <div className="bg-orange-100/50 rounded-lg p-3 border border-orange-200">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar size={12} className="text-orange-600" />
                    <span className="text-[11px] font-semibold text-orange-700">Select Term</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {["Monthly", "Quarterly", "Half-Yearly", "Yearly"].map((term) => (
                      <button key={term} onClick={() => setTermDuration(term)} className={`text-[10px] font-medium py-1.5 rounded-md border transition-all ${termDuration === term ? "bg-orange-600 text-white border-orange-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:bg-orange-100"}`}>
                        {term}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-orange-600 mt-2 font-bold border-t border-orange-200 pt-2">
                    {priceFormat(displayTotal)} - {termDuration} Payment
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom Actions ── */}
          <div className="px-5 py-10 border-t border-gray-100 bg-white flex-shrink-0 space-y-2">
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
                ? `${activeTheme.card} hover:brightness-110 text-white shadow-lg ${activeTheme.completeSaleShadow} active:scale-[0.98]`
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
            >
              {getPaymentIcon()}
              <span>Complete Sale</span>
              {cart.length > 0 && (
                <>
                  <ChevronRight size={12} className="opacity-60" />
                  <span className="bg-white/20 px-2 py-0.5 rounded-md text-xs">
                    {priceFormat(Math.ceil(displayTotal))}
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
            <div className={`${activeTheme.card} px-5 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <User className="text-white" size={14} />
                </div>
                <div>
                  <h2 className="text-[13px] font-bold text-white">Customer Details</h2>
                  <p className={`${activeTheme.text100} text-[11px]`}>Add billing information</p>
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
                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${activeTheme.icon400}`}>{f.icon}</span>
                    <input
                      type="text"
                      name={f.name}
                      value={customerForm[f.name]}
                      onChange={handleCustomerChange}
                      className={`w-full h-9 pl-8 pr-3 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${activeTheme.ringBorder300} transition-all ${f.extra || ""}`}
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
              <button onClick={handleCustomerSubmit} className={`flex-1 h-9 rounded-lg text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${activeTheme.gradientBtn}`}>
                Continue <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ RECEIPT MODAL ═══════════ */}
      {isShowModalReceipt && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl  max-w-3xl w-[95vw] h-[95vh] flex flex-col overflow-hidden animate-modal-in">
            <div className={`flex items-center justify-between px-4 py-2.5 border-b ${activeTheme.border100} flex-shrink-0 bg-white`}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg ${activeTheme.bg100} flex items-center justify-center`}>
                  <Receipt size={13} className={activeTheme.text600} />
                </div>
                <h2 className="text-[11px] font-bold text-gray-800">Receipt Preview</h2>
              </div>
              <button onClick={closeModalReceipt} className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                <X size={12} />
              </button>
            </div>

            <div className={`flex items-center justify-between px-4 py-2 ${activeTheme.bg50half} border-b ${activeTheme.border100} flex-shrink-0`}>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Printer size={10} /> Format
              </span>
              <select value={printerFormat} onChange={(e) => setPrinterFormat(e.target.value)} className={`text-[11px] border ${activeTheme.border200} rounded-md focus:ring-2 ${activeTheme.ring300} px-2 py-1 bg-white`}>
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
                  marginBottom: '-10%' // Compensate for scaled-down height in scroll area
                }}
              >
                {renderReceiptContent()}
              </div>
            </div>

            <div className={`border-t ${activeTheme.border100} p-3 flex flex-wrap gap-1.5 flex-shrink-0 bg-white print:hidden`}>
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
              <button onClick={handlePrint} className={`flex-1 min-w-[100px] h-9 rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold bg-white border transition-all ${activeTheme.printBtn}`}>
                <Printer size={12} /> Print
              </button>
              <button onClick={handleFinalize} disabled={finalizing} className={`disabled:opacity-60 disabled:cursor-not-allowed flex-1 min-w-[120px] h-9 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold text-white transition-all ${activeTheme.gradientBtn}`}>
                <CheckCircle size={12} /> {finalizing ? "Saving..." : "Finalize"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Area */}
      <div ref={printAreaRef} id="print-area" className="hidden"></div>

      <style jsx="true" global="true">{`
    @keyframes modal-in {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .animate-modal-in { animation: modal-in 0.25s ease-out; }

    .receipt-thermal-80 {
      width: 72mm; margin: 0 auto; padding: 3mm 0;
      font-family: inherit; font-size: 10pt;
    }
    .receipt-thermal-58 {
      width: 48mm; margin: 0 auto; padding: 2mm 0;
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


export default AcademyBilling;
