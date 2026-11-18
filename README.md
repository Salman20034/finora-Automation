# FINORA AUTOMATION
**Smart Financial Intelligence, Receivables Management & WhatsApp Communication Platform**

A unified financial intelligence platform engineered for enterprise Accounts Receivable (AR) analytics, CFO executive reporting, customer ageing schedules, credit risk governance, Excel workbook generation, and automated WhatsApp communication.

---

## 🚀 Key Modules & Architecture

### 1. Executive Dashboard (CFO Overview)
- **46 Financial KPIs** with instant drill-down capabilities.
- **Portfolio Health & Composition**: Total Receivables, Total Overdue, Not Due, Over Risk Due, and Over Limit.
- **Visual Analytics**: Ageing severity distribution, branch performance, salesperson collection performance, and top customer risk concentrations.
- **1-Click Preloaded Dataset**: Instantly test and explore the entire platform without manual file preparation via the `⚡ Load Sample Dataset` feature.

### 2. Comprehensive Receivables Management
- **15 Analytical Views**:
  1. Overdue vs Collections
  2. Normal Customer Ageing (9-bucket standard schedule)
  3. Customer Risk & Ageing Matrix
  4. Credit Control & Over Limit Exposure
  5. Collection Priority Queue
  6. Customer 360 Comprehensive Intelligence
  7. Salesperson Performance & Portfolio Analysis
  8. Branch Receivables & Risk Exposure
  9. Invoice Detail Ledger
  10. Collection Receipts Detail
  11. AR Consolidation Matrix
  12. 3 Days Ahead Overdue Schedule
  13. Product-Wise Receivables & Category Analytics
  14. Data Quality & Exception Audit
  15. Reconciliation Engine & Balance Audit
- **Additional Specialized Reports**:
  - Daily Overdue Follow-Up Schedule
  - Weekly Ageing and Overdue Multi-Report

### 3. Unified Excel Ingestion Hub
- **File 1: INPUT AGEING DATA** (Automatic detection of 13-column product-level format or 3-column customer-level format).
- **File 2: CUSTOMER CREDIT MASTER** (Customer terms, limits, salesman mapping, branch, promissory notes).
- **File 3: COLLECTION RECEIPTS** (Optional payment matching and coverage analysis).
- **File 4: SALESMAN DETAILS** (Optional contact directory dedicated strictly for automated WhatsApp messaging).
- In-memory processing ensuring **100% data privacy** — no financial data is uploaded to third-party servers.

### 4. Salesperson-Wise WhatsApp Automation
- **High-DPI Canvas Table Image Rendering**: Produces executive-styled, dark navy PNG report images with red overdue risk highlighting and accurate grand totals.
- **Salesperson Isolation**: Every salesperson receives strictly their own customer accounts.
- **1-Click Clipboard & wa.me Launcher**:
  - Automatically copies the high-resolution report PNG to the system clipboard.
  - Launches WhatsApp Web / App with a pre-filled, personalized executive summary caption.
  - Prompts immediate `Ctrl+V` attachment.
- **Sequential Dispatching**: Step through representatives sequentially with real-time status tracking (`Pending`, `Opened`, `Completed`, `Failed`).

### 5. Executive Excel Export Center (ExcelJS Powered)
- Over 15 fully formatted, formula-driven Excel workbooks branded with **FINORA AUTOMATION**.
- Branded header banners, frozen panes, custom number formats, print layouts, and clean audit metadata.

---

## 💻 How to Run

### Method 1: Direct Browser Launch (Zero Dependencies)
Double-click `index.html` or `FINORA-AUTOMATION.html` to open directly in any modern web browser (Chrome, Edge, Firefox, Safari).

### Method 2: Local Web Server
Run with any local HTTP server:
```bash
# Using Node.js
npx serve .

# Or using Python
python -m http.server 3000
```
Then navigate to `http://localhost:3000` in your browser.

---

## 🔒 Security & Data Privacy
- **100% Client-Side Processing**: All parsing, calculations, and rendering occur locally in the user's browser.
- **Session-Only Memory**: Customer Master and invoice ledgers remain in browser memory and are cleared upon page refresh.
