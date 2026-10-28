import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { posService } from '../../../../services/posService';
import { SALE_TYPES } from '../constants/posConstants';

const PosContext = createContext();

export const PosProvider = ({ children }) => {
  // Store & Catalog State
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Sale Type: COUNTER_SALE (walk-in) or DELIVERY_ORDER
  const [saleType, setSaleType] = useState(SALE_TYPES.COUNTER_SALE);

  // Customer State
  const [customer, setCustomer] = useState({
    isWalkIn: true,
    id: null,
    name: 'Walk-in Customer',
    phone: '',
    email: '',
    shippingAddress: {
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452001',
    },
  });

  // Cart State: Array of items
  const [cart, setCart] = useState([]);
  const [billDiscountPercent, setBillDiscountPercent] = useState(0);

  // Held Bills
  const [heldBills, setHeldBills] = useState([]);
  const [isLoadingHeldBills, setIsLoadingHeldBills] = useState(false);

  // Modals & UI Controls
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isHeldBillsModalOpen, setIsHeldBillsModalOpen] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);

  const showAlert = (msg, type = 'info') => {
    setAlertMessage({ text: msg, type });
    setTimeout(() => {
      setAlertMessage((prev) => (prev?.text === msg ? null : prev));
    }, 4000);
  };

  // 1. Initial Load of Stores & Held Bills
  useEffect(() => {
    const initData = async () => {
      try {
        const storeList = await posService.getStores();
        setStores(storeList);
        if (storeList.length > 0) {
          setSelectedStore(storeList[0]);
        }
      } catch (err) {
        console.error('Error fetching stores:', err);
      }

      try {
        const bills = await posService.getHeldBills();
        setHeldBills(bills);
      } catch (err) {
        console.error('Error fetching held bills:', err);
      }
    };
    initData();
  }, []);

  // 2. Fetch Products whenever Store, Category, or Search Query changes
  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const data = await posService.getProducts({
        search: searchQuery,
        category: selectedCategory,
        storeId: selectedStore?.id || '',
      });
      setProducts(data.products || []);
      if (data.categories?.length > 0) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [searchQuery, selectedCategory, selectedStore]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // 3. Add to Cart with Stock Checks
  const addToCart = (product, quantityToAdd = 1) => {
    const existingIndex = cart.findIndex(
      (item) => item.productId === (product._id || product.id)
    );
    const availableStock = Number(product.stock) || 0;

    if (availableStock <= 0) {
      showAlert(`"${product.name}" is currently out of stock.`, 'error');
      return false;
    }

    if (existingIndex >= 0) {
      const currentQty = cart[existingIndex].quantity;
      const newQty = currentQty + quantityToAdd;

      if (newQty > availableStock) {
        showAlert(
          `Cannot add more. Only ${availableStock} units available in stock for "${product.name}".`,
          'warning'
        );
        return false;
      }

      setCart((prev) =>
        prev.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                quantity: newQty,
                lineTotal: calculateItemLineTotal(
                  newQty,
                  item.salePrice,
                  item.discountPercent,
                  item.taxRate
                ),
              }
            : item
        )
      );
      showAlert(`Updated quantity for "${product.name}" to ${newQty}.`, 'success');
      return true;
    } else {
      if (quantityToAdd > availableStock) {
        showAlert(
          `Requested quantity (${quantityToAdd}) exceeds available stock (${availableStock}).`,
          'warning'
        );
        return false;
      }

      const salePrice = Number(product.salePrice) || Number(product.mrp) || 0;
      const taxRate = Number(product.taxRate) || 5;
      const discountPercent = 0;
      const lineTotal = calculateItemLineTotal(
        quantityToAdd,
        salePrice,
        discountPercent,
        taxRate
      );

      const newItem = {
        productId: product._id || product.id,
        name: product.name,
        sku: product.sku || '',
        barcode: product.barcode || '',
        image: product.image || product.mainImage || '',
        unit: product.unit || '1 pc',
        mrp: Number(product.mrp) || salePrice,
        salePrice,
        stock: availableStock,
        quantity: quantityToAdd,
        discountPercent,
        discountAmount: 0,
        taxRate,
        taxAmount: (lineTotal * taxRate) / (100 + taxRate),
        lineTotal,
      };

      setCart((prev) => [newItem, ...prev]);
      showAlert(`Added "${product.name}" to cart.`, 'success');
      return true;
    }
  };

  // Helper for line total calculation
  const calculateItemLineTotal = (qty, price, discPct, taxPct) => {
    const gross = qty * price;
    const discount = (gross * (discPct || 0)) / 100;
    const net = gross - discount;
    const tax = (net * (taxPct || 0)) / 100;
    return Math.round((net + tax) * 100) / 100;
  };

  // 4. Update Cart Item Quantity
  const updateQuantity = (productId, newQuantity) => {
    const qty = parseInt(newQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          if (qty > item.stock) {
            showAlert(
              `Maximum available stock for "${item.name}" is ${item.stock}.`,
              'warning'
            );
            return item;
          }
          return {
            ...item,
            quantity: qty,
            lineTotal: calculateItemLineTotal(
              qty,
              item.salePrice,
              item.discountPercent,
              item.taxRate
            ),
          };
        }
        return item;
      })
    );
  };

  // 5. Update Item-Level Discount
  const updateItemDiscount = (productId, discountPercent) => {
    const disc = Math.min(100, Math.max(0, Number(discountPercent) || 0));
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const gross = item.quantity * item.salePrice;
          const discVal = (gross * disc) / 100;
          return {
            ...item,
            discountPercent: disc,
            discountAmount: discVal,
            lineTotal: calculateItemLineTotal(
              item.quantity,
              item.salePrice,
              disc,
              item.taxRate
            ),
          };
        }
        return item;
      })
    );
  };

  // 6. Remove Cart Item
  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // 7. Clear Cart
  const clearCart = () => {
    setCart([]);
    setBillDiscountPercent(0);
  };

  // 8. Calculations Summary
  const billSummary = useMemo(() => {
    let subtotal = 0;
    let itemDiscountsTotal = 0;
    let rawTaxable = 0;
    let totalTax = 0;

    cart.forEach((it) => {
      const gross = it.quantity * it.salePrice;
      const disc = (gross * (it.discountPercent || 0)) / 100;
      const net = gross - disc;
      const tax = (net * (it.taxRate || 0)) / 100;

      subtotal += gross;
      itemDiscountsTotal += disc;
      rawTaxable += net;
      totalTax += tax;
    });

    const billDiscountAmount =
      (rawTaxable * (Number(billDiscountPercent) || 0)) / 100;
    const taxableAmount = Math.max(0, rawTaxable - billDiscountAmount);

    // Delivery charges apply only for delivery orders
    const deliveryCharge =
      saleType === SALE_TYPES.DELIVERY_ORDER ? (subtotal > 499 ? 0 : 35) : 0;

    const grandTotal = Math.round((taxableAmount + totalTax + deliveryCharge) * 100) / 100;

    const cgst = Math.round((totalTax / 2) * 100) / 100;
    const sgst = Math.round((totalTax / 2) * 100) / 100;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      itemDiscountsTotal: Math.round(itemDiscountsTotal * 100) / 100,
      billDiscountPercent: Number(billDiscountPercent) || 0,
      billDiscountAmount: Math.round(billDiscountAmount * 100) / 100,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      gstTotal: Math.round(totalTax * 100) / 100,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: 0,
      deliveryCharge,
      grandTotal,
      itemsCount: cart.reduce((acc, it) => acc + it.quantity, 0),
    };
  }, [cart, billDiscountPercent, saleType]);

  // 9. Hold Current Bill
  const holdCurrentBill = async (customLabel = '') => {
    if (cart.length === 0) {
      showAlert('Cart is empty. Nothing to put on hold.', 'warning');
      return;
    }

    const payload = {
      heldLabel:
        customLabel ||
        `Bill #${Date.now().toString().slice(-4)} (${customer.name})`,
      store: selectedStore,
      customer,
      items: cart,
      subtotal: billSummary.subtotal,
      billDiscountPercent,
      grandTotal: billSummary.grandTotal,
      saleType,
    };

    try {
      const res = await posService.holdBill(payload);
      if (res.success) {
        setHeldBills((prev) => [res.heldBill, ...prev]);
        clearCart();
        showAlert('Current bill put on hold successfully.', 'success');
      }
    } catch (err) {
      showAlert('Failed to put bill on hold: ' + err.message, 'error');
    }
  };

  // 10. Resume Held Bill
  const resumeHeldBill = (billId) => {
    const bill = heldBills.find((b) => b._id === billId || b.id === billId);
    if (!bill) return;

    if (cart.length > 0) {
      if (
        !window.confirm(
          'Your active cart will be replaced with the held bill items. Continue?'
        )
      ) {
        return;
      }
    }

    if (bill.store) setSelectedStore(bill.store);
    if (bill.customer) setCustomer(bill.customer);
    if (bill.saleType) setSaleType(bill.saleType);
    if (bill.billDiscountPercent !== undefined) {
      setBillDiscountPercent(bill.billDiscountPercent);
    }

    // Revalidate items against current catalog
    const restoredItems = (bill.items || []).map((it) => {
      const matching = products.find(
        (p) => (p._id || p.id) === (it.productId || it.product)
      );
      const stock = matching ? matching.stock : it.stock || 50;
      return {
        ...it,
        productId: it.productId || it.product,
        stock,
        quantity: Math.min(it.quantity, stock > 0 ? stock : it.quantity),
        lineTotal: calculateItemLineTotal(
          it.quantity,
          it.salePrice,
          it.discountPercent || 0,
          it.taxRate || 5
        ),
      };
    });

    setCart(restoredItems);
    deleteHeldBill(billId, false);
    setIsHeldBillsModalOpen(false);
    showAlert(`Resumed held bill "${bill.heldLabel}".`, 'info');
  };

  // 11. Delete Held Bill
  const deleteHeldBill = async (billId, notify = true) => {
    try {
      await posService.deleteHeldBill(billId);
      setHeldBills((prev) =>
        prev.filter((b) => b._id !== billId && b.id !== billId)
      );
      if (notify) showAlert('Held bill removed.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  // 12. Complete Counter Sale
  const completeCounterSale = async (paymentData) => {
    if (cart.length === 0) {
      showAlert('Cart is empty.', 'warning');
      return { success: false };
    }

    const payload = {
      store: {
        storeId: selectedStore?.id,
        storeName: selectedStore?.storeName || 'Indore Hub',
        phone: selectedStore?.phone || '',
        address: selectedStore?.address || '',
        gstin: selectedStore?.gstin || '',
      },
      customer: {
        isWalkIn: customer.isWalkIn,
        userId: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
      items: cart,
      subtotal: billSummary.subtotal,
      itemDiscountsTotal: billSummary.itemDiscountsTotal,
      billDiscountPercent: billSummary.billDiscountPercent,
      billDiscountAmount: billSummary.billDiscountAmount,
      taxableAmount: billSummary.taxableAmount,
      gstTotal: billSummary.gstTotal,
      cgstAmount: billSummary.cgstAmount,
      sgstAmount: billSummary.sgstAmount,
      igstAmount: billSummary.igstAmount,
      deliveryCharge: 0,
      grandTotal: billSummary.grandTotal,
      payment: paymentData,
    };

    try {
      const res = await posService.completeCounterSale(payload);
      if (res.success) {
        setLastCompletedSale(res.sale);
        clearCart();
        setIsCheckoutModalOpen(false);
        setIsReceiptModalOpen(true);
        showAlert(
          `Counter Sale completed! Invoice: ${res.invoiceNumber}`,
          'success'
        );
        // Refresh products to update live inventory stock
        loadProducts();
        return { success: true, sale: res.sale };
      }
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  // 13. Create Delivery Order via POS
  const createDeliveryOrder = async (paymentData, deliverySlot) => {
    if (cart.length === 0) {
      showAlert('Cart is empty.', 'warning');
      return { success: false };
    }

    if (!customer.shippingAddress?.addressLine1) {
      showAlert(
        'Delivery address is required for Delivery Orders. Please update customer details.',
        'warning'
      );
      setIsCustomerModalOpen(true);
      return { success: false };
    }

    const payload = {
      store: {
        storeId: selectedStore?.id,
        storeName: selectedStore?.storeName || 'Indore Hub',
        phone: selectedStore?.phone || '',
        address: selectedStore?.address || '',
        gstin: selectedStore?.gstin || '',
      },
      customer: {
        isWalkIn: false,
        userId: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        shippingAddress: customer.shippingAddress,
      },
      items: cart,
      subtotal: billSummary.subtotal,
      itemDiscountsTotal: billSummary.itemDiscountsTotal,
      billDiscountPercent: billSummary.billDiscountPercent,
      billDiscountAmount: billSummary.billDiscountAmount,
      taxableAmount: billSummary.taxableAmount,
      gstTotal: billSummary.gstTotal,
      cgstAmount: billSummary.cgstAmount,
      sgstAmount: billSummary.sgstAmount,
      igstAmount: billSummary.igstAmount,
      deliveryCharge: billSummary.deliveryCharge,
      grandTotal: billSummary.grandTotal,
      payment: paymentData,
      deliverySlot: deliverySlot || 'Standard Delivery (20-30 mins)',
    };

    try {
      const res = await posService.createPosDeliveryOrder(payload);
      if (res.success) {
        setLastCompletedSale(res.sale);
        clearCart();
        setIsCheckoutModalOpen(false);
        setIsReceiptModalOpen(true);
        showAlert(
          `Delivery Order ${res.orderId} created! Invoice: ${res.invoiceNumber}`,
          'success'
        );
        loadProducts();
        return { success: true, sale: res.sale };
      }
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  // 14. Hardware Barcode Scanner Listener
  // Catches rapid character input (within 40ms) terminating with Enter
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      // Don't intercept if user is typing inside an input or textarea
      const targetTag = e.target.tagName.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        return;
      }

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          const barcodeScanned = buffer.trim();
          // Find matching product
          const found = products.find(
            (p) =>
              (p.barcode && p.barcode.toLowerCase() === barcodeScanned.toLowerCase()) ||
              (p.sku && p.sku.toLowerCase() === barcodeScanned.toLowerCase())
          );

          if (found) {
            addToCart(found, 1);
          } else {
            showAlert(`Barcode "${barcodeScanned}" not found in catalog.`, 'warning');
          }
          buffer = '';
        }
      } else if (e.key.length === 1) {
        // Fast sequence typical of barcode gun
        if (diff > 120) {
          buffer = ''; // reset buffer if typing was slow (manual keying)
        }
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, cart]);

  const value = {
    // Stores & Products
    stores,
    selectedStore,
    setSelectedStore,
    products,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    isLoadingProducts,
    loadProducts,

    // Sale type & Customer
    saleType,
    setSaleType,
    customer,
    setCustomer,

    // Cart & Summary
    cart,
    addToCart,
    updateQuantity,
    updateItemDiscount,
    removeFromCart,
    clearCart,
    billDiscountPercent,
    setBillDiscountPercent,
    billSummary,

    // Held Bills
    heldBills,
    isLoadingHeldBills,
    holdCurrentBill,
    resumeHeldBill,
    deleteHeldBill,

    // Transactions
    completeCounterSale,
    createDeliveryOrder,
    lastCompletedSale,
    setLastCompletedSale,

    // Modals
    isCustomerModalOpen,
    setIsCustomerModalOpen,
    isCheckoutModalOpen,
    setIsCheckoutModalOpen,
    isReceiptModalOpen,
    setIsReceiptModalOpen,
    isHeldBillsModalOpen,
    setIsHeldBillsModalOpen,

    // Alert
    alertMessage,
    showAlert,
  };

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
};

export const usePos = () => {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
};

export default PosContext;
