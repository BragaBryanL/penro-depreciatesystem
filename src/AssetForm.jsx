import { useState, useEffect } from "react";
import { ppeClassesData, officesData, fundClusters, calculateDepreciation } from "./data/ppeClasses";
import { CalculatorIcon, CalendarIcon, DocumentTextIcon, BuildingOfficeIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";

export default function AssetForm({ asset = null, onAssetSaved, onCancel }) {
  // Manual Input Fields
  const [entityName, setEntityName] = useState("");
  const [fundCluster, setFundCluster] = useState("");
  const [propertyNumber, setPropertyNumber] = useState("");
  const [office, setOffice] = useState("");
  const [ppeClass, setPpeClass] = useState("");
  const [description, setDescription] = useState("");
  const [dateAcquired, setDateAcquired] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState("");

  // Automatic/Read-only Fields
  const [accountCode, setAccountCode] = useState("");
  const [usefulLife, setUsefulLife] = useState("");
  const [rateOfDepreciation, setRateOfDepreciation] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [residualValue, setResidualValue] = useState("");
  const [depreciableAmount, setDepreciableAmount] = useState("");
  const [annualDepreciation, setAnnualDepreciation] = useState("");
  const [accumulatedDepreciation, setAccumulatedDepreciation] = useState("0");
  const [netBookValue, setNetBookValue] = useState("");

  // Additional Fields
  const [remarks, setRemarks] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // Populate form when editing existing asset
  useEffect(() => {
    if (asset) {
      setEntityName(asset.entityName || "DENR - Provincial Environment and Natural Resources Office (PENRO)");
      setFundCluster(asset.fundCluster || "Regular Agency Fund");
      setPropertyNumber(asset.propertyNumber || "");
      setOffice(asset.office || "");
      setPpeClass(asset.ppeClass || "");
      setDescription(asset.description || "");
      setDateAcquired(asset.dateAcquired || "");
      setReference(asset.reference || "");
      setReceipt(asset.receipt || "");
      setQuantity(asset.quantity || 1);
      setUnitCost(asset.unitCost?.toString() || "");
      setAccountCode(asset.accountCode || "");
      setUsefulLife(asset.usefulLife?.toString() || "");
      setRateOfDepreciation(asset.rateOfDepreciation?.toString() || "");
      setTotalCost(asset.totalCost?.toString() || "");
      setResidualValue(asset.residualValue?.toString() || "");
      setDepreciableAmount(asset.depreciableAmount?.toString() || "");
      setAnnualDepreciation(asset.annualDepreciation?.toString() || "");
      setAccumulatedDepreciation(asset.accumulatedDepreciation?.toString() || "0");
      setNetBookValue(asset.netBookValue?.toString() || "");
      setRemarks(asset.remarks || "");
    }
  }, [asset]);

  // Handle PPE Class selection - Auto-fill Account Code, Useful Life, Rate
  const handlePPEClassChange = (e) => {
    const selected = e.target.value;
    setPpeClass(selected);

    if (selected && ppeClassesData[selected]) {
      const data = ppeClassesData[selected];
      setAccountCode(data.accountCode);
      setUsefulLife(data.usefulLife?.toString() || "");
      setRateOfDepreciation(data.rateOfDepreciation?.toString() || "");
    } else {
      setAccountCode("");
      setUsefulLife("");
      setRateOfDepreciation("");
    }

    recalculateDepreciation(unitCost, quantity, usefulLife);
  };

  // Handle cost change - recalculate totals
  const handleCostChange = (e) => {
    const value = e.target.value;
    setUnitCost(value);
    recalculateDepreciation(value, quantity, usefulLife);
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    setQuantity(value);
    recalculateDepreciation(unitCost, value, usefulLife);
  };

  // Calculate years since acquisition
  const calculateYearsUsed = (acquisitionDate) => {
    if (!acquisitionDate) return 0;
    const acquired = new Date(acquisitionDate);
    const now = new Date();
    const years = (now - acquired) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, Math.floor(years));
  };

  // Automatic depreciation calculations
  const recalculateDepreciation = (cost, qty = quantity, life = usefulLife, dateAcq = dateAcquired) => {
    const total = (parseFloat(cost) || 0) * qty;
    setTotalCost(total.toFixed(2));

    if (cost && life && parseInt(life) > 0) {
      const yearsUsed = calculateYearsUsed(dateAcq);
      const depreciation = calculateDepreciation(total, parseInt(life), yearsUsed);
      setResidualValue(depreciation.residualValue.toFixed(2));
      setDepreciableAmount(depreciation.depreciableAmount.toFixed(2));
      setAnnualDepreciation(depreciation.annualDepreciation.toFixed(2));
      setAccumulatedDepreciation(depreciation.accumulatedDepreciation.toFixed(2));
      setNetBookValue(depreciation.netBookValue.toFixed(2));
    } else {
      setResidualValue("0.00");
      setDepreciableAmount("0.00");
      setAnnualDepreciation("0.00");
      setAccumulatedDepreciation("0.00");
      setNetBookValue(total.toFixed(2));
    }
  };

  // Update calculations when useful life or date acquired changes
  useEffect(() => {
    if (unitCost && usefulLife) {
      recalculateDepreciation(unitCost, quantity, usefulLife, dateAcquired);
    }
  }, [usefulLife, dateAcquired]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");

    const assetData = {
      entityName,
      fundCluster,
      propertyNumber,
      office,
      ppeClass,
      description,
      accountCode,
      usefulLife: usefulLife ? parseInt(usefulLife) : null,
      rateOfDepreciation: rateOfDepreciation ? parseFloat(rateOfDepreciation) : null,
      dateAcquired,
      reference,
      receipt,
      quantity: parseInt(quantity),
      unitCost: parseFloat(unitCost),
      totalCost: parseFloat(totalCost),
      residualValue: parseFloat(residualValue) || 0,
      depreciableAmount: parseFloat(depreciableAmount) || 0,
      annualDepreciation: parseFloat(annualDepreciation) || 0,
      accumulatedDepreciation: parseFloat(accumulatedDepreciation) || 0,
      netBookValue: parseFloat(netBookValue) || 0,
      remarks
    };

    try {
      let response;
      if (asset && asset.id) {
        // Update existing asset
        response = await fetch(`http://localhost:4000/api/assets/${asset.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assetData)
        });
      } else {
        // Create new asset
        response = await fetch("http://localhost:4000/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assetData)
        });
      }

      if (response.ok) {
        setSuccessMessage(asset && asset.id ? "Asset updated successfully!" : "Asset saved successfully!");
        resetForm();
        if (onAssetSaved) {
          onAssetSaved();
        }
      } else {
        alert("Failed to save asset. Please try again.");
      }
    } catch (error) {
      console.error("Error saving asset:", error);
      alert("Error connecting to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEntityName("");
    setFundCluster("");
    setPropertyNumber("");
    setOffice("");
    setPpeClass("");
    setDescription("");
    setDateAcquired("");
    setReference("");
    setReceipt("");
    setQuantity(1);
    setUnitCost("");
    setAccountCode("");
    setUsefulLife("");
    setRateOfDepreciation("");
    setTotalCost("");
    setResidualValue("");
    setDepreciableAmount("");
    setAnnualDepreciation("");
    setAccumulatedDepreciation("0");
    setNetBookValue("");
    setRemarks("");
  };

  const ppeOptions = Object.keys(ppeClassesData);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Manual Inputs - Entity & Location */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center gap-3">
            <BuildingOfficeIcon className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Entity & Location</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Entity Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fund Cluster <span className="text-red-500">*</span>
                </label>
                <select
                  value={fundCluster}
                  onChange={(e) => setFundCluster(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50"
                >
                  <option value="">Select Fund Cluster</option>
                  {fundClusters.map((cluster) => (
                    <option key={cluster} value={cluster}>{cluster}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Property Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={propertyNumber}
                  onChange={(e) => setPropertyNumber(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Office / Place <span className="text-red-500">*</span>
                </label>
                <select
                  value={office}
                  onChange={(e) => setOffice(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50"
                >
                  <option value="">Select Office</option>
                  {officesData.map((off) => (
                    <option key={off} value={off}>{off}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Manual Inputs - PPE Details */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center gap-3">
            <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Property Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  PPE Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={ppeClass}
                  onChange={handlePPEClassChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50"
                >
                  <option value="">Select PPE Class</option>
                  {ppeOptions.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Property Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Manual Inputs - Acquisition */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Acquisition Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date Acquired <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateAcquired}
                  onChange={(e) => setDateAcquired(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reference (Voucher/Invoice)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Receipt
                </label>
                <input
                  type="text"
                  value={receipt}
                  onChange={(e) => setReceipt(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={handleQuantityChange}
                  min="1"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Unit Cost <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₱</span>
                  <input
                    type="number"
                    value={unitCost}
                    onChange={handleCostChange}
                    step="0.01"
                    min="0"
                    required
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Automatic/Computed Values */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center gap-3">
            <CalculatorIcon className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Automatic Calculations</h3>
          </div>
          <div className="p-6">
            {/* PPE Classification Details */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">PPE Classification</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Account Code</label>
                  <input
                    type="text"
                    value={accountCode}
                    readOnly
                    className="w-full px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-mono font-semibold"
                    placeholder="Auto-filled"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Useful Life</label>
                  <input
                    type="text"
                    value={usefulLife ? `${usefulLife} years` : ""}
                    readOnly
                    className="w-full px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-semibold"
                    placeholder="Auto-filled"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Rate of Depreciation</label>
                  <input
                    type="text"
                    value={rateOfDepreciation ? `${rateOfDepreciation}%` : ""}
                    readOnly
                    className="w-full px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-semibold"
                    placeholder="Auto-filled"
                  />
                </div>
              </div>
            </div>

            {/* Cost Calculations */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Cost & Depreciation</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Total Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">₱</span>
                    <input
                      type="text"
                      value={totalCost}
                      readOnly
                      className="w-full pl-7 pr-3 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-blue-800 font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Residual Value (5%)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">₱</span>
                    <input
                      type="text"
                      value={residualValue}
                      readOnly
                      className="w-full pl-7 pr-3 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Depreciable Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">₱</span>
                    <input
                      type="text"
                      value={depreciableAmount}
                      readOnly
                      className="w-full pl-7 pr-3 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Annual Depreciation</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-bold">₱</span>
                    <input
                      type="text"
                      value={annualDepreciation}
                      readOnly
                      className="w-full pl-7 pr-3 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Accumulated Depreciation</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-600 font-bold">₱</span>
                    <input
                      type="text"
                      value={accumulatedDepreciation}
                      readOnly
                      className="w-full pl-7 pr-3 py-3 bg-orange-50 border-2 border-orange-200 rounded-xl text-orange-800 font-semibold"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Net Book Value</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white font-bold">₱</span>
                    <input
                      type="text"
                      value={netBookValue}
                      readOnly
                      className="w-full pl-7 pr-3 py-4 bg-gradient-to-r from-green-600 to-green-700 border-2 border-green-600 rounded-xl text-white font-bold text-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Remarks */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-4 flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-white" />
            <h3 className="text-lg font-bold text-white">Remarks</h3>
          </div>
          <div className="p-6">
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-gray-50 resize-none"
              placeholder="Additional notes or remarks..."
              rows="3"
            ></textarea>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-3 border-2 border-red-300 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-3 border-2 border-amber-300 text-amber-600 font-semibold rounded-xl hover:bg-amber-50 transition-colors"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Save Asset
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
