import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const app = express();
app.use(cors());
app.use(express.json());

// Open SQLite database
const dbPromise = open({
  filename: "../assets.db",
  driver: sqlite3.Database,
});

// Create tables if not exists
(async () => {
  const db = await dbPromise;
  
  // Create assets table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entityName TEXT,
      fundCluster TEXT,
      propertyNumber TEXT,
      propertyType TEXT,
      office TEXT,
      ppeClass TEXT,
      description TEXT,
      accountCode TEXT,
      usefulLife INTEGER,
      rateOfDepreciation REAL,
      dateAcquired TEXT,
      reference TEXT,
      receipt TEXT,
      quantity INTEGER DEFAULT 1,
      unitCost REAL,
      totalCost REAL,
      residualValue REAL,
      depreciableAmount REAL,
      annualDepreciation REAL,
      accumulatedDepreciation REAL DEFAULT 0,
      accumulatedImpairmentLosses REAL DEFAULT 0,
      issuesTransfersAdjustments REAL DEFAULT 0,
      adjustedCost REAL,
      netBookValue REAL,
      remarks TEXT,
      selected INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Get list of existing columns in the assets table
  const tableInfo = await db.all("PRAGMA table_info(assets)");
  const existingColumns = tableInfo.map(col => col.name);
  
  // Add all missing columns if they don't exist
  const columnsToAdd = [
    { name: "entityName", sql: "ALTER TABLE assets ADD COLUMN entityName TEXT" },
    { name: "fundCluster", sql: "ALTER TABLE assets ADD COLUMN fundCluster TEXT" },
    { name: "propertyNumber", sql: "ALTER TABLE assets ADD COLUMN propertyNumber TEXT" },
    { name: "propertyType", sql: "ALTER TABLE assets ADD COLUMN propertyType TEXT" },
    { name: "office", sql: "ALTER TABLE assets ADD COLUMN office TEXT" },
    { name: "ppeClass", sql: "ALTER TABLE assets ADD COLUMN ppeClass TEXT" },
    { name: "description", sql: "ALTER TABLE assets ADD COLUMN description TEXT" },
    { name: "accountCode", sql: "ALTER TABLE assets ADD COLUMN accountCode TEXT" },
    { name: "usefulLife", sql: "ALTER TABLE assets ADD COLUMN usefulLife INTEGER" },
    { name: "rateOfDepreciation", sql: "ALTER TABLE assets ADD COLUMN rateOfDepreciation REAL" },
    { name: "dateAcquired", sql: "ALTER TABLE assets ADD COLUMN dateAcquired TEXT" },
    { name: "reference", sql: "ALTER TABLE assets ADD COLUMN reference TEXT" },
    { name: "receipt", sql: "ALTER TABLE assets ADD COLUMN receipt TEXT" },
    { name: "quantity", sql: "ALTER TABLE assets ADD COLUMN quantity INTEGER DEFAULT 1" },
    { name: "unitCost", sql: "ALTER TABLE assets ADD COLUMN unitCost REAL" },
    { name: "totalCost", sql: "ALTER TABLE assets ADD COLUMN totalCost REAL" },
    { name: "residualValue", sql: "ALTER TABLE assets ADD COLUMN residualValue REAL" },
    { name: "depreciableAmount", sql: "ALTER TABLE assets ADD COLUMN depreciableAmount REAL" },
    { name: "annualDepreciation", sql: "ALTER TABLE assets ADD COLUMN annualDepreciation REAL" },
    { name: "accumulatedDepreciation", sql: "ALTER TABLE assets ADD COLUMN accumulatedDepreciation REAL DEFAULT 0" },
    { name: "accumulatedImpairmentLosses", sql: "ALTER TABLE assets ADD COLUMN accumulatedImpairmentLosses REAL DEFAULT 0" },
    { name: "issuesTransfersAdjustments", sql: "ALTER TABLE assets ADD COLUMN issuesTransfersAdjustments REAL DEFAULT 0" },
    { name: "adjustedCost", sql: "ALTER TABLE assets ADD COLUMN adjustedCost REAL" },
    { name: "netBookValue", sql: "ALTER TABLE assets ADD COLUMN netBookValue REAL" },
    { name: "remarks", sql: "ALTER TABLE assets ADD COLUMN remarks TEXT" },
    { name: "selected", sql: "ALTER TABLE assets ADD COLUMN selected INTEGER DEFAULT 0" },
    { name: "status", sql: "ALTER TABLE assets ADD COLUMN status TEXT DEFAULT 'active'" },
    { name: "createdAt", sql: "ALTER TABLE assets ADD COLUMN createdAt TEXT DEFAULT CURRENT_TIMESTAMP" },
    { name: "updatedAt", sql: "ALTER TABLE assets ADD COLUMN updatedAt TEXT DEFAULT CURRENT_TIMESTAMP" }
  ];
  
  for (const col of columnsToAdd) {
    if (!existingColumns.includes(col.name)) {
      try {
        await db.exec(col.sql);
      } catch (e) {
        // Column may already exist, ignore error
      }
    }
  }
  
  // Asset History - tracks all modifications
  await db.exec(`
    CREATE TABLE IF NOT EXISTS asset_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assetId INTEGER,
      fieldChanged TEXT,
      oldValue TEXT,
      newValue TEXT,
      changedBy TEXT,
      changeDate TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);
  
  // Transfer Records - tracks asset movements between offices
  await db.exec(`
    CREATE TABLE IF NOT EXISTS asset_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assetId INTEGER,
      fromOffice TEXT,
      toOffice TEXT,
      transferDate TEXT,
      transferReason TEXT,
      transferredBy TEXT,
      receivedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);
  
  // Disposal Records - tracks disposed/scrapped/retired assets
  await db.exec(`
    CREATE TABLE IF NOT EXISTS asset_disposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assetId INTEGER,
      disposalDate TEXT,
      disposalMethod TEXT,
      disposalReason TEXT,
      proceeds REAL,
      bookValueAtDisposal REAL,
      approvedBy TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);
  
  // Depreciation Log - yearly depreciation records
  await db.exec(`
    CREATE TABLE IF NOT EXISTS depreciation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assetId INTEGER,
      year INTEGER,
      beginningBookValue REAL,
      depreciationExpense REAL,
      accumulatedDepreciation REAL,
      endingBookValue REAL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);
  
  // Repair History
  await db.exec(`
    CREATE TABLE IF NOT EXISTS repair_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assetId INTEGER,
      repairDate TEXT,
      natureOfRepair TEXT,
      amount REAL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);
  
  console.log("Database initialized successfully");
})();

// Helper function to log asset history
const logAssetHistory = async (assetId, fieldChanged, oldValue, newValue) => {
  const db = await dbPromise;
  await db.run(
    "INSERT INTO asset_history (assetId, fieldChanged, oldValue, newValue, changeDate) VALUES (?, ?, ?, ?, ?)",
    [assetId, fieldChanged, oldValue, newValue, new Date().toISOString()]
  );
};

// API route to save asset
app.post("/api/assets", async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ success: false, message: "No data provided" });
  }

  const {
    entityName,
    fundCluster,
    propertyNumber,
    propertyType,
    office,
    ppeClass,
    description,
    accountCode,
    usefulLife,
    rateOfDepreciation,
    dateAcquired,
    reference,
    receipt,
    quantity,
    unitCost,
    totalCost,
    residualValue,
    depreciableAmount,
    annualDepreciation,
    accumulatedDepreciation,
    accumulatedImpairmentLosses,
    issuesTransfersAdjustments,
    adjustedCost,
    netBookValue,
    remarks
  } = req.body;

  if (!propertyNumber || !description || !office) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const db = await dbPromise;
  const now = new Date().toISOString();
  
  const result = await db.run(
    `INSERT INTO assets (
      entityName, fundCluster, propertyNumber, propertyType, office, ppeClass, description,
      accountCode, usefulLife, rateOfDepreciation, dateAcquired, reference, receipt,
      quantity, unitCost, totalCost, residualValue, depreciableAmount, annualDepreciation,
      accumulatedDepreciation, accumulatedImpairmentLosses, issuesTransfersAdjustments,
      adjustedCost, netBookValue, remarks, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entityName, fundCluster, propertyNumber, propertyType, office, ppeClass, description,
      accountCode, usefulLife, rateOfDepreciation, dateAcquired, reference, receipt,
      quantity || 1, unitCost, totalCost, residualValue, depreciableAmount, annualDepreciation,
      accumulatedDepreciation || 0, accumulatedImpairmentLosses || 0, issuesTransfersAdjustments || 0,
      adjustedCost, netBookValue, remarks, now, now
    ]
  );
  
  await logAssetHistory(result.lastID, 'Created', null, `Asset created: ${propertyNumber}`);
  
  res.json({ success: true, message: "Asset saved successfully" });
});

