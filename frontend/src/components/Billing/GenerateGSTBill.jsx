import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import API_URL from "../../config/api";

import {
  PlusCircle, Trash2, Printer, Download, Eye, Save,
  Loader2, CircleX, FileText, Search, Building2, User,
  Truck, Receipt, Package, Calculator, StickyNote, RefreshCw,
  ChevronDown, CheckCircle2, Info, Copy, X, 
} from "lucide-react";
import _ from "lodash";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const initialItem = {
  id: _.uniqueId("item_"),
  productSku: "",
  description: "",
  secondaryDescription: "",
  hsnSac: "",
  qty: 1,
  uom: "PC",
  unitPrice: 0,
  discountAmount: 0,
  taxRate: 18,
};

// ✅ CSS class constants moved OUTSIDE the component
const inputClass =
  "block w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 placeholder-gray-300 transition-all duration-200 hover:border-green-300";
const labelClass =
  "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider";
const selectClass =
  "block w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all duration-200 hover:border-green-300 appearance-none cursor-pointer";

// ✅ SectionCard moved OUTSIDE the component
const SectionCard = ({
  id,
  icon: Icon,
  title,
  subtitle,
  children,
  badge,
  expandedSections,
  toggleSection,
}) => (
  <div className="bg-white rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
    <button
      type="button"
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-5 hover:bg-green-50/30 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
          <Icon size={20} className="text-green-700" />
        </div>
        <div className="text-left">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
            {badge}
          </span>
        )}
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform duration-300 ${expandedSections[id] ? "rotate-180" : ""
            }`}
        />
      </div>
    </button>
    <div
      className={`transition-all duration-300 ease-in-out ${expandedSections[id]
        ? "max-h-[2000px] opacity-100"
        : "max-h-0 opacity-0"
        } overflow-hidden`}
    >
      <div className="px-5 pb-5 pt-1">{children}</div>
    </div>
  </div>
);

function GenerateGSTBill() {
  const { currentUser } = useAuth();
  const authUserData = currentUser;

  const [sellerDetails, setSellerDetails] = useState({
    name: "", address: "", gstin: "", state: "", pan: "",
    tin: "", serviceTaxNo: "", logoUrl: "", phone: "", email: "",
  });

  const [buyerDetails, setBuyerDetails] = useState({
    name: "", address: "", gstin: "", state: "", pan: "",
    tin: "", serviceTaxNo: "", phone: "", email: "",
  });

  const [shipToDetails, setShipToDetails] = useState({
    name: "", address: "", state: "",
  });

  const [invoiceDetails, setInvoiceDetails] = useState({
    invoiceNumber: `INV-${new Date().getFullYear()}${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}-`,
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(new Date().setDate(new Date().getDate() + 15))
      .toISOString()
      .slice(0, 10),
  });

  const [productsList, setProductsList] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [isMobileIndustry, setIsMobileIndustry] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const userIndustry =
        currentUser.industry || currentUser.companyDetails?.industry;
      if (userIndustry) {
        const isMobile =
          userIndustry.toLowerCase().includes("mobile") ||
          userIndustry.toLowerCase() === "mobile_shop";
        setIsMobileIndustry(isMobile);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!currentUser) return;
      const token = sessionStorage.getItem("token");
      if (!token) return;

      setProductsLoading(true);
      try {
        const res = await axios.get(`${API_URL}/products`, {
          headers: { "x-auth-token": token },
        });
        console.log("hello",res);
        setProductsList(res.data);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [currentUser]);

  const [items, setItems] = useState([{ ...initialItem }]);
  const [termsAndConditions, setTermsAndConditions] = useState(
    "1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged if payment is not made within due date."
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    seller: true, buyer: true, shipTo: false,
    invoice: true, items: true, summary: true, notes: false,
  });

  const userProfileLoading = false;

  useEffect(() => {
    const effectiveUserData = authUserData;
    if (effectiveUserData) {
      setSellerDetails((prev) => ({
        ...prev,
        name: effectiveUserData.businessName || prev.name,
        address: `${effectiveUserData.businessAddress?.street || ""} ${effectiveUserData.businessAddress?.city || ""
          } ${effectiveUserData.businessAddress?.state || ""} ${effectiveUserData.businessAddress?.pincode || ""
          }`
          .trim()
          .replace(/,\s*$/, ""),
        gstin: effectiveUserData.gstin || prev.gstin,
        state: effectiveUserData.businessAddress?.state || prev.state,
        pan: effectiveUserData.pan || prev.pan,
        logoUrl: effectiveUserData.logoUrl || "",
        phone:
          effectiveUserData.businessPhone ||
          effectiveUserData.phone ||
          "",
        email:
          effectiveUserData.businessEmail ||
          effectiveUserData.email ||
          "",
      }));
    }
  }, [authUserData]);


  const handleInputChange = (e, section, field, index = null) => {
    const value =
      e.target.type === "number"
        ? parseFloat(e.target.value) || 0
        : e.target.value;
    if (section === "seller")
      setSellerDetails((prev) => ({ ...prev, [field]: value }));
    else if (section === "buyer")
      setBuyerDetails((prev) => ({ ...prev, [field]: value }));
    else if (section === "shipTo")
      setShipToDetails((prev) => ({ ...prev, [field]: value }));
    else if (section === "invoice")
      setInvoiceDetails((prev) => ({ ...prev, [field]: value }));
    else if (section === "items")
      setItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      );
  };

  const handleItemProductSelect = (index, productId) => {
    const selectedProduct = productsList.find(
      (p) => String(p.id) === String(productId)
    );
    if (!selectedProduct) return;

    let description = selectedProduct.name || "";
    if (isMobileIndustry) {
      description = `${selectedProduct.brand} ${selectedProduct.model}`;
      if (selectedProduct.color) description += ` - ${selectedProduct.color}`;
      if (selectedProduct.storage) description += ` (${selectedProduct.storage})`;
    }

    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
            ...item,
            productId: String(selectedProduct.id), // Store ID instead of SKU
            productSku: selectedProduct.sku || selectedProduct.imei1 || String(selectedProduct.id), // Fallback to ID ensures validation passes
            description: description,
            unitPrice:
              selectedProduct.sellingPrice ||
              selectedProduct.salesPrice ||
              selectedProduct.salePrice ||
              selectedProduct.price ||
              0,
            hsnSac: selectedProduct.hsnSac || "",
          }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { ...initialItem, id: _.uniqueId("item_") },
    ]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear the form to start a new invoice?")) {
      setInvoiceDetails({
        ...invoiceDetails,
        invoiceNumber: `INV-${new Date().getFullYear()}${String(
          new Date().getMonth() + 1
        ).padStart(2, "0")}-${String(
          Math.floor(Math.random() * 10000)
        ).padStart(4, "0")}`,
      });
      setItems([{ ...initialItem, id: _.uniqueId("item_") }]);
      setBuyerDetails({
        name: "", address: "", gstin: "", state: "", pan: "",
        tin: "", serviceTaxNo: "", phone: "", email: "",
      });
      setShipToDetails({ name: "", address: "", state: "" });
      setNotes("");
      setSuccess("");
      setError("");
    }
  };

  const calculations = useMemo(() => {
    let subTotal = 0,
      totalDiscount = 0,
      totalTaxableValue = 0;
    let totalCGST = 0,
      totalSGST = 0,
      totalIGST = 0;

    items.forEach((item) => {
      const qty = parseFloat(item.qty) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const discountVal = parseFloat(item.discountAmount) || 0;
      const itemTaxRate = parseFloat(item.taxRate) || 0;
      const itemSubTotal = qty * unitPrice;
      const itemTaxableValue = itemSubTotal - discountVal;

      subTotal += itemSubTotal;
      totalDiscount += discountVal;
      totalTaxableValue += itemTaxableValue;

      if (
        sellerDetails.state &&
        buyerDetails.state &&
        sellerDetails.state.toLowerCase() ===
        buyerDetails.state.toLowerCase()
      ) {
        totalCGST += (itemTaxableValue * (itemTaxRate / 2)) / 100;
        totalSGST += (itemTaxableValue * (itemTaxRate / 2)) / 100;
      } else {
        totalIGST += (itemTaxableValue * itemTaxRate) / 100;
      }
    });

    return {
      subTotal,
      totalDiscount,
      totalTaxableValue,
      totalCGST,
      totalSGST,
      totalIGST,
      grandTotal:
        totalTaxableValue + totalCGST + totalSGST + totalIGST,
    };
  }, [items, sellerDetails.state, buyerDetails.state]);

  const amountInWords = (amount) => {
    const ones = [
      "", "One", "Two", "Three", "Four", "Five",
      "Six", "Seven", "Eight", "Nine",
    ];
    const teens = [
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
      "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
    ];
    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty",
      "Sixty", "Seventy", "Eighty", "Ninety",
    ];

    function convertLessThanThousand(n) {
      if (n === 0) return "";
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100)
        return tens[Math.floor(n / 10)] + " " + ones[n % 10];
      return (
        ones[Math.floor(n / 100)] +
        " Hundred " +
        convertLessThanThousand(n % 100)
      );
    }

    if (amount === 0) return "Zero";
    let words = "";
    if (amount >= 10000000) {
      words +=
        convertLessThanThousand(Math.floor(amount / 10000000)) +
        " Crore ";
      amount %= 10000000;
    }
    if (amount >= 100000) {
      words +=
        convertLessThanThousand(Math.floor(amount / 100000)) +
        " Lakh ";
      amount %= 100000;
    }
    if (amount >= 1000) {
      words +=
        convertLessThanThousand(Math.floor(amount / 1000)) +
        " Thousand ";
      amount %= 1000;
    }
    words += convertLessThanThousand(amount);
    return (words.trim() + " Only").replace(/\s+/g, " ");
  };

  const generatePDF = (data, action = "download") => {
    const docPdf = new jsPDF("p", "mm", "a4");
    const {
      seller, buyer, shipTo, invoice,
      items: billItems, calcs, terms, notesText,
    } = data;

    const formatDate = (dateInput) => {
      const d = dateInput?.toDate
        ? dateInput.toDate()
        : new Date(dateInput);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-GB");
    };

    const invoiceDate = formatDate(invoice.invoiceDate);
    const dueDate = formatDate(invoice.dueDate);
    const brandColor = "#000000";
    const textColor = "#000000";
    const mutedColor = "#404040";

    docPdf.setFont("helvetica", "normal");
    let yPos = 15;

    docPdf.setFontSize(22);
    docPdf.setFont("helvetica", "bold");
    docPdf.setTextColor(33, 33, 33);
    docPdf.text("TAX INVOICE", 196, 20, { align: "right" });

    docPdf.setFontSize(10);
    docPdf.setFont("helvetica", "normal");
    docPdf.setTextColor(mutedColor);
    docPdf.text("Original Copy", 196, 26, { align: "right" });
    docPdf.setFontSize(14);
    docPdf.setTextColor(33, 33, 33);
    docPdf.text(invoice.invoiceNumber, 196, 32, { align: "right" });

    const greenBarY = 38;
    docPdf.setFillColor(brandColor);
    docPdf.rect(120, greenBarY, 76, 12, "F");
    docPdf.setTextColor(255, 255, 255);
    docPdf.setFontSize(12);
    docPdf.setFont("helvetica", "bold");
    docPdf.text("Amount Due:", 125, greenBarY + 8);
    docPdf.text(`Rs.${calcs.grandTotal.toFixed(2)}`, 191, greenBarY + 8, {
      align: "right",
    });

    docPdf.setTextColor(textColor);
    docPdf.setFontSize(9);
    docPdf.setFont("helvetica", "normal");
    docPdf.text("Issue Date:", 140, greenBarY + 18);
    docPdf.text(invoiceDate, 196, greenBarY + 18, { align: "right" });
    docPdf.text("Due Date:", 140, greenBarY + 23);
    docPdf.text(dueDate, 196, greenBarY + 23, { align: "right" });

    let leftInfoY = 20;
    docPdf.setTextColor(brandColor);
    docPdf.setFontSize(11);
    docPdf.setFont("helvetica", "bold");
    docPdf.text(
      seller.name.toUpperCase() || "SELLER NAME",
      14,
      leftInfoY
    );

    docPdf.setTextColor(textColor);
    docPdf.setFontSize(9);
    docPdf.setFont("helvetica", "normal");
    leftInfoY += 5;

    const sellerAddress = docPdf.splitTextToSize(
      seller.address || "",
      80
    );
    docPdf.text(sellerAddress, 14, leftInfoY);
    leftInfoY += sellerAddress.length * 4;

    if (seller.email) {
      docPdf.text(seller.email, 14, leftInfoY);
      leftInfoY += 4;
    }
    if (seller.phone) {
      docPdf.text(seller.phone, 14, leftInfoY);
      leftInfoY += 4;
    }
    if (seller.gstin) {
      docPdf.text(`GSTIN: ${seller.gstin}`, 14, leftInfoY);
      leftInfoY += 4;
    }
    if (seller.pan) {
      docPdf.text(`PAN: ${seller.pan}`, 14, leftInfoY);
      leftInfoY += 4;
    }
    if (seller.serviceTaxNo) {
      docPdf.text(
        `Service Tax No: ${seller.serviceTaxNo}`,
        14,
        leftInfoY
      );
      leftInfoY += 4;
    }
    if (seller.tin) {
      docPdf.text(`TIN: ${seller.tin}`, 14, leftInfoY);
      leftInfoY += 4;
    }

    yPos = Math.max(leftInfoY, greenBarY + 28) + 10;
    const col1X = 14;
    const col2X = 105;

    docPdf.setFontSize(9);
    docPdf.setFont("helvetica", "bold");
    docPdf.setTextColor(textColor);
    docPdf.text("Bill To", col1X, yPos);
    if (shipTo.name) docPdf.text("Ship To", col2X, yPos,);
    yPos += 5;

    docPdf.setTextColor(brandColor);
    docPdf.setFontSize(10);
    docPdf.text(buyer.name || "", col1X, yPos);
    if (shipTo.name) docPdf.text(shipTo.name || "", col2X, yPos);
    yPos += 5;

    docPdf.setTextColor(textColor);
    docPdf.setFontSize(9);
    docPdf.setFont("helvetica", "normal");

    let addressY = yPos;
    const billAddress = docPdf.splitTextToSize(
      buyer.address || "",
      80
    );
    docPdf.text(billAddress, col1X, addressY);
    let billH = billAddress.length * 4;
    let shipH = 0;
    if (shipTo.name) {
      const shipAddressLines = docPdf.splitTextToSize(
        shipTo.address || "",
        80
      );
      docPdf.text(shipAddressLines, col2X, addressY);
      shipH = shipAddressLines.length * 4;
    }

    yPos = Math.max(yPos + billH, yPos + shipH) + 2;
    if (buyer.email) {
      docPdf.text(buyer.email, col1X, yPos);
      yPos += 4;
    }
    if (buyer.phone) {
      docPdf.text(buyer.phone, col1X, yPos);
      yPos += 4;
    }

    let buyerIds = [];
    if (buyer.gstin) buyerIds.push(`GSTIN: ${buyer.gstin}`);
    if (buyer.tin) buyerIds.push(`TIN: ${buyer.tin}`);
    if (buyer.pan) buyerIds.push(`PAN: ${buyer.pan}`);
    if (buyer.serviceTaxNo)
      buyerIds.push(`Service Tax No: ${buyer.serviceTaxNo}`);
    if (shipTo.name && shipTo.state)
      docPdf.text(
        `State: ${shipTo.state}`,
        col2X,
        yPos - (buyerIds.length > 0 ? 0 : 4)
      );
    buyerIds.forEach((id) => {
      docPdf.text(id, col1X, yPos);
      yPos += 4;
    });
    yPos += 6;

    const tableHeaders = [
      "S.No", "Item\nDescription", "HSN", "Qty", "UoM",
      "Price\n(Rs.)", "Discount\n(Rs.)", "Taxable Value\n(Rs.)",
      "CGST\n(Rs.)", "SGST\n(Rs.)", "IGST\n(Rs.)", "Amount\n(Rs.)",
    ];

    const tableRows = billItems.map((item, i) => {
      const qty = Number(item.qty) || 0;
      console.log("ekmkjb",item);
      const unitPrice = Number(item.unitPrice) || 0;
      const discountAmt = Number(item.discountAmount) || 0;
      const subTotal = qty * unitPrice;
      const taxable = subTotal - discountAmt;
      const taxRate = Number(item.taxRate) || 0;

      let cgstRate = 0, sgstRate = 0, igstRate = 0;
      let cgstAmt = 0, sgstAmt = 0, igstAmt = 0;
      const isInterState =
        seller.state &&
        buyer.state &&
        seller.state.toLowerCase() !== buyer.state.toLowerCase();

      if (!isInterState) {
        cgstRate = taxRate / 2;
        sgstRate = taxRate / 2;
        cgstAmt = (taxable * cgstRate) / 100;
        sgstAmt = (taxable * sgstRate) / 100;
      } else {
        igstRate = taxRate;
        igstAmt = (taxable * igstRate) / 100;
      }

      const totalAmt = taxable + cgstAmt + sgstAmt + igstAmt;
      return [
        i + 1,
        {
          content:
            item.description +
            (item.secondaryDescription
              ? `\n${item.secondaryDescription}`
              : ""),
          styles: { fontStyle: "bold" },
        },
        item.hsnSac || "-",
        qty,
        item.uom || "Unit",
        unitPrice.toFixed(2),
        discountAmt > 0 ? discountAmt.toFixed(2) : "-",
        taxable.toFixed(2),
        cgstAmt > 0
          ? `${cgstAmt.toFixed(2)}\n${cgstRate}%`
          : "0.00\n0%",
        sgstAmt > 0
          ? `${sgstAmt.toFixed(2)}\n${sgstRate}%`
          : "0.00\n0%",
        igstAmt > 0
          ? `${igstAmt.toFixed(2)}\n${igstRate}%`
          : "0.00\n0%",
        totalAmt.toFixed(2),
      ];
    });

    const totalRow = [
      "",
      {
        content: "TOTAL",
        styles: { halign: "right", fontStyle: "bold" },
      },
      "", "", "", "",
      `Rs.${calcs.totalDiscount.toFixed(2)}`,
      `Rs.${calcs.totalTaxableValue.toFixed(2)}`,
      `Rs.${calcs.totalCGST.toFixed(2)}`,
      `Rs.${calcs.totalSGST.toFixed(2)}`,
      `Rs.${calcs.totalIGST.toFixed(2)}`,
      `Rs.${calcs.grandTotal.toFixed(2)}`,
    ];

    autoTable(docPdf, {
      startY: yPos,
      head: [tableHeaders],
      body: [...tableRows, totalRow],
      theme: "plain",
      styles: {
        fontSize: 7, cellPadding: 2,
        valign: "middle", lineWidth: 0,
      },
      headStyles: {
        fillColor: brandColor, textColor: 255,
        fontStyle: "bold", halign: "center", fontSize: 7.5,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "left", cellWidth: 32 },
        2: { halign: "center", cellWidth: 10 },
        3: { halign: "center", cellWidth: 8 },
        4: { halign: "center", cellWidth: 8 },
        5: { halign: "right", cellWidth: 15 },
        6: { halign: "right", cellWidth: 12 },
        7: { halign: "right", cellWidth: 16 },
        8: { halign: "right", cellWidth: 13 },
        9: { halign: "right", cellWidth: 13 },
        10: { halign: "right", cellWidth: 13 },
        11: { halign: "right", cellWidth: 20 },
      },
      didParseCell: (cellData) => {
        if (cellData.row.index === tableRows.length) {
          cellData.cell.styles.fillColor = "#E5E7EB";
          cellData.cell.styles.fontStyle = "bold";
          cellData.cell.styles.textColor = textColor;
        }
      },
    });

    yPos = docPdf.lastAutoTable.finalY + 5;
    const summaryX = 120;
    const valX = 196;
    const totalTaxAmt =
      calcs.totalCGST + calcs.totalSGST + calcs.totalIGST;

    docPdf.setFontSize(9);
    docPdf.setTextColor(textColor);
    docPdf.setFont("helvetica", "normal");
    docPdf.text("Total Tax Amount", summaryX, yPos);
    docPdf.text(`Rs.${totalTaxAmt.toFixed(2)}`, valX, yPos, {
      align: "right",
    });
    yPos += 5;

    if (calcs.totalDiscount > 0) {
      docPdf.text("Discount", summaryX, yPos);
      docPdf.text(`Rs.${calcs.totalDiscount.toFixed(2)}`, valX, yPos, {
        align: "right",
      });
      yPos += 5;
    }

    docPdf.setFont("helvetica", "bold");
    docPdf.text("Total Invoice Value (in figure)", summaryX, yPos);
    docPdf.text(`Rs.${calcs.grandTotal.toFixed(2)}`, valX, yPos, {
      align: "right",
    });
    yPos += 6;

    docPdf.setFont("helvetica", "normal");
    docPdf.text("Total Invoice Value (in words)", summaryX, yPos);
    yPos += 4;
    const words = amountInWords(Math.round(calcs.grandTotal));
    docPdf.setFont("helvetica", "italic");
    docPdf.setFontSize(8);
    const wordsLines = docPdf.splitTextToSize(words, 80);
    docPdf.text(wordsLines, valX, yPos, { align: "right" });
    yPos += wordsLines.length * 4 + 5;

    if (notesText) {
      docPdf.setFontSize(9);
      docPdf.setFont("helvetica", "bold");
      docPdf.setTextColor(brandColor);
      docPdf.text("Notes", 14, yPos);
      yPos += 4;
      docPdf.setFontSize(8);
      docPdf.setTextColor(textColor);
      docPdf.setFont("helvetica", "italic");
      const noteLines = docPdf.splitTextToSize(notesText, 170);
      docPdf.text(noteLines, 14, yPos);
      yPos += noteLines.length * 4 + 4;
    }

    if (terms) {
      docPdf.setFontSize(9);
      docPdf.setFont("helvetica", "bold");
      docPdf.setTextColor(brandColor);
      docPdf.text("Terms & Conditions", 14, yPos);
      yPos += 4;
      docPdf.setFontSize(8);
      docPdf.setTextColor(textColor);
      docPdf.setFont("helvetica", "italic");
      const termLines = docPdf.splitTextToSize(terms, 170);
      docPdf.text(termLines, 14, yPos);
      yPos += termLines.length * 4 + 4;
    }

    const pageHeight = docPdf.internal.pageSize.getHeight();
    const sigY = pageHeight - 25;
    docPdf.setDrawColor(200, 200, 200);
    docPdf.setLineWidth(0.5);
    docPdf.line(130, sigY, 190, sigY);
    docPdf.setFontSize(8);
    docPdf.setFont("helvetica", "bold");
    docPdf.setTextColor(textColor);
    docPdf.text("Provider Signature", 160, sigY + 5, {
      align: "center",
    });
    docPdf.line(14, sigY, 74, sigY);
    docPdf.text("Receiver Signature", 44, sigY + 5, {
      align: "center",
    });

    docPdf.setFontSize(7);
    docPdf.setTextColor(mutedColor);
    docPdf.setFont("helvetica", "italic");
    docPdf.text(
      "Tax Invoice made with SwordNex Billing",
      14,
      pageHeight - 10
    );
    docPdf.text(
      `Page ${docPdf.internal.getNumberOfPages()}/1`,
      196,
      pageHeight - 10,
      { align: "right" }
    );

    if (action === "preview") {
      const pdfDataUri = docPdf.output("datauristring");
      const previewWindow = window.open("", "_blank");
      previewWindow.document.write(
        `<html><head><title>Invoice Preview</title></head><body style="margin:0"><iframe src="${pdfDataUri}" style="width:100%; height:100%;" frameborder="0"></iframe></body></html>`
      );
    } else if (action === "print") {
      docPdf.autoPrint();
      const pdfDataUri = docPdf.output("datauristring");
      const printWindow = window.open("", "_blank");
      printWindow.document.write(
        `<html><head><title>Print Invoice</title></head><body style="margin:0"><iframe src="${pdfDataUri}" style="width:100%; height:100%;" frameborder="0"></iframe></body></html>`
      );
    } else {
      docPdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
    }
  };

  const getBillData = () => ({
    seller: sellerDetails,
    buyer: buyerDetails,
    shipTo: shipToDetails,
    invoice: invoiceDetails,
    items: items.map((item) => ({
      productId: item.productId,
      description: item.description,
      secondaryDescription: item.secondaryDescription,
      qty: item.qty,
      uom: item.uom,
      unitPrice: item.unitPrice,
      hsnSac: item.hsnSac,
      discountAmount: item.discountAmount,
      taxRate: item.taxRate,
    })),
    calcs: calculations,
    terms: termsAndConditions,
    notesText: notes,
  });

  const handlePreview = () => generatePDF(getBillData(), "preview");
  const handleDownload = () => {
    generatePDF(getBillData(), "download");
    setSuccess("PDF Downloaded!");
  };
  const handlePrint = () => generatePDF(getBillData(), "print");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userId = currentUser?.uid || currentUser?.userId;
    if (!userId) {
      setError("User not authenticated.");
      return;
    }

    const currentPlan =
      authUserData?.Tenant?.subscription_plan || authUserData?.plan;

    for (let item of items) {
      if (!item.productSku) {
        setError("Please select a product for all items.");
        return;
      }
      if (!(item.qty > 0)) {
        setError("Please enter a valid quantity for all items.");
        return;
      }
      if (!(item.unitPrice > 0)) {
        setError("Please enter a valid price for all items.");
        return;
      }
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = sessionStorage.getItem("token");
      const config = {
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
      };

      const payload = {
        sellerDetails,
        buyerDetails,
        invoiceDetails,
        items,
        calculations,
        termsAndConditions,
        notes,
        status: "Generated",
        createdBy: userId,
        source: "Owner"
      };

      await axios.post(`${API_URL}/gst-bills`, payload, config);
      

      setSuccess(
        `Invoice ${invoiceDetails.invoiceNumber} saved successfully!`
      );
      console.log("try",payload)
    } catch (err) {
      console.error("Error saving invoice:", err);
      setError(
        `Failed to save invoice: ${err.response?.data?.message || err.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const getItemAmount = (item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.unitPrice) || 0;
    const discount = Number(item.discountAmount) || 0;
    const taxRate = Number(item.taxRate) || 0;
    const taxable = qty * price - discount;
    return taxable + (taxable * taxRate) / 100;
  };

  if (userProfileLoading) {
    return (
      <BillingLayout>
        <div className="min-h-screen bg-gradient-to-br from-white-50 via-white to-white-50 flex justify-center items-center">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-green-200 rounded-full animate-spin border-t-green-600 mx-auto"></div>
              <FileText className="w-6 h-6 text-green-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="mt-4 text-lg font-medium text-gray-600">
              Loading your details...
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Setting up your invoice workspace
            </p>
          </div>
        </div>
      </BillingLayout>
    );
  }

  return (
    <BillingLayout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-green-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-200">
                  <FileText size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Create Invoice
                  </h1>
                  <p className="text-sm text-gray-400">
                    Generate a professional GST tax invoice
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={items.length === 0}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-xl text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 disabled:opacity-40 transition-all duration-200 hover:shadow-sm"
                >
                  <Eye size={16} className="mr-1.5" /> Preview
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={items.length === 0}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-xl text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-40 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Download size={16} className="mr-1.5" /> Download
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={items.length === 0}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-xl text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 disabled:opacity-40 transition-all duration-200 hover:shadow-sm"
                >
                  <Printer size={16} className="mr-1.5" /> Print
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          {/* Alerts */}
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-medium flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <CircleX size={16} className="text-red-600" />
              </div>
              <span className="flex-1">{error}</span>
              <button
                onClick={() => setError("")}
                className="p-1 hover:bg-red-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {success && (
            <div className="mb-5 p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl text-sm font-medium flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={16} className="text-green-600" />
              </div>
              <span className="flex-1">{success}</span>
              <button
                onClick={() => setSuccess("")}
                className="p-1 hover:bg-green-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Invoice Details */}
            <SectionCard
              id="invoice"
              icon={Receipt}
              title="Invoice Details"
              subtitle="Invoice number and dates"
              expandedSections={expandedSections}
              toggleSection={toggleSection}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Invoice Number *</label>
                  <input
                    type="text"
                    value={invoiceDetails.invoiceNumber}
                    onChange={(e) =>
                      handleInputChange(e, "invoice", "invoiceNumber")
                    }
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Invoice Date *</label>
                  <input
                    type="date"
                    value={invoiceDetails.invoiceDate}
                    onChange={(e) =>
                      handleInputChange(e, "invoice", "invoiceDate")
                    }
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Due Date</label>
                  <input
                    type="date"
                    value={invoiceDetails.dueDate}
                    onChange={(e) =>
                      handleInputChange(e, "invoice", "dueDate")
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Seller & Buyer Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Seller */}
              <SectionCard
                id="seller"
                icon={Building2}
                title="Seller Details"
                subtitle="Your business information"
                expandedSections={expandedSections}
                toggleSection={toggleSection}
              >
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Business Name *</label>
                    <input
                      type="text"
                      value={sellerDetails.name}
                      onChange={(e) =>
                        handleInputChange(e, "seller", "name")
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Address *</label>
                    <textarea
                      value={sellerDetails.address}
                      onChange={(e) =>
                        handleInputChange(e, "seller", "address")
                      }
                      className={`${inputClass} h-20 resize-none`}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>GSTIN</label>
                      <input
                        type="text"
                        value={sellerDetails.gstin}
                        onChange={(e) =>
                          handleInputChange(e, "seller", "gstin")
                        }
                        className={inputClass}
                        placeholder="22AAAAA0000A1Z5"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>State *</label>
                      <select
                        value={sellerDetails.state}
                        onChange={(e) =>
                          handleInputChange(e, "seller", "state")
                        }
                        className={selectClass}
                        required
                      >
                        <option value="">Select State</option>
                        {indianStates.map((s) => (
                          <option key={`s-${s}`} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Phone</label>
                      <input
                        type="tel"
                        value={sellerDetails.phone}
                        onChange={(e) =>
                          handleInputChange(e, "seller", "phone")
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input
                        type="email"
                        value={sellerDetails.email}
                        onChange={(e) =>
                          handleInputChange(e, "seller", "email")
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelClass}>PAN</label>
                      <input
                        type="text"
                        value={sellerDetails.pan}
                        onChange={(e) =>
                          handleInputChange(e, "seller", "pan")
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>TIN</label>
                      <input
                        type="text"
                        value={sellerDetails.tin}
                        onChange={(e) =>
                          handleInputChange(e, "seller", "tin")
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Service Tax No</label>
                      <input
                        type="text"
                        value={sellerDetails.serviceTaxNo}
                        onChange={(e) =>
                          handleInputChange(
                            e,
                            "seller",
                            "serviceTaxNo"
                          )
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Buyer */}
              <SectionCard
                id="buyer"
                icon={User}
                title="Buyer Details"
                subtitle="Customer information"
                expandedSections={expandedSections}
                toggleSection={toggleSection}
              >
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={buyerDetails.name}
                      onChange={(e) =>
                        handleInputChange(e, "buyer", "name")
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Address *</label>
                    <textarea
                      value={buyerDetails.address}
                      onChange={(e) =>
                        handleInputChange(e, "buyer", "address")
                      }
                      className={`${inputClass} h-20 resize-none`}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>GSTIN</label>
                      <input
                        type="text"
                        value={buyerDetails.gstin}
                        onChange={(e) =>
                          handleInputChange(e, "buyer", "gstin")
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>State *</label>
                      <select
                        value={buyerDetails.state}
                        onChange={(e) =>
                          handleInputChange(e, "buyer", "state")
                        }
                        className={selectClass}
                        required
                      >
                        <option value="">Select State</option>
                        {indianStates.map((s) => (
                          <option key={`b-${s}`} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Phone</label>
                      <input
                        type="tel"
                        value={buyerDetails.phone}
                        onChange={(e) =>
                          handleInputChange(e, "buyer", "phone")
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input
                        type="email"
                        value={buyerDetails.email}
                        onChange={(e) =>
                          handleInputChange(e, "buyer", "email")
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelClass}>PAN</label>
                      <input
                        type="text"
                        value={buyerDetails.pan}
                        onChange={(e) =>
                          handleInputChange(e, "buyer", "pan")
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>TIN</label>
                      <input
                        type="text"
                        value={buyerDetails.tin}
                        onChange={(e) =>
                          handleInputChange(e, "buyer", "tin")
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Service Tax No
                      </label>
                      <input
                        type="text"
                        value={buyerDetails.serviceTaxNo}
                        onChange={(e) =>
                          handleInputChange(
                            e,
                            "buyer",
                            "serviceTaxNo"
                          )
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Ship To */}
            <SectionCard
              id="shipTo"
              icon={Truck}
              title="Ship To"
              subtitle="Delivery address (optional)"
              expandedSections={expandedSections}
              toggleSection={toggleSection}
            >
              <div className="flex justify-end mb-3">
                <button
                  type="button"
                  onClick={() =>
                    setShipToDetails({
                      name: buyerDetails.name,
                      address: buyerDetails.address,
                      state: buyerDetails.state,
                    })
                  }
                  className="inline-flex items-center text-xs font-semibold text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Copy size={12} className="mr-1.5" /> Copy from Buyer
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    type="text"
                    value={shipToDetails.name}
                    onChange={(e) =>
                      handleInputChange(e, "shipTo", "name")
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <select
                    value={shipToDetails.state}
                    onChange={(e) =>
                      handleInputChange(e, "shipTo", "state")
                    }
                    className={selectClass}
                  >
                    <option value="">Select State</option>
                    {indianStates.map((s) => (
                      <option key={`sh-${s}`} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className={labelClass}>Address</label>
                <textarea
                  value={shipToDetails.address}
                  onChange={(e) =>
                    handleInputChange(e, "shipTo", "address")
                  }
                  className={`${inputClass} h-20 resize-none`}
                />
              </div>
            </SectionCard>

            {/* Items */}
            <SectionCard
              id="items"
              icon={Package}
              title="Invoice Items"
              subtitle="Add products and services"
              badge={`${items.length} item${items.length > 1 ? "s" : ""
                }`}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
            >
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="relative bg-gradient-to-r from-green-50/50 to-emerald-50/30 rounded-xl border border-green-100 p-4 hover:border-green-200 transition-all duration-200"
                  >
                    <div className="absolute -top-2.5 left-4">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold shadow-sm">
                        {index + 1}
                      </span>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="absolute -top-2.5 right-4 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors shadow-sm"
                      >
                        <X size={14} />
                      </button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-2">
                      <div className="md:col-span-4">
                        <label className={labelClass}>Product *</label>
                        <select
                          value={item.productId || ""}
                          onChange={(e) =>
                            handleItemProductSelect(
                              index,
                              e.target.value
                            )
                          }
                          className={`${selectClass} text-sm`}
                        >
                          <option value="">
                            -- Select Product --
                          </option>
                          {productsList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {isMobileIndustry
                                ? `${p.brand} ${p.model} (₹${p.sellingPrice ||
                                p.salesPrice ||
                                p.salePrice ||
                                p.price ||
                                0
                                })`
                                : `${p.name} (₹${p.sellingPrice ||
                                p.salesPrice ||
                                p.salePrice ||
                                p.price ||
                                0
                                })`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-4">
                        <label className={labelClass}>
                          Description
                        </label>
                        <input
                          type="text"
                          placeholder="Additional description..."
                          value={item.secondaryDescription}
                          onChange={(e) =>
                            handleInputChange(
                              e,
                              "items",
                              "secondaryDescription",
                              index
                            )
                          }
                          className={inputClass}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className={labelClass}>HSN/SAC</label>
                        <input
                          type="text"
                          placeholder="HSN Code"
                          value={item.hsnSac}
                          onChange={(e) =>
                            handleInputChange(
                              e,
                              "items",
                              "hsnSac",
                              index
                            )
                          }
                          className={inputClass}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className={labelClass}>Unit</label>
                        <input
                          type="text"
                          value={item.uom}
                          onChange={(e) =>
                            handleInputChange(
                              e,
                              "items",
                              "uom",
                              index
                            )
                          }
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                      <div>
                        <label className={labelClass}>
                          Quantity *
                        </label>
                        <input
                          type="number"
                          value={item.qty || ""}
                          min="0.01"
                          step="0.01"
                          onChange={(e) =>
                            handleInputChange(
                              e,
                              "items",
                              "qty",
                              index
                            )
                          }
                          className={inputClass}
                          required
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Unit Price *
                        </label>
                        <input
                          type="number"
                          value={item.unitPrice || ""}
                          min="0"
                          step="0.01"
                          onChange={(e) =>
                            handleInputChange(
                              e,
                              "items",
                              "unitPrice",
                              index
                            )
                          }
                          className={inputClass}
                          required
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Discount (₹)
                        </label>
                        <input
                          type="number"
                          value={item.discountAmount}
                          min="0"
                          step="0.01"
                          onChange={(e) =>
                            handleInputChange(
                              e,
                              "items",
                              "discountAmount",
                              index
                            )
                          }
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>
                          Tax Rate (%)
                        </label>
                        <input
                          type="number"
                          value={item.taxRate}
                          min="0"
                          step="0.01"
                          onChange={(e) =>
                            handleInputChange(
                              e,
                              "items",
                              "taxRate",
                              index
                            )
                          }
                          className={inputClass}
                          required
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Amount</label>
                        <div className="px-3.5 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm font-bold text-green-800">
                          ₹{getItemAmount(item).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addItem}
                  className="w-full py-3 border-2 border-dashed border-green-300 rounded-xl text-green-600 hover:text-green-800 hover:border-green-500 hover:bg-green-50 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <PlusCircle size={18} /> Add Another Item
                </button>
              </div>
            </SectionCard>

            {/* Summary */}
            <SectionCard
              id="summary"
              icon={Calculator}
              title="Invoice Summary"
              subtitle="Tax breakdown and totals"
              expandedSections={expandedSections}
              toggleSection={toggleSection}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={16} className="text-green-600" />
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                      Tax Information
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {sellerDetails.state && buyerDetails.state ? (
                      sellerDetails.state.toLowerCase() ===
                        buyerDetails.state.toLowerCase() ? (
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <strong>Intra-State</strong> — CGST + SGST
                          applicable
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <strong>Inter-State</strong> — IGST
                          applicable
                        </span>
                      )
                    ) : (
                      <span className="text-gray-400">
                        Select both seller & buyer states to determine
                        tax type
                      </span>
                    )}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold text-gray-700">
                      ₹{calculations.subTotal.toFixed(2)}
                    </span>
                  </div>

                  {calculations.totalDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Discount</span>
                      <span className="font-semibold text-red-500">
                        - ₹{calculations.totalDiscount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-2">
                    <span className="text-gray-600 font-medium">
                      Taxable Value
                    </span>
                    <span className="font-bold text-gray-800">
                      ₹{calculations.totalTaxableValue.toFixed(2)}
                    </span>
                  </div>

                  {calculations.totalCGST > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">CGST</span>
                      <span className="font-semibold text-gray-700">
                        ₹{calculations.totalCGST.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {calculations.totalSGST > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">
                        SGST / UTGST
                      </span>
                      <span className="font-semibold text-gray-700">
                        ₹{calculations.totalSGST.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {calculations.totalIGST > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">IGST</span>
                      <span className="font-semibold text-gray-700">
                        ₹{calculations.totalIGST.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t-2 border-green-200">
                    <span className="text-lg font-bold text-gray-800">
                      Grand Total
                    </span>
                    <span className="text-2xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                      ₹{calculations.grandTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-green-50 rounded-lg px-3 py-2 border border-green-100">
                    <p className="text-xs text-green-700 italic">
                      {amountInWords(
                        Math.round(calculations.grandTotal)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Notes & Terms */}
            <SectionCard
              id="notes"
              icon={StickyNote}
              title="Notes & Terms"
              subtitle="Additional information (optional)"
              expandedSections={expandedSections}
              toggleSection={toggleSection}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${inputClass} h-28 resize-none`}
                    placeholder="Any additional notes for the buyer..."
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Terms & Conditions
                  </label>
                  <textarea
                    value={termsAndConditions}
                    onChange={(e) =>
                      setTermsAndConditions(e.target.value)
                    }
                    className={`${inputClass} h-28 resize-none`}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Save Button */}
            <div className="sticky bottom-0 z-20 bg-white/80 backdrop-blur-xl border-t border-green-100 -mx-4 md:-mx-6 px-4 md:px-6 py-4 mt-6">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span>Auto-calculating totals in real-time</span>
                </div>
                <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 text-base font-bold rounded-xl text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all duration-300 shadow-sm"
                >
                  <RefreshCw size={18} className="mr-2" />
                  New Invoice
                </button>
                <button
                  type="submit"
                  disabled={loading || items.length === 0}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-base font-bold rounded-xl text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-40 transition-all duration-300 shadow-lg shadow-green-200 hover:shadow-xl hover:shadow-green-300 hover:-translate-y-0.5"
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={20}
                        className="animate-spin mr-2"
                      />
                      Saving Invoice...
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      Save Invoice
                    </>
                  )}
                </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </BillingLayout>
  );
}

export default GenerateGSTBill;