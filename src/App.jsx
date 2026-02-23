import { useState, useEffect, useRef } from "react";
import Navbar from "./Navbar";
import AssetForm from "./AssetForm";
import StatsCards from "./StatsCards";
import * as XLSX from "xlsx";
import { 
  ClipboardDocumentListIcon, 
  ClipboardDocumentIcon, 
  ChartBarIcon, 
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  DocumentChartBarIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

export default function App() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingAsset, setEditingAsset] = useState(null);
  const [selectedAssets, setSelectedAssets] = useState([]);
  
  // Modal states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDisposalModal, setShowDisposalModal] = useState(false);
  const [showCOAModal, setShowCOAModal] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  
  // Data states
  const [assetHistory, setAssetHistory] = useState([]);
  const [depreciationLog, setDepreciationLog] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [disposals, setDisposals] = useState([]);
  const [coAsset, setCoAsset] = useState(null);
  
  // Form states
  const [transferForm, setTransferForm] = useState({ assetId: '', fromOffice: '', toOffice: '', transferDate: '', transferReason: '', transferredBy: '', receivedBy: '' });
  const [disposalForm, setDisposalForm] = useState({ assetId: '', disposalDate: '', disposalMethod: '', disposalReason: '', proceeds: 0, bookValueAtDisposal: 0, approvedBy: '' });

  const printRef = useRef(null);

  // Fetch assets from server
  const fetchAssets = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/assets");
      if (response.ok) {
        const data = await response.json();
        setAssets(data);
        const selectedIds = data.filter(a => a.selected).map(a => a.id);
        setSelectedAssets(selectedIds);
      } else {
        setError("Failed to fetch assets");
      }
    } catch {
      setError("Cannot connect to server. Make sure the server is running on port 4000.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    try {
      const [historyRes, depreciationRes, transfersRes, disposalsRes] = await Promise.all([
        fetch("http://localhost:4000/api/history"),
        fetch("http://localhost:4000/api/depreciation-log"),
        fetch("http://localhost:4000/api/transfers"),
        fetch("http://localhost:4000/api/disposals")
      ]);
      
      if (historyRes.ok) setAssetHistory(await historyRes.json());
      if (depreciationRes.ok) setDepreciationLog(await depreciationRes.json());
      if (transfersRes.ok) setTransfers(await transfersRes.json());
      if (disposalsRes.ok) setDisposals(await disposalsRes.json());
    } catch {
      console.error("Error fetching data");
    }
  };

  // Toggle asset selection
  const toggleAssetSelection = async (id) => {
    const isSelected = selectedAssets.includes(id);
    const newSelected = isSelected
      ? selectedAssets.filter(aid => aid !== id)
      : [...selectedAssets, id];
    
    setSelectedAssets(newSelected);
    
    try {
      await fetch(`http://localhost:4000/api/assets/${id}/select`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected: !isSelected })
      });
    } catch {
      console.error("Error updating selection");
    }
  };

  // Select all assets
  const selectAllAssets = async () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([]);
      try {
        await fetch("http://localhost:4000/api/assets/clear-selections", { method: "PUT" });
      } catch {
        console.error("Error clearing selections");
      }
    } else {
      const allIds = filteredAssets.map(a => a.id);
      setSelectedAssets(allIds);
      for (const asset of filteredAssets) {
        try {
          await fetch(`http://localhost:4000/api/assets/${asset.id}/select`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ selected: true })
          });
        } catch {
          console.error("Error selecting asset");
        }
      }
    }
  };

  // Delete asset
  const deleteAsset = async (id) => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
      try {
        const response = await fetch(`http://localhost:4000/api/assets/${id}`, { method: "DELETE" });
        if (response.ok) {
          setSelectedAssets(prev => prev.filter(aid => aid !== id));
          fetchAssets();
          fetchAllData();
        }
      } catch {
        alert("Failed to delete asset");
      }
    }
  };

  // Create transfer
  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:4000/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transferForm)
      });
      if (response.ok) {
        alert("Transfer record created successfully!");
        setShowTransferModal(false);
        setTransferForm({ assetId: '', fromOffice: '', toOffice: '', transferDate: '', transferReason: '', transferredBy: '', receivedBy: '' });
        fetchAssets();
        fetchAllData();
      }
    } catch {
      alert("Error creating transfer");
    }
  };

  // Create disposal
  const handleCreateDisposal = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:4000/api/disposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(disposalForm)
      });
      if (response.ok) {
        alert("Disposal record created successfully!");
        setShowDisposalModal(false);
        setDisposalForm({ assetId: '', disposalDate: '', disposalMethod: '', disposalReason: '', proceeds: 0, bookValueAtDisposal: 0, approvedBy: '' });
        fetchAssets();
        fetchAllData();
      }
    } catch {
      alert("Error creating disposal");
    }
  };

  // Generate depreciation log
  const handleGenerateDepreciation = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/depreciation-log/generate-all", { method: "POST" });
      if (response.ok) {
        alert("Depreciation log generated successfully!");
        fetchAllData();
      }
    } catch {
      alert("Error generating depreciation log");
    }
  };

  // Generate COA Form for single asset
  const handleGenerateCOA = async (asset) => {
    try {
      await fetch("http://localhost:4000/api/depreciation-log/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id })
      });
      fetchAllData();
    } catch {
      // Ignore errors
    }
    setCoAsset(asset);
    setShowDownloadOptions(false);
    setShowCOAModal(true);
  };

  // Print function
  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>COA Property Card</title>');
    printWindow.document.write('<style>body{font-family:Arial,sans-serif;padding:20px} table{width:100%;border-collapse:collapse;margin-top:20px} th,td{border:1px solid #000;padding:8px;text-align:left} th{background:#f0f0f0}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Download using template - Appendix 70 format
  const downloadWithTemplate = async () => {
    if (!coAsset) return;
    
    try {
      // Fetch the template file
      const response = await fetch('/Appendix 70 - PPELC.xls');
      const arrayBuffer = await response.arrayBuffer();
      
      // Parse the template
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Get depreciation data for this asset
      const depData = depreciationLog.filter(d => d.assetId === coAsset.id).sort((a, b) => a.year - b.year);
      
      // Fill in header information based on your template structure:
      worksheet['A1'] = { t: 's', v: 'Appendix 70' };
      worksheet['A2'] = { t: 's', v: 'PROPERTY, PLANT AND EQUIPMENT LEDGER CARD' };
      worksheet['A3'] = { t: 's', v: 'Entity Name:' };
      worksheet['A4'] = { t: 's', v: 'Fund Cluster:' };
      worksheet['A5'] = { t: 's', v: 'Property, Plant and Equipment:' };
      worksheet['B6'] = { t: 's', v: 'Object Account Code:' };
      worksheet['C6'] = { t: 's', v: coAsset.accountCode || '' };
      worksheet['B7'] = { t: 's', v: 'Estimated Useful Life:' };
      worksheet['C7'] = { t: 's', v: coAsset.usefulLife || '' };
      worksheet['D7'] = { t: 's', v: 'Rate of Depreciation:' };
      
      // Add initial property entry in row 9
      const startRow = 9;
      worksheet[`A${startRow}`] = { t: 's', v: coAsset.dateAcquired || '' };
      worksheet[`B${startRow}`] = { t: 's', v: coAsset.propertyNumber || '' };
      worksheet[`C${startRow}`] = { t: 'n', v: parseFloat(coAsset.quantity) || 1 };
      worksheet[`D${startRow}`] = { t: 'n', v: parseFloat(coAsset.unitCost) || 0 };
      worksheet[`E${startRow}`] = { t: 'n', v: parseFloat(coAsset.totalCost) || parseFloat(coAsset.unitCost) || 0 };
      worksheet[`F${startRow}`] = { t: 'n', v: 0 };
      worksheet[`I${startRow}`] = { t: 'n', v: parseFloat(coAsset.totalCost) || parseFloat(coAsset.unitCost) || 0 };
      
      // Add depreciation entries starting from row 10
      let row = startRow + 1;
      depData.forEach((d) => {
        worksheet[`A${row}`] = { t: 's', v: `Depreciation ${d.year}` };
        worksheet[`B${row}`] = { t: 's', v: d.year.toString() };
        worksheet[`F${row}`] = { t: 'n', v: parseFloat(d.accumulatedDepreciation) || 0 };
        worksheet[`I${row}`] = { t: 'n', v: parseFloat(d.endingBookValue) || 0 };
        row++;
      });
      
      // Generate and download
      const excelBuffer = XLSX.write(workbook, { bookType: 'xls', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PPELC_${coAsset.propertyNumber || 'export'}.xls`;
      a.click();
    } catch (err) {
      console.error("Error with template:", err);
      alert("Template file not found or error. Downloading with default format instead.");
      exportToCSV();
    }
    setShowDownloadOptions(false);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!coAsset) return;
    const data = depreciationLog.filter(d => d.assetId === coAsset.id);
    let csv = 'Property Number,Date Acquired,Description,PPE Class,Office,Account Code,Quantity,Unit Cost\n';
    csv += `${coAsset.propertyNumber || ''},${coAsset.dateAcquired || ''},${coAsset.description || ''},${coAsset.ppeClass || ''},${coAsset.office || ''},${coAsset.accountCode || ''},${coAsset.quantity || 1},${coAsset.unitCost || 0}\n\n`;
    csv += 'Year,Beginning Value,Depreciation Expense,Accumulated Depreciation,Ending Book Value\n';
    data.forEach(d => {
      csv += `${d.year},${d.beginningBookValue},${d.depreciationExpense},${d.accumulatedDepreciation},${d.endingBookValue}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `COA_Property_Card_${coAsset.propertyNumber || 'export'}.csv`;
    a.click();
    setShowDownloadOptions(false);
  };

  // Export to Word
  const exportToWord = () => {
    if (!coAsset) return;
    const data = depreciationLog.filter(d => d.assetId === coAsset.id);
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>COA Property Card</title></head><body>
<h1 style='text-align:center'>COA FORM</h1>
<table border='0' cellpadding='5' style='width:100%'>
<tr><td><strong>Property Number:</strong></td><td>${coAsset.propertyNumber || 'N/A'}</td><td><strong>Date Acquired:</strong></td><td>${formatDate(coAsset.dateAcquired)}</td></tr>
<tr><td><strong>Description:</strong></td><td>${coAsset.description || ''}</td><td><strong>PPE Class:</strong></td><td>${coAsset.ppeClass || ''}</td></tr>
<tr><td><strong>Office:</strong></td><td>${coAsset.office || 'N/A'}</td><td><strong>Account Code:</strong></td><td>${coAsset.accountCode || 'N/A'}</td></tr>
<tr><td><strong>Quantity:</strong></td><td>${coAsset.quantity || 1}</td><td><strong>Unit Cost:</strong></td><td>${formatCurrency(coAsset.unitCost)}</td></tr>
</table>
<h3>Depreciation Schedule</h3>
<table border='1' cellpadding='5' style='width:100%;border-collapse:collapse'>
<tr style='background:#f0f0f0'><th>Year</th><th>Beginning Value</th><th>Depreciation</th><th>Accumulated</th><th>Ending Value</th></tr>`;
    data.forEach(d => {
      html += `<tr><td>${d.year}</td><td>${formatCurrency(d.beginningBookValue)}</td><td>${formatCurrency(d.depreciationExpense)}</td><td>${formatCurrency(d.accumulatedDepreciation)}</td><td>${formatCurrency(d.endingBookValue)}</td></tr>`;
    });
    html += '</table></body></html>';
    const blob = new Blob([html], { type: 'application/msword' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `COA_Property_Card_${coAsset.propertyNumber || 'export'}.doc`;
    a.click();
    setShowDownloadOptions(false);
  };

  // Filter assets
  const filteredAssets = assets.filter(asset => 
    asset.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.ppeClass?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.propertyNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchAssets();
    fetchAllData();
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="scroll-smooth bg-gradient-to-br from-green-50 via-gray-50 to-green-100 min-h-screen">
      <Navbar />

      {/* Dashboard Section */}
      <section id="dashboard" className="pt-20 pb-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-green-800">DENR-PENRO</h1>
              <p className="text-gray-600">Property, Plant & Equipment Depreciation System</p>
            </div>
            <button 
              onClick={() => setShowAddForm(true)}
              className="mt-4 md:mt-0 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105"
            >
              <PlusIcon className="w-6 h-6" />
              Add New Property
            </button>
          </div>
          
          <StatsCards assets={assets} loading={loading} />
          
          <div className="mt-8 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="text"
                placeholder="Search properties by name, class, or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
          
          <div className="mt-6 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-green-700 to-green-600 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Property List</h3>
                <p className="text-green-100 text-sm">Manage your depreciated property</p>
              </div>
              <div className="flex gap-2 items-center">
                {selectedAssets.length > 0 && (
                  <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                    {selectedAssets.length} selected for COA
                  </span>
                )}
                <button onClick={selectAllAssets} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full text-sm">
                  {selectedAssets.length === filteredAssets.length && filteredAssets.length > 0 ? "Deselect All" : "Select All"}
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-12">
                <span className="loading loading-spinner loading-lg text-green-600"></span>
                <p className="mt-2 text-gray-500">Loading assets...</p>
              </div>
            ) : error ? (
              <div className="p-6"><div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div></div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No properties found.</p>
                <p className="mt-2">Click "Add New Property" to add your first asset.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-1 py-2 text-center text-xs font-semibold text-gray-600 w-8">✓</th>
                      <th className="px-1 py-2 text-left text-xs font-semibold text-gray-600">Property #</th>
                      <th className="px-1 py-2 text-left text-xs font-semibold text-gray-600">Date Acq</th>
                      <th className="px-1 py-2 text-left text-xs font-semibold text-gray-600">Office</th>
                      <th className="px-1 py-2 text-left text-xs font-semibold text-gray-600">Description</th>
                      <th className="px-1 py-2 text-left text-xs font-semibold text-gray-600">PPE Class</th>
                      <th className="px-1 py-2 text-left text-xs font-semibold text-gray-600">Acct Code</th>
                      <th className="px-1 py-2 text-center text-xs font-semibold text-gray-600">Life</th>
                      <th className="px-1 py-2 text-center text-xs font-semibold text-gray-600">Status</th>
                      <th className="px-1 py-2 text-right text-xs font-semibold text-gray-600">Unit Cost</th>
                      <th className="px-1 py-2 text-right text-xs font-semibold text-gray-600">Total Cost</th>
                      <th className="px-1 py-2 text-right text-xs font-semibold text-gray-600">Residual</th>
                      <th className="px-1 py-2 text-right text-xs font-semibold text-gray-600">Depr Amt</th>
                      <th className="px-1 py-2 text-right text-xs font-semibold text-gray-600">Annual Depr</th>
                      <th className="px-1 py-2 text-right text-xs font-semibold text-gray-600">Accum Depr</th>
                      <th className="px-1 py-2 text-right text-xs font-semibold text-gray-600">Net Book</th>
                      <th className="px-1 py-2 text-left text-xs font-semibold text-gray-600">Remarks</th>
                      <th className="px-1 py-2 text-center text-xs font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAssets.map((asset) => (
                      <tr key={asset.id} className={`hover:bg-green-50 transition-colors ${selectedAssets.includes(asset.id) ? 'bg-green-50' : ''} ${asset.status === 'disposed' ? 'opacity-60 bg-red-50' : ''}`}>
                        <td className="px-2 py-3 text-center">
                          <button
                            onClick={() => toggleAssetSelection(asset.id)}
                            className={`w-6 h-6 rounded-md flex items-center justify-center ${selectedAssets.includes(asset.id) ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}
                          >
                            {selectedAssets.includes(asset.id) && <CheckIcon className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-1 py-2 font-mono text-xs text-gray-700">{asset.propertyNumber || "N/A"}</td>
                        <td className="px-1 py-2 text-xs text-gray-700">{formatDate(asset.dateAcquired)}</td>
                        <td className="px-1 py-2 text-xs text-gray-700">{asset.office || "-"}</td>
                        <td className="px-1 py-2 text-xs text-gray-700 max-w-[120px] truncate">{asset.description || "-"}</td>
                        <td className="px-1 py-2"><span className="bg-green-100 text-green-700 px-1 py-0.5 rounded text-xs font-medium">{asset.ppeClass || "-"}</span></td>
                        <td className="px-1 py-2 font-mono text-xs text-gray-600">{asset.accountCode || "-"}</td>
                        <td className="px-1 py-2 text-center text-xs text-gray-700">{asset.usefulLife || "-"}</td>
                        <td className="px-1 py-2 text-center">
                          <span className={`px-1 py-0.5 rounded text-xs font-medium ${asset.status === 'disposed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {asset.status || 'active'}
                          </span>
                        </td>
                        <td className="px-1 py-2 text-right text-xs text-gray-800">{formatCurrency(asset.unitCost)}</td>
                        <td className="px-1 py-2 text-right text-xs font-semibold text-gray-800">{formatCurrency(asset.totalCost)}</td>
                        <td className="px-1 py-2 text-right text-xs text-gray-600">{formatCurrency(asset.residualValue)}</td>
                        <td className="px-1 py-2 text-right text-xs text-gray-600">{formatCurrency(asset.depreciableAmount)}</td>
                        <td className="px-1 py-2 text-right text-xs text-blue-600">{formatCurrency(asset.annualDepreciation)}</td>
                        <td className="px-1 py-2 text-right text-xs text-orange-600 font-medium">{formatCurrency(asset.accumulatedDepreciation)}</td>
                        <td className="px-1 py-2 text-right text-xs font-bold text-green-600">{formatCurrency(asset.netBookValue)}</td>
                        <td className="px-1 py-2 text-xs text-gray-600 max-w-[100px] truncate">{asset.remarks || "-"}</td>
                        <td className="px-1 py-2">
                          <div className="flex gap-0.5 justify-center">
                            <button onClick={() => { setEditingAsset(asset); setShowAddForm(true); }} className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200" title="Edit">
                              <PencilIcon className="w-3 h-3" />
                            </button>
                            <button onClick={() => deleteAsset(asset.id)} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Delete">
                              <TrashIcon className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleGenerateCOA(asset)} className="p-1 bg-amber-100 text-amber-600 rounded hover:bg-amber-200" title="Generate COA Form">
                              <DocumentChartBarIcon className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Records Section */}
      <section id="records" className="pt-20 pb-12 px-4 bg-white">
        <div className="container mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl shadow-2xl p-8 border border-gray-200">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Asset Records</h2>
              <p className="text-gray-500 mt-2">Comprehensive asset management and tracking</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Asset History */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border-t-4 border-blue-500 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => { setShowHistoryModal(true); fetchAllData(); }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-100 rounded-xl"><ClockIcon className="w-8 h-8 text-blue-600" /></div>
                  <div>
                    <h3 className="font-bold text-gray-800">Asset History</h3>
                    <p className="text-xs text-gray-500">{assetHistory.length} records</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Track all modifications and lifecycle events of each asset.</p>
                <button className="mt-4 w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium">View History</button>
              </div>

              {/* Depreciation Log */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border-t-4 border-green-500 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => { setShowDepreciationModal(true); fetchAllData(); }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-green-100 rounded-xl"><DocumentChartBarIcon className="w-8 h-8 text-green-600" /></div>
                  <div>
                    <h3 className="font-bold text-gray-800">Depreciation Log</h3>
                    <p className="text-xs text-gray-500">{depreciationLog.length} entries</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">View detailed depreciation calculations and annual adjustments.</p>
                <button className="mt-4 w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium">View Log</button>
              </div>

              {/* Transfer Records */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border-t-4 border-purple-500 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => { setShowTransferModal(true); fetchAllData(); }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-purple-100 rounded-xl"><ArrowsRightLeftIcon className="w-8 h-8 text-purple-600" /></div>
                  <div>
                    <h3 className="font-bold text-gray-800">Transfer Records</h3>
                    <p className="text-xs text-gray-500">{transfers.length} transfers</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Track asset transfers between offices and departments.</p>
                <button className="mt-4 w-full py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm font-medium">View Transfers</button>
              </div>

              {/* Disposal Records */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border-t-4 border-red-500 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => { setShowDisposalModal(true); fetchAllData(); }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-red-100 rounded-xl"><ArchiveBoxIcon className="w-8 h-8 text-red-600" /></div>
                  <div>
                    <h3 className="font-bold text-gray-800">Disposal Records</h3>
                    <p className="text-xs text-gray-500">{disposals.length} disposed</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">View all disposed, scrapped, or retired assets.</p>
                <button className="mt-4 w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium">View Disposals</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COA Forms Section */}
      <section id="coaforms" className="pt-20 pb-12 px-4 bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl shadow-lg mb-4">
              <ClipboardDocumentListIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">COA Forms & Reports</h2>
            <p className="text-gray-500 mt-3 text-lg">Generate official government forms and reports</p>
            {selectedAssets.length > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">
                <CheckIcon className="w-5 h-5" />
                <span className="font-semibold">{selectedAssets.length} assets selected</span>
              </div>
            )}
            <div className="w-24 h-1 bg-gradient-to-r from-green-400 to-green-600 mx-auto mt-4 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-3xl shadow-2xl overflow-hidden hover:scale-105 transition-transform">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-xl"><ClipboardDocumentListIcon className="w-10 h-10 text-white" /></div>
                  <div><h3 className="text-xl font-bold text-white">Schedule of PPE</h3><p className="text-green-200 text-xs">COA Form No. I-A-1</p></div>
                </div>
                <p className="text-green-100 text-sm mb-6">Property, Plant and Equipment - Balance Sheet</p>
                <button className="w-full py-3 bg-white text-green-700 font-semibold rounded-xl hover:bg-green-50">Generate Report</button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-3xl shadow-2xl overflow-hidden hover:scale-105 transition-transform">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-xl"><ClipboardDocumentIcon className="w-10 h-10 text-white" /></div>
                  <div><h3 className="text-xl font-bold text-white">Property Card</h3><p className="text-teal-200 text-xs">COA Form No. I-A-2</p></div>
                </div>
                <p className="text-teal-100 text-sm mb-6">Detailed record of each property item</p>
                <button className="w-full py-3 bg-white text-teal-700 font-semibold rounded-xl hover:bg-teal-50">Generate Report</button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-3xl shadow-2xl overflow-hidden hover:scale-105 transition-transform">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-xl"><ChartBarIcon className="w-10 h-10 text-white" /></div>
                  <div><h3 className="text-xl font-bold text-white">Depreciation Schedule</h3><p className="text-cyan-200 text-xs">Annual Report</p></div>
                </div>
                <p className="text-cyan-100 text-sm mb-6">Accumulated depreciation per asset</p>
                <button className="w-full py-3 bg-white text-cyan-700 font-semibold rounded-xl hover:bg-cyan-50">Generate Report</button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-3xl shadow-2xl overflow-hidden hover:scale-105 transition-transform">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-xl"><ArchiveBoxIcon className="w-10 h-10 text-white" /></div>
                  <div><h3 className="text-xl font-bold text-white">Inventory Report</h3><p className="text-amber-200 text-xs">Physical Count</p></div>
                </div>
                <p className="text-amber-100 text-sm mb-6">Summary of all countable properties</p>
                <button className="w-full py-3 bg-white text-amber-700 font-semibold rounded-xl hover:bg-amber-50">Generate Report</button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl shadow-2xl overflow-hidden hover:scale-105 transition-transform">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-xl"><ArrowDownTrayIcon className="w-10 h-10 text-white" /></div>
                  <div><h3 className="text-xl font-bold text-white">Acquisition Report</h3><p className="text-blue-200 text-xs">New Acquisitions</p></div>
                </div>
                <p className="text-blue-100 text-sm mb-6">List of newly acquired properties</p>
                <button className="w-full py-3 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50">Generate Report</button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-3xl shadow-2xl overflow-hidden hover:scale-105 transition-transform">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-xl"><ArrowUpTrayIcon className="w-10 h-10 text-white" /></div>
                  <div><h3 className="text-xl font-bold text-white">Disposal Report</h3><p className="text-red-200 text-xs">Transfer / Disposal</p></div>
                </div>
                <p className="text-red-100 text-sm mb-6">Disposed or transferred properties</p>
                <button className="w-full py-3 bg-white text-red-700 font-semibold rounded-xl hover:bg-red-50">Generate Report</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== MODALS ==================== */}

      {/* Asset History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ClockIcon className="w-7 h-7 text-white" />
                <div><h2 className="text-xl font-bold text-white">Asset History</h2><p className="text-blue-200 text-xs">Track all modifications and changes</p></div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-white/20 rounded-lg"><XMarkIcon className="w-6 h-6 text-white" /></button>
            </div>
            <div className="p-6 overflow-auto max-h-[70vh]">
              {assetHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No history records found.</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Property #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Field</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Old Value</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">New Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {assetHistory.map((h, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs text-gray-600">{formatDate(h.changeDate)}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-700">{h.propertyNumber || h.assetId}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 capitalize">{h.fieldChanged}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{h.oldValue || '-'}</td>
                        <td className="px-4 py-3 text-xs text-green-600">{h.newValue || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Depreciation Log Modal */}
      {showDepreciationModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <DocumentChartBarIcon className="w-7 h-7 text-white" />
                <div><h2 className="text-xl font-bold text-white">Depreciation Log</h2><p className="text-green-200 text-xs">Yearly depreciation calculations</p></div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleGenerateDepreciation} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                  <ArrowPathIcon className="w-4 h-4" /> Generate All
                </button>
                <button onClick={() => setShowDepreciationModal(false)} className="p-2 hover:bg-white/20 rounded-lg"><XMarkIcon className="w-6 h-6 text-white" /></button>
              </div>
            </div>
            <div className="p-6 overflow-auto max-h-[70vh]">
              {depreciationLog.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No depreciation records found. Generate them now!</p>
                  <button onClick={handleGenerateDepreciation} className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">Generate Depreciation Log</button>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Year</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Property #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Beginning Value</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Depreciation</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Accumulated</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Ending Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {depreciationLog.map((d, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-bold text-gray-700">{d.year}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-700">{d.propertyNumber || d.assetId}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{formatCurrency(d.beginningBookValue)}</td>
                        <td className="px-4 py-3 text-xs text-red-600">-{formatCurrency(d.depreciationExpense)}</td>
                        <td className="px-4 py-3 text-xs text-orange-600">{formatCurrency(d.accumulatedDepreciation)}</td>
                        <td className="px-4 py-3 text-xs font-bold text-green-600">{formatCurrency(d.endingBookValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Records Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ArrowsRightLeftIcon className="w-7 h-7 text-white" />
                <div><h2 className="text-xl font-bold text-white">Transfer Records</h2><p className="text-purple-200 text-xs">Asset movements between offices</p></div>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-white/20 rounded-lg"><XMarkIcon className="w-6 h-6 text-white" /></button>
            </div>
            <div className="p-6">
              <div className="bg-purple-50 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-purple-800 mb-3 flex items-center gap-2"><PlusIcon className="w-4 h-4" /> Create New Transfer</h4>
                <form onSubmit={handleCreateTransfer} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select required value={transferForm.assetId} onChange={e => setTransferForm({...transferForm, assetId: e.target.value})} className="border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select Asset</option>
                    {assets.filter(a => a.status === 'active').map(a => <option key={a.id} value={a.id}>{a.propertyNumber} - {a.description}</option>)}
                  </select>
                  <input required placeholder="From Office" value={transferForm.fromOffice} onChange={e => setTransferForm({...transferForm, fromOffice: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
                  <input required placeholder="To Office" value={transferForm.toOffice} onChange={e => setTransferForm({...transferForm, toOffice: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
                  <input required type="date" value={transferForm.transferDate} onChange={e => setTransferForm({...transferForm, transferDate: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
                  <input required placeholder="Reason" value={transferForm.transferReason} onChange={e => setTransferForm({...transferForm, transferReason: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
                  <div className="flex gap-2">
                    <input required placeholder="Transferred By" value={transferForm.transferredBy} onChange={e => setTransferForm({...transferForm, transferredBy: e.target.value})} className="border rounded-lg px-3 py-2 text-sm flex-1" />
                    <input required placeholder="Received By" value={transferForm.receivedBy} onChange={e => setTransferForm({...transferForm, receivedBy: e.target.value})} className="border rounded-lg px-3 py-2 text-sm flex-1" />
                  </div>
                  <button type="submit" className="md:col-span-3 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 font-medium">Create Transfer</button>
                </form>
              </div>
              <div className="overflow-auto max-h-[40vh]">
                {transfers.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No transfer records found.</p>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Property #</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">From</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">To</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Reason</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transfers.map((t, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs text-gray-600">{formatDate(t.transferDate)}</td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-700">{t.propertyNumber || t.assetId}</td>
                          <td className="px-4 py-3 text-xs text-red-600">{t.fromOffice || '-'}</td>
                          <td className="px-4 py-3 text-xs text-green-600">{t.toOffice}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{t.transferReason}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{t.transferredBy} → {t.receivedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disposal Records Modal */}
      {showDisposalModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ArchiveBoxIcon className="w-7 h-7 text-white" />
                <div><h2 className="text-xl font-bold text-white">Disposal Records</h2><p className="text-red-200 text-xs">Disposed, scrapped, or retired assets</p></div>
              </div>
              <button onClick={() => setShowDisposalModal(false)} className="p-2 hover:bg-white/20 rounded-lg"><XMarkIcon className="w-6 h-6 text-white" /></button>
            </div>
            <div className="p-6">
              <div className="bg-red-50 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2"><PlusIcon className="w-4 h-4" /> Create New Disposal</h4>
                <form onSubmit={handleCreateDisposal} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select required value={disposalForm.assetId} onChange={e => {
                    const asset = assets.find(a => a.id == e.target.value);
                    setDisposalForm({...disposalForm, assetId: e.target.value, bookValueAtDisposal: asset?.netBookValue || 0});
                  }} className="border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select Asset</option>
                    {assets.filter(a => a.status === 'active').map(a => <option key={a.id} value={a.id}>{a.propertyNumber} - {a.description} (₱{a.netBookValue?.toLocaleString()})</option>)}
                  </select>
                  <input required type="date" value={disposalForm.disposalDate} onChange={e => setDisposalForm({...disposalForm, disposalDate: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
                  <select required value={disposalForm.disposalMethod} onChange={e => setDisposalForm({...disposalForm, disposalMethod: e.target.value})} className="border rounded-lg px-3 py-2 text-sm">
                    <option value="">Method</option>
                    <option value="Sold">Sold</option>
                    <option value="Scrapped">Scrapped</option>
                    <option value="Donated">Donated</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Other">Other</option>
                  </select>
                  <input required placeholder="Reason" value={disposalForm.disposalReason} onChange={e => setDisposalForm({...disposalForm, disposalReason: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
                  <input type="number" placeholder="Proceeds (₱)" value={disposalForm.proceeds} onChange={e => setDisposalForm({...disposalForm, proceeds: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
                  <input required placeholder="Approved By" value={disposalForm.approvedBy} onChange={e => setDisposalForm({...disposalForm, approvedBy: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
                  <button type="submit" className="md:col-span-3 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-medium">Create Disposal</button>
                </form>
              </div>
              <div className="overflow-auto max-h-[40vh]">
                {disposals.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No disposal records found.</p>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Property #</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Method</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Reason</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Book Value</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Proceeds</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Approved By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {disposals.map((d, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs text-gray-600">{formatDate(d.disposalDate)}</td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-700">{d.propertyNumber || d.assetId}</td>
                          <td className="px-4 py-3 text-xs"><span className="bg-red-100 text-red-700 px-2 py-1 rounded-full">{d.disposalMethod}</span></td>
                          <td className="px-4 py-3 text-xs text-gray-600">{d.disposalReason}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{formatCurrency(d.bookValueAtDisposal)}</td>
                          <td className="px-4 py-3 text-xs text-green-600">{formatCurrency(d.proceeds)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{d.approvedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COA Form Modal */}
      {showCOAModal && coAsset && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <DocumentChartBarIcon className="w-7 h-7 text-white" />
                <div><h2 className="text-xl font-bold text-white">COA Form</h2><p className="text-amber-200 text-xs">Property Form No. I-A-2</p></div>
              </div>
              <button onClick={() => setShowCOAModal(false)} className="p-2 hover:bg-white/20 rounded-lg"><XMarkIcon className="w-6 h-6 text-white" /></button>
            </div>
            <div className="p-6 overflow-auto max-h-[70vh]">
              {/* Action Buttons */}
              <div className="mb-4 flex flex-wrap gap-2 relative">
                {/* Download Button with Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Download
                  </button>
                  
                  {/* Download Options Dropdown */}
                  {showDownloadOptions && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                      <button 
                        onClick={downloadWithTemplate}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                      >
                        Excel (Template)
                      </button>
                      <button 
                        onClick={exportToCSV}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                      >
                        Excel (CSV)
                      </button>
                      <button 
                        onClick={exportToWord}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                      >
                        Word
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Print */}
                <button 
                  onClick={handlePrint} 
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg ml-auto"
                >
                  <ArrowUpTrayIcon className="w-4 h-4" />
                  Print
                </button>
              </div>
              
              {/* Print Content */}
              <div ref={printRef} className="border-2 border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-4 text-center">COA FORM</h3>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div><strong>Property Number:</strong> {coAsset.propertyNumber || 'N/A'}</div>
                  <div><strong>Date Acquired:</strong> {formatDate(coAsset.dateAcquired)}</div>
                  <div><strong>Description:</strong> {coAsset.description}</div>
                  <div><strong>PPE Class:</strong> {coAsset.ppeClass}</div>
                  <div><strong>Office:</strong> {coAsset.office || 'N/A'}</div>
                  <div><strong>Account Code:</strong> {coAsset.accountCode || 'N/A'}</div>
                  <div><strong>Quantity:</strong> {coAsset.quantity || 1}</div>
                  <div><strong>Unit Cost:</strong> {formatCurrency(coAsset.unitCost)}</div>
                </div>
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-2 py-1 text-left">Year</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">Beginning Value</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">Depreciation</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">Accumulated</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">Ending Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depreciationLog.filter(d => d.assetId === coAsset.id).map((d, i) => (
                      <tr key={i}>
                        <td className="border border-gray-300 px-2 py-1">{d.year}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(d.beginningBookValue)}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right text-red-600">{formatCurrency(d.depreciationExpense)}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(d.accumulatedDepreciation)}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right font-bold">{formatCurrency(d.endingBookValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Property Slide-in Panel */}
      {showAddForm && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" onClick={() => { setShowAddForm(false); setEditingAsset(null); }}></div>
          <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
            <div className="bg-gradient-to-r from-green-700 to-green-600 text-white px-6 py-5 flex items-center justify-between sticky top-0 z-10">
              <div><h2 className="text-xl font-bold">{editingAsset ? "Edit Property" : "Add New Property"}</h2><p className="text-green-100 text-xs">Property, Plant & Equipment Entry</p></div>
              <button onClick={() => { setShowAddForm(false); setEditingAsset(null); }} className="p-2 hover:bg-white/20 rounded-lg"><ArrowLeftIcon className="w-6 h-6" /></button>
            </div>
            <div className="p-6">
              <AssetForm asset={editingAsset} onAssetSaved={() => { fetchAssets(); fetchAllData(); setShowAddForm(false); setEditingAsset(null); }} onCancel={() => { setShowAddForm(false); setEditingAsset(null); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