// API route to fetch all assets
app.get("/api/assets", async (req, res) => {
  const db = await dbPromise;
  const assets = await db.all("SELECT * FROM assets ORDER BY id DESC");
  res.json(assets);
});

// API route to fetch active assets only
app.get("/api/assets/active", async (req, res) => {
  const db = await dbPromise;
  const assets = await db.all("SELECT * FROM assets WHERE status = 'active' ORDER BY id DESC");
  res.json(assets);
});

// API route to fetch single asset
app.get("/api/assets/:id", async (req, res) => {
  const db = await dbPromise;
  const asset = await db.get("SELECT * FROM assets WHERE id = ?", [req.params.id]);
  res.json(asset);
});

// API route to update asset
app.put("/api/assets/:id", async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ success: false, message: "No data provided" });
  }

  const {
    entityName,
    fundCluster,
    propertyNumber,
    propertyType,
    office,
    ppeClass,
    description,
    accountCode,
    usefulLife,
    rateOfDepreciation,
    dateAcquired,
    reference,
    receipt,
    quantity,
    unitCost,
    totalCost,
    residualValue,
    depreciableAmount,
    annualDepreciation,
    accumulatedDepreciation,
    accumulatedImpairmentLosses,
    issuesTransfersAdjustments,
    adjustedCost,
    netBookValue,
    remarks
  } = req.body;

  if (!propertyNumber || !description || !office) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const db = await dbPromise;
  const now = new Date().toISOString();
  
  const oldAsset = await db.get("SELECT * FROM assets WHERE id = ?", [req.params.id]);
  
  await db.run(
    `UPDATE assets SET
      entityName = ?, fundCluster = ?, propertyNumber = ?, propertyType = ?, office = ?, ppeClass = ?,
      description = ?, accountCode = ?, usefulLife = ?, rateOfDepreciation = ?,
      dateAcquired = ?, reference = ?, receipt = ?, quantity = ?, unitCost = ?,
      totalCost = ?, residualValue = ?, depreciableAmount = ?, annualDepreciation = ?,
      accumulatedDepreciation = ?, accumulatedImpairmentLosses = ?, issuesTransfersAdjustments = ?,
      adjustedCost = ?, netBookValue = ?, remarks = ?, updatedAt = ?
    WHERE id = ?`,
    [
      entityName, fundCluster, propertyNumber, propertyType, office, ppeClass, description,
      accountCode, usefulLife, rateOfDepreciation, dateAcquired, reference, receipt,
      quantity, unitCost, totalCost, residualValue, depreciableAmount, annualDepreciation,
      accumulatedDepreciation, accumulatedImpairmentLosses, issuesTransfersAdjustments,
      adjustedCost, netBookValue, remarks, now, req.params.id
    ]
  );
  
  const fields = ['entityName', 'fundCluster', 'propertyNumber', 'propertyType', 'office', 'ppeClass', 'description', 'accountCode', 'usefulLife', 'dateAcquired', 'quantity', 'unitCost', 'totalCost', 'remarks'];
  for (const field of fields) {
    if (oldAsset && oldAsset[field] !== req.body[field]) {
      await logAssetHistory(req.params.id, field, oldAsset[field], req.body[field]);
    }
  }
  
  res.json({ success: true, message: "Asset updated successfully" });
});

