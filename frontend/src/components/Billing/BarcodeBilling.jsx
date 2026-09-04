import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ScanBarcode,
  IndianRupee,
  CreditCard,
  Smartphone,
} from "lucide-react";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../config/FirebaseConfig";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useCollectionData } from "react-firebase-hooks/firestore";

const Billing = () => {
  const { currentUser } = useAuth();

  const productsRef = currentUser
    ? collection(db, "users", currentUser.uid, "products")
    : null;

  const [products] = useCollectionData(productsRef, { idField: "id" });

  const [keyword, setKeyword] = useState("");
  const [cart, setCart] = useState([]);
  const [cash, setCash] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");

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

      const product = products?.find(
        (p) => p.barcode && p.barcode === scanned
      );

      if (product) {
        addToCart(product);
      } else {
        alert("Product not found!");
      }

      setBarcodeInput("");
    }
  };

  // =========================
  // CART FUNCTIONS
  // =========================
  const addToCart = (product) => {
    const existing = cart.find(
      (item) => item.id === product.id
    );

    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          ...product,
          qty: 1,
          price: product.salesPrice || 0,
        },
      ]);
    }
  };

  const updateQty = (id, change) => {
    setCart(
      cart
        .map((item) =>
          item.id === id
            ? { ...item, qty: item.qty + change }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const clearCart = () => setCart([]);

  const getTotal = () =>
    cart.reduce((sum, item) => sum + item.qty * item.price, 0);

  const change = cash - getTotal();

  // =========================
  // COMPLETE SALE
  // =========================
  const completeSale = async () => {
    if (!currentUser) return;

    if (paymentMethod === "cash" && change < 0) {
      alert("Insufficient cash");
      return;
    }

    await addDoc(
      collection(db, "users", currentUser.uid, "sales"),
      {
        items: cart,
        total: getTotal(),
        paymentMethod,
        createdAt: serverTimestamp(),
      }
    );

    for (const item of cart) {
      const productRef = doc(
        db,
        "users",
        currentUser.uid,
        "products",
        item.id
      );

      await updateDoc(productRef, {
        quantity: Math.max(
          (item.quantity || 0) - item.qty,
          0
        ),
      });
    }

    clearCart();
    setCash(0);
    alert("Sale Completed!");
  };

  const filteredProducts =
    products?.filter((p) =>
      p.name.toLowerCase().includes(keyword.toLowerCase())
    ) || [];

  return (
    <BillingLayout hideHeader>
      <div className="flex h-screen bg-gray-50">

        {/* LEFT - PRODUCTS */}
        <div className="w-1/2 border-r bg-white flex flex-col">

          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search product..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-9 h-10 border rounded-lg"
              />
            </div>

            {/* Barcode Input */}
            <div className="mt-3 relative">
              <ScanBarcode className="absolute left-3 top-3 text-emerald-500" size={16} />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeScan}
                placeholder="Scan barcode..."
                className="w-full pl-9 h-10 border border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-400"
                autoFocus
              />
            </div>
          </div>

          {/* Product List */}
          <div className="flex-1 overflow-y-auto">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className="flex justify-between p-3 border-b cursor-pointer hover:bg-gray-50"
              >
                <span>{product.name}</span>
                <span>₹{product.salesPrice}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT - CART */}
        <div className="w-1/2 flex flex-col bg-white">

          <div className="p-3 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} />
              <span className="font-semibold">Cart</span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-red-500 flex items-center gap-1"
              >
                <Trash2 size={14} /> Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-3 border-b"
              >
                <span>{item.name}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.id, -1)}>
                    <Minus size={14} />
                  </button>
                  <span>{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)}>
                    <Plus size={14} />
                  </button>
                </div>
                <span>₹{item.qty * item.price}</span>
              </div>
            ))}
          </div>

          {/* Payment Section */}
          <div className="p-4 border-t space-y-3">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>₹{getTotal()}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={`flex-1 p-2 border rounded ${paymentMethod === "cash" ? "bg-emerald-500 text-white" : ""
                  }`}
              >
                <IndianRupee size={16} /> Cash
              </button>
              <button
                onClick={() => setPaymentMethod("card")}
                className={`flex-1 p-2 border rounded ${paymentMethod === "card" ? "bg-blue-500 text-white" : ""
                  }`}
              >
                <CreditCard size={16} /> Card
              </button>
              <button
                onClick={() => setPaymentMethod("upi")}
                className={`flex-1 p-2 border rounded ${paymentMethod === "upi" ? "bg-purple-500 text-white" : ""
                  }`}
              >
                <Smartphone size={16} /> UPI
              </button>
            </div>

            {paymentMethod === "cash" && (
              <input
                type="number"
                placeholder="Cash received"
                value={cash}
                onChange={(e) => setCash(Number(e.target.value))}
                className="w-full border rounded p-2"
              />
            )}

            {paymentMethod === "cash" && (
              <div className="flex justify-between">
                <span>Change</span>
                <span>₹{change >= 0 ? change : 0}</span>
              </div>
            )}

            <button
              onClick={completeSale}
              className="w-full bg-emerald-600 text-white p-3 rounded-lg font-bold"
            >
              Complete Sale
            </button>
          </div>
        </div>
      </div>
    </BillingLayout>
  );
};

export default Billing;
