import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Truck,
  Building,
  Package,
  Calendar,
  AlertCircle,
  Eye,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useDeliveryChallan } from '../context/DeliveryChallanContext';
import DeliveryChallanPreviewModal from '../components/DeliveryChallanPreviewModal';
import { formatDate } from '../utils/deliveryChallanPdfGenerator';

export const EditDeliveryChallan = ({ onNavigate, challanData }) => {
  const { updateChallan, finalizeChallan, fetchChallanById } = useDeliveryChallan();

  const [challan, setChallan] = useState(challanData || null);
  const [loading, setLoading] = useState(!challanData);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Editable fields
  const [challanDate, setChallanDate] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [purpose, setPurpose] = useState('Supply on Sale');
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [ewayBillNumber, setEwayBillNumber] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [dispatchItems, setDispatchItems] = useState([]);

  // Preview
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (challanData) {
      initFields(challanData);
    } else if (challan?._id) {
      initFields(challan);
    }
  }, [challanData]);

  const initFields = (data) => {
    setChallan(data);
    setChallanDate(data.challanDate ? new Date(data.challanDate).toISOString().split('T')[0] : '');
    setDispatchDate(data.dispatchDate ? new Date(data.dispatchDate).toISOString().split('T')[0] : '');
    setExpectedDeliveryDate(
      data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate).toISOString().split('T')[0] : ''
    );
    setPurpose(data.purpose || 'Supply on Sale');
    setTransporterName(data.transportDetails?.transporterName || '');
    setVehicleNumber(data.transportDetails?.vehicleNumber || '');
    setLrNumber(data.transportDetails?.lrNumber || '');
    setEwayBillNumber(data.transportDetails?.ewayBillNumber || '');
    setShippingNotes(data.shippingNotes || '');

    // Clone items
    setDispatchItems(
      (data.items || []).map((i) => ({
        ...i,
        dispatchedQuantity: Number(i.dispatchedQuantity) || 0,
        remainingQuantity: Number(i.remainingQuantity) || 0,
      }))
    );
    setLoading(false);
  };

  const handleQuantityChange = (idx, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setDispatchItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], dispatchedQuantity: num };
      return copy;
    });
  };

  const totalDispatched = dispatchItems.reduce(
    (sum, i) => sum + (Number(i.dispatchedQuantity) || 0),
    0
  );

  const handleSaveUpdate = async (andFinalize = false) => {
    setValidationError('');
    if (!challan) return;

    if (challan.status !== 'Draft') {
      setValidationError('Only Draft challans can be modified.');
      return;
    }

    if (andFinalize && totalDispatched <= 0) {
      setValidationError('Total dispatched quantity must be greater than zero to dispatch.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        challanDate: new Date(challanDate),
        dispatchDate: new Date(dispatchDate),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        purpose,
        transportDetails: {
          transporterName: transporterName.trim(),
          vehicleNumber: vehicleNumber.trim().toUpperCase(),
          lrNumber: lrNumber.trim().toUpperCase(),
          ewayBillNumber: ewayBillNumber.trim().toUpperCase(),
        },
        shippingNotes: shippingNotes.trim(),
        items: dispatchItems,
        status: andFinalize ? 'Dispatched' : 'Draft',
      };

      const res = await updateChallan(challan._id, payload);
      if (res.success) {
        if (onNavigate) {
          onNavigate('delivery_challans/details', res.challan);
        }
      }
    } catch (err) {
      setValidationError(err.response?.data?.message || err.message || 'Failed to update draft challan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3">
        <RefreshCw size={32} className="animate-spin mx-auto text-[#1A2E0A]" />
        <p className="text-sm font-medium">Loading draft challan...</p>
      </div>
    );
  }

  if (challan && challan.status !== 'Draft') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
        <h3 className="text-base font-bold text-slate-800">Cannot Edit Finalized Challan</h3>
        <p className="text-xs text-slate-500">
          Challan #{challan.challanNumber} is currently in "{challan.status}" status. Only Draft challans can be edited.
        </p>
        <button
          onClick={() => onNavigate && onNavigate('delivery_challans/details', challan)}
          className="px-4 py-2 bg-[#1A2E0A] text-white text-xs font-bold rounded-xl"
        >
          View Challan Details
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate && onNavigate('delivery_challans')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Edit Draft Challan</span>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                #{challan?.challanNumber}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Modify dispatch details and goods quantities before finalization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <Eye size={15} />
            <span>Preview</span>
          </button>

          <button
            onClick={() => handleSaveUpdate(false)}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save size={15} />
            <span>Save Draft Changes</span>
          </button>

          <button
            onClick={() => handleSaveUpdate(true)}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#1A2E0A] hover:bg-[#253f10] text-white transition shadow-md cursor-pointer disabled:opacity-50"
          >
            <Truck size={15} className="text-[#F7941D]" />
            <span>Finalize & Dispatch</span>
          </button>
        </div>
      </div>

      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Package size={18} className="text-[#1A2E0A]" />
          <span>Dispatch Items</span>
        </h2>

        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1A2E0A] text-white font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3 text-center">Unit</th>
                <th className="py-2.5 px-3 text-center">Ordered</th>
                <th className="py-2.5 px-3 text-center">Prev. Disp</th>
                <th className="py-2.5 px-3 text-center w-36 bg-[#253f10]">Dispatch Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {dispatchItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3">
                    <p className="font-bold text-slate-900">{item.name}</p>
                    {item.variantTitle && <span className="text-[11px] text-slate-500">{item.variantTitle}</span>}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600">{item.unit || 'Units'}</td>
                  <td className="py-2.5 px-3 text-center text-slate-700">{item.orderedQuantity}</td>
                  <td className="py-2.5 px-3 text-center text-slate-500">{item.previouslyDispatchedQuantity || 0}</td>
                  <td className="py-2.5 px-3 text-center bg-slate-50">
                    <input
                      type="number"
                      min="0"
                      value={item.dispatchedQuantity}
                      onChange={(e) => handleQuantityChange(idx, e.target.value)}
                      className="w-20 text-center font-bold py-1 px-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-[#F7941D]"
                    />
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold border-t border-slate-300">
                <td colSpan={5} className="py-2.5 px-3 text-right">
                  TOTAL DISPATCH UNITS
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-950 font-black text-sm bg-amber-100">
                  {totalDispatched}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Transport & Dates Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Truck size={18} className="text-[#1A2E0A]" />
          <span>Transport & Dispatch Information</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Challan Date</label>
            <input
              type="date"
              value={challanDate}
              onChange={(e) => setChallanDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Dispatch Date</label>
            <input
              type="date"
              value={dispatchDate}
              onChange={(e) => setDispatchDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Purpose</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
            >
              <option value="Supply on Sale">Supply on Sale</option>
              <option value="Job Work">Job Work</option>
              <option value="Exhibition / Demo">Exhibition / Demo</option>
              <option value="For Approval">For Approval</option>
              <option value="Transfer / Shift">Transfer / Shift</option>
              <option value="Replacement">Replacement</option>
              <option value="Returnable">Returnable</option>
              <option value="Others">Others</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Transporter Name</label>
            <input
              type="text"
              value={transporterName}
              onChange={(e) => setTransporterName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Vehicle Number</label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none uppercase font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">LR / Docket Number</label>
            <input
              type="text"
              value={lrNumber}
              onChange={(e) => setLrNumber(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none uppercase font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1 text-xs">Shipping Notes</label>
          <textarea
            rows={2}
            value={shippingNotes}
            onChange={(e) => setShippingNotes(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs"
          />
        </div>
      </div>

      {/* Preview Modal */}
      <DeliveryChallanPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        challan={{
          ...challan,
          challanDate: new Date(challanDate),
          dispatchDate: new Date(dispatchDate),
          purpose,
          transportDetails: {
            transporterName,
            vehicleNumber,
            lrNumber,
            ewayBillNumber,
          },
          items: dispatchItems,
          totalDispatchedQuantity: totalDispatched,
          shippingNotes,
        }}
      />
    </div>
  );
};

export default EditDeliveryChallan;