// API route to delete asset
app.delete("/api/assets/:id", async (req, res) => {
  const db = await dbPromise;
  const asset = await db.get("SELECT propertyNumber FROM assets WHERE id = ?", [req.params.id]);
  await logAssetHistory(req.params.id, 'Deleted', `Asset: ${asset?.propertyNumber}`, null);
  await db.run("DELETE FROM assets WHERE id = ?", [req.params.id]);
  res.json({ success: true, message: "Asset deleted successfully" });
});

// API route to toggle asset selection
app.put("/api/assets/:id/select", async (req, res) => {
  const db = await dbPromise;
  const { selected } = req.body;
  await db.run("UPDATE assets SET selected = ? WHERE id = ?", [selected ? 1 : 0, req.params.id]);
  res.json({ success: true });
});

// API route to get selected assets
app.get("/api/assets/selected", async (req, res) => {
  const db = await dbPromise;
  const assets = await db.all("SELECT * FROM assets WHERE selected = 1 ORDER BY id DESC");
  res.json(assets);
});

// API route to clear all selections
app.put("/api/assets/clear-selections", async (req, res) => {
  const db = await dbPromise;
  await db.run("UPDATE assets SET selected = 0");
  res.json({ success: true, message: "All selections cleared" });
});

// API route to get dashboard statistics
app.get("/api/stats", async (req, res) => {
  const db = await dbPromise;
  
  const totalAssets = await db.get("SELECT COUNT(*) as count FROM assets WHERE status = 'active'");
  const totalCost = await db.get("SELECT COALESCE(SUM(totalCost), 0) as total FROM assets WHERE status = 'active'");
  const totalDepreciation = await db.get("SELECT COALESCE(SUM(accumulatedDepreciation), 0) as total FROM assets WHERE status = 'active'");
  const assetsByClass = await db.all(`
    SELECT ppeClass, COUNT(*) as count, SUM(totalCost) as totalCost 
    FROM assets WHERE status = 'active' GROUP BY ppeClass
  `);
  
  res.json({
    totalAssets: totalAssets.count,
    totalCost: totalCost.total,
    totalDepreciation: totalDepreciation.total,
    assetsByClass
  });
});

// ==================== ASSET HISTORY API ====================

app.get("/api/history", async (req, res) => {
  const db = await dbPromise;
  const history = await db.all(`
    SELECT ah.*, COALESCE(a.propertyNumber, '') as propertyNumber, COALESCE(a.description, '') as assetDescription
    FROM asset_history ah
    LEFT JOIN assets a ON ah.assetId = a.id
    ORDER BY ah.changeDate DESC
  `);
  res.json(history);
});

app.get("/api/history/:assetId", async (req, res) => {
  const db = await dbPromise;
  const history = await db.all(
    "SELECT * FROM asset_history WHERE assetId = ? ORDER BY changeDate DESC",
    [req.params.assetId]
  );
  res.json(history);
});

// ==================== TRANSFER RECORDS API ====================

app.get("/api/transfers", async (req, res) => {
  const db = await dbPromise;
  const transfers = await db.all(`
    SELECT at.*, COALESCE(a.propertyNumber, '') as propertyNumber, COALESCE(a.description, '') as assetDescription, COALESCE(a.office, '') as currentOffice
    FROM asset_transfers at
    LEFT JOIN assets a ON at.assetId = a.id
    ORDER BY at.transferDate DESC
  `);
  res.json(transfers);
});

app.post("/api/transfers", async (req, res) => {
  const { assetId, fromOffice, toOffice, transferDate, transferReason, transferredBy, receivedBy } = req.body;
  const db = await dbPromise;
  const now = new Date().toISOString();
  
  await db.run(
    `INSERT INTO asset_transfers (assetId, fromOffice, toOffice, transferDate, transferReason, transferredBy, receivedBy, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [assetId, fromOffice, toOffice, transferDate, transferReason, transferredBy, receivedBy, now]
  );
  
  await db.run("UPDATE assets SET office = ?, updatedAt = ? WHERE id = ?", [toOffice, now, assetId]);
  
  await logAssetHistory(assetId, 'Transfer', fromOffice, toOffice);
  
  res.json({ success: true, message: "Transfer record created successfully" });
});

// ==================== DISPOSAL RECORDS API ====================

app.get("/api/disposals", async (req, res) => {
  const db = await dbPromise;
  const disposals = await db.all(`
    SELECT ad.*, COALESCE(a.propertyNumber, '') as propertyNumber, COALESCE(a.description, '') as assetDescription, COALESCE(a.totalCost, 0) as totalCost, COALESCE(a.netBookValue, 0) as netBookValue
    FROM asset_disposals ad
    LEFT JOIN assets a ON ad.assetId = a.id
    ORDER BY ad.disposalDate DESC
  `);
  res.json(disposals);
});

app.post("/api/disposals", async (req, res) => {
  const { assetId, disposalDate, disposalMethod, disposalReason, proceeds, bookValueAtDisposal, approvedBy } = req.body;
  const db = await dbPromise;
  const now = new Date().toISOString();
  
  await db.run(
    `INSERT INTO asset_disposals (assetId, disposalDate, disposalMethod, disposalReason, proceeds, bookValueAtDisposal, approvedBy, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [assetId, disposalDate, disposalMethod, disposalReason, proceeds || 0, bookValueAtDisposal, approvedBy, now]
  );
  
  await db.run("UPDATE assets SET status = 'disposed', updatedAt = ? WHERE id = ?", [now, assetId]);
  
  await logAssetHistory(assetId, 'Disposed', 'active', `Disposed via ${disposalMethod}`);
  
  res.json({ success: true, message: "Disposal record created successfully" });
});

// ==================== DEPRECIATION LOG API ====================

app.get("/api/depreciation-log", async (req, res) => {
  const db = await dbPromise;
  const log = await db.all(`
    SELECT dl.*, COALESCE(a.propertyNumber, '') as propertyNumber, COALESCE(a.description, '') as assetDescription, COALESCE(a.usefulLife, 0) as usefulLife, COALESCE(a.totalCost, 0) as totalCost, COALESCE(a.residualValue, 0) as residualValue
    FROM depreciation_log dl
    LEFT JOIN assets a ON dl.assetId = a.id
    ORDER BY dl.year DESC, dl.assetId
  `);
  res.json(log);
});

app.get("/api/depreciation-log/:assetId", async (req, res) => {
  const db = await dbPromise;
  const log = await db.all(
    "SELECT * FROM depreciation_log WHERE assetId = ? ORDER BY year DESC",
    [req.params.assetId]
  );
  res.json(log);
});

app.post("/api/depreciation-log/generate", async (req, res) => {
  const { assetId } = req.body;
  const db = await dbPromise;
  
  const asset = await db.get("SELECT * FROM assets WHERE id = ?", [assetId]);
  if (!asset) {
    return res.status(404).json({ success: false, message: "Asset not found" });
  }
  
  const acquisitionYear = new Date(asset.dateAcquired).getFullYear();
  const currentYear = new Date().getFullYear();
  const usefulLife = asset.usefulLife || 5;
  const residualValue = asset.residualValue || 0;
  const totalCost = asset.totalCost || 0;
  
  const depreciableAmount = totalCost - residualValue;
  const annualDepreciation = depreciableAmount / usefulLife;
  
  const lastDepreciationYear = acquisitionYear + usefulLife - 1;
  const yearsToDepreciate = Math.min(currentYear, lastDepreciationYear);
  
  let bookValue = totalCost;
  let accumulated = 0;
  
  for (let year = acquisitionYear; year <= yearsToDepreciate; year++) {
    const beginningBookValue = bookValue;
    const depreciation = annualDepreciation;
    accumulated += depreciation;
    bookValue = Math.max(residualValue, bookValue - depreciation);
    
    const existing = await db.get("SELECT id FROM depreciation_log WHERE assetId = ? AND year = ?", [assetId, year]);
    
    if (existing) {
      await db.run(
        `UPDATE depreciation_log SET beginningBookValue = ?, depreciationExpense = ?, accumulatedDepreciation = ?, endingBookValue = ? WHERE id = ?`,
        [beginningBookValue, depreciation, accumulated, bookValue, existing.id]
      );
    } else {
      await db.run(
        `INSERT INTO depreciation_log (assetId, year, beginningBookValue, depreciationExpense, accumulatedDepreciation, endingBookValue) VALUES (?, ?, ?, ?, ?, ?)`,
        [assetId, year, beginningBookValue, depreciation, accumulated, bookValue]
      );
    }
  }
  
  const finalNetBookValue = Math.max(residualValue, totalCost - accumulated);
  await db.run(
    "UPDATE assets SET accumulatedDepreciation = ?, netBookValue = ?, annualDepreciation = ? WHERE id = ?",
    [accumulated, finalNetBookValue, annualDepreciation, assetId]
  );
  
  res.json({ success: true, message: "Depreciation log generated successfully" });
});

app.post("/api/depreciation-log/generate-all", async (req, res) => {
  const db = await dbPromise;
  const assets = await db.all("SELECT * FROM assets WHERE status = 'active'");
  
  for (const asset of assets) {
    const acquisitionYear = new Date(asset.dateAcquired).getFullYear();
    const currentYear = new Date().getFullYear();
    const usefulLife = asset.usefulLife || 5;
    const residualValue = asset.residualValue || 0;
    const totalCost = asset.totalCost || 0;
    
    const depreciableAmount = totalCost - residualValue;
    const annualDepreciation = depreciableAmount / usefulLife;
    
    const lastDepreciationYear = acquisitionYear + usefulLife - 1;
    const yearsToDepreciate = Math.min(currentYear, lastDepreciationYear);
    
    let bookValue = totalCost;
    let accumulated = 0;
    
    for (let year = acquisitionYear; year <= yearsToDepreciate; year++) {
      const beginningBookValue = bookValue;
      const depreciation = annualDepreciation;
      accumulated += depreciation;
      bookValue = Math.max(residualValue, bookValue - depreciation);
      
      const existing = await db.get("SELECT id FROM depreciation_log WHERE assetId = ? AND year = ?", [asset.id, year]);
      
      if (existing) {
        await db.run(
          `UPDATE depreciation_log SET beginningBookValue = ?, depreciationExpense = ?, accumulatedDepreciation = ?, endingBookValue = ? WHERE id = ?`,
          [beginningBookValue, depreciation, accumulated, bookValue, existing.id]
        );
      } else {
        await db.run(
          `INSERT INTO depreciation_log (assetId, year, beginningBookValue, depreciationExpense, accumulatedDepreciation, endingBookValue) VALUES (?, ?, ?, ?, ?, ?)`,
          [asset.id, year, beginningBookValue, depreciation, accumulated, bookValue]
        );
      }
    }
    
    const finalNetBookValue = Math.max(residualValue, totalCost - accumulated);
    await db.run(
      "UPDATE assets SET accumulatedDepreciation = ?, netBookValue = ?, annualDepreciation = ? WHERE id = ?",
      [accumulated, finalNetBookValue, annualDepreciation, asset.id]
    );
  }
  
  res.json({ success: true, message: "Depreciation log generated for all assets" });
});

// ==================== REPAIR HISTORY API ====================

app.get("/api/repairs", async (req, res) => {
  const db = await dbPromise;
  const repairs = await db.all(`
    SELECT rh.*, COALESCE(a.propertyNumber, '') as propertyNumber, COALESCE(a.description, '') as assetDescription
    FROM repair_history rh
    LEFT JOIN assets a ON rh.assetId = a.id
    ORDER BY rh.repairDate DESC
  `);
  res.json(repairs);
});

app.post("/api/repairs", async (req, res) => {
  const { assetId, repairDate, natureOfRepair, amount } = req.body;
  const db = await dbPromise;
  const now = new Date().toISOString();
  
  await db.run(
    "INSERT INTO repair_history (assetId, repairDate, natureOfRepair, amount, createdAt) VALUES (?, ?, ?, ?, ?)",
    [assetId, repairDate, natureOfRepair, amount, now]
  );
  
  await logAssetHistory(assetId, 'Repair', null, `${natureOfRepair} - ₱${amount}`);
  
  res.json({ success: true, message: "Repair record added successfully" });
});

app.get("/api/repairs/:assetId", async (req, res) => {
  const db = await dbPromise;
  const repairs = await db.all(
    "SELECT * FROM repair_history WHERE assetId = ? ORDER BY repairDate DESC",
    [req.params.assetId]
  );
  res.json(repairs);
});

// Server listening
app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
