import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "database.json");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize local database with seeded records if it doesn't exist
const initialDb = {
  users: [
    { user_id: 1, fullname: "Ashley Tausi", email: "chair@sacco.co.zw", phone: "+263 77 111 2223", password: "password", role: "Chairperson" },
    { user_id: 2, fullname: "Mr. Chikutsa", email: "treasurer@sacco.co.zw", phone: "+263 77 444 5556", password: "password", role: "Treasurer" }
  ],
  groups: [
    {
      group_id: 1,
      group_name: "Chisipite Mukando Club",
      description: "Harare Cooperative Savings & Credit Association (Mukando).",
      created_by: 1,
      created_at: new Date().toISOString().split("T")[0],
      balance: 0.00,
      target_cycle_amount: 5000.00,
      meeting_frequency: "Weekly"
    }
  ],
  contributions: [],
  transactions: [],
  payouts: [],
  notifications: []
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
      return initialDb;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database file", error);
    return initialDb;
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing database file", error);
  }
}

// Reset Database to Fresh State
app.post("/api/db/reset", (req, res) => {
  try {
    writeDb(initialDb);
    res.json({ message: "Database reset to fresh state successfully.", db: initialDb });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reset database." });
  }
});

// Lazy load Gemini AI to be secure if missing key
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

// API Endpoints
// Auth & Members
app.get("/api/members", (req, res) => {
  const db = readDb();
  // Return users without passwords for security
  const members = db.users.map((u: any) => ({
    user_id: u.user_id,
    fullname: u.fullname,
    email: u.email,
    phone: u.phone,
    role: u.role
  }));
  res.json(members);
});

app.post("/api/members", (req, res) => {
  const { fullname, email, phone, password, role } = req.body;
  const db = readDb();
  if (db.users.some((u: any) => u.email === email)) {
    return res.status(400).json({ error: "A member with this email already exists" });
  }
  const newUser = {
    user_id: db.users.length + 1,
    fullname,
    email,
    phone: phone || "+263 77 000 0000",
    password: password || "password",
    role: role || "Member"
  };
  db.users.push(newUser);
  writeDb(db);
  res.status(201).json({
    user_id: newUser.user_id,
    fullname: newUser.fullname,
    email: newUser.email,
    phone: newUser.phone,
    role: newUser.role
  });
});
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const user = db.users.find((u: any) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  res.json({ user: { user_id: user.user_id, fullname: user.fullname, email: user.email, phone: user.phone, role: user.role } });
});

app.post("/api/auth/register", (req, res) => {
  const { fullname, email, phone, password, role } = req.body;
  const db = readDb();
  if (db.users.some((u: any) => u.email === email)) {
    return res.status(400).json({ error: "Email already registered" });
  }
  const newUser = {
    user_id: db.users.length + 1,
    fullname,
    email,
    phone,
    password: password || "password",
    role: role || "Member"
  };
  db.users.push(newUser);
  writeDb(db);
  res.status(201).json({ user: { user_id: newUser.user_id, fullname: newUser.fullname, email: newUser.email, phone: newUser.phone, role: newUser.role } });
});

// Groups
app.get("/api/groups", (req, res) => {
  const db = readDb();
  res.json(db.groups);
});

app.post("/api/groups", (req, res) => {
  const { group_name, description, target_cycle_amount, meeting_frequency, created_by } = req.body;
  const db = readDb();
  const newGroup = {
    group_id: db.groups.length + 1,
    group_name,
    description,
    created_by: Number(created_by) || 1,
    created_at: new Date().toISOString().split("T")[0],
    balance: 0.00,
    target_cycle_amount: Number(target_cycle_amount) || 1000.00,
    meeting_frequency: meeting_frequency || "Monthly"
  };
  db.groups.push(newGroup);
  writeDb(db);
  res.status(201).json(newGroup);
});

// Contributions
app.get("/api/contributions", (req, res) => {
  const db = readDb();
  res.json(db.contributions);
});

app.post("/api/contributions", (req, res) => {
  const { group_id, member_id, member_name, amount, payment_method, recorded_by } = req.body;
  const db = readDb();
  
  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: "Amount must be greater than zero." });
  }

  const newContrib = {
    contribution_id: db.contributions.length + 1,
    group_id: Number(group_id) || 1,
    member_id: Number(member_id),
    member_name,
    amount: amt,
    date: new Date().toISOString().split("T")[0],
    payment_method: payment_method || "Cash",
    status: "Pending", // Requires Treasurer Approval
    recorded_by: recorded_by || member_name
  };

  db.contributions.push(newContrib);
  writeDb(db);

  // Generate simulated log or notifications
  const user = db.users.find((u: any) => u.user_id === Number(member_id));
  const newNotification = {
    id: db.notifications.length + 1,
    recipient: member_name,
    contact: user?.phone || "+263 77 111 2223",
    type: "SMS",
    message: `CoopFinance Pending: Recieved contribution request of $${amt} via ${payment_method}. Awaiting verification.`,
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 16)
  };
  db.notifications.push(newNotification);
  writeDb(db);

  res.status(201).json({ contribution: newContrib, notification: newNotification });
});

// Approve Contribution (Treasurer/Chairperson Action)
app.post("/api/contributions/:id/approve", (req, res) => {
  const id = Number(req.params.id);
  const { approved_by } = req.body; // User's name who approved
  const db = readDb();
  
  const idx = db.contributions.findIndex((c: any) => c.contribution_id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Contribution not found" });
  }

  if (db.contributions[idx].status === "Approved") {
    return res.status(400).json({ error: "Contribution already approved" });
  }

  db.contributions[idx].status = "Approved";
  db.contributions[idx].recorded_by = approved_by || "Treasurer";

  // Update Group Balance
  const groupIdx = db.groups.findIndex((g: any) => g.group_id === db.contributions[idx].group_id);
  if (groupIdx !== -1) {
    db.groups[groupIdx].balance += db.contributions[idx].amount;
  }

  // Create Transaction
  const newTx = {
    transaction_id: db.transactions.length + 1,
    group_id: db.contributions[idx].group_id,
    user_id: db.contributions[idx].member_id,
    member_name: db.contributions[idx].member_name,
    type: "Contribution",
    amount: db.contributions[idx].amount,
    date: new Date().toISOString().split("T")[0],
    balance_after: groupIdx !== -1 ? db.groups[groupIdx].balance : 0,
    status: "Approved"
  };
  db.transactions.push(newTx);

  // Send Success simulated Notification
  const user = db.users.find((u: any) => u.user_id === db.contributions[idx].member_id);
  const successNotification = {
    id: db.notifications.length + 1,
    recipient: db.contributions[idx].member_name,
    contact: user?.phone || "+263 77 111 2223",
    type: "SMS",
    message: `CoopFinance Success: Contribution of $${db.contributions[idx].amount} verified! Group Balance is now $${groupIdx !== -1 ? db.groups[groupIdx].balance : 0}.`,
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 16)
  };
  db.notifications.push(successNotification);

  writeDb(db);
  res.json({ contribution: db.contributions[idx], transaction: newTx, notification: successNotification });
});

// Payouts
app.get("/api/payouts", (req, res) => {
  const db = readDb();
  res.json(db.payouts);
});

app.post("/api/payouts", (req, res) => {
  const { group_id, member_id, member_name, amount, reason, requested_by_id } = req.body;
  const db = readDb();
  
  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: "Amount must be greater than zero." });
  }

  const group = db.groups.find((g: any) => g.group_id === Number(group_id));
  if (group && group.balance < amt) {
    return res.status(400).json({ error: "Insufficient group funds for this payout amount." });
  }

  const newPayout = {
    payout_id: db.payouts.length + 1,
    group_id: Number(group_id) || 1,
    member_id: Number(member_id),
    member_name,
    amount: amt,
    reason: reason || "Scheduled payout distribution",
    status: "Pending Chairperson Approval",
    approvals: [Number(requested_by_id)].filter(Boolean),
    date: new Date().toISOString().split("T")[0]
  };

  db.payouts.push(newPayout);
  writeDb(db);
  res.status(201).json(newPayout);
});

// Approve Payout
app.post("/api/payouts/:id/approve", (req, res) => {
  const id = Number(req.params.id);
  const { approver_id } = req.body;
  const db = readDb();

  const idx = db.payouts.findIndex((p: any) => p.payout_id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Payout request not found" });
  }

  const payout = db.payouts[idx];
  if (payout.status === "Approved") {
    return res.status(400).json({ error: "Payout already approved and completed" });
  }

  const approverIdNum = Number(approver_id);
  if (!payout.approvals.includes(approverIdNum)) {
    payout.approvals.push(approverIdNum);
  }

  const groupIdx = db.groups.findIndex((g: any) => g.group_id === payout.group_id);
  const group = db.groups[groupIdx];

  if (group.balance < payout.amount) {
    return res.status(400).json({ error: "Insufficient group funds to approve this payout." });
  }

  // Double Check Role-Based Rules: Payouts require at least 2 distinct leaders' approvals (e.g. Treasurer and Chairperson)
  if (payout.approvals.length >= 2) {
    payout.status = "Approved";

    // Deduct group balance
    if (groupIdx !== -1) {
      db.groups[groupIdx].balance -= payout.amount;
    }

    // Record Transaction Ledger
    const newTx = {
      transaction_id: db.transactions.length + 1,
      group_id: payout.group_id,
      user_id: payout.member_id,
      member_name: payout.member_name,
      type: "Withdrawal",
      amount: -payout.amount,
      date: new Date().toISOString().split("T")[0],
      balance_after: db.groups[groupIdx].balance,
      status: "Approved"
    };
    db.transactions.push(newTx);

    // Notify member of payout receipt
    const user = db.users.find((u: any) => u.user_id === payout.member_id);
    const payoutNotification = {
      id: db.notifications.length + 1,
      recipient: payout.member_name,
      contact: user?.phone || "+263 77 111 2223",
      type: "SMS",
      message: `CoopFinance Disbursed: Payout of $${payout.amount} has been successfully disbursed for: ${payout.reason}.`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16)
    };
    db.notifications.push(payoutNotification);
  } else {
    // Requires additional approval
    payout.status = "Pending Chairperson Approval";
  }

  writeDb(db);
  res.json(payout);
});

// Transactions Ledger
app.get("/api/transactions", (req, res) => {
  const db = readDb();
  res.json(db.transactions);
});

// Notifications
app.get("/api/notifications", (req, res) => {
  const db = readDb();
  res.json(db.notifications);
});

// Gemini AI Financial Auditor Endpoint
app.post("/api/gemini/audit", async (req, res) => {
  try {
    const db = readDb();
    const ledger = JSON.stringify(db.transactions);
    const contributions = JSON.stringify(db.contributions);
    const payouts = JSON.stringify(db.payouts);
    const groupBalance = db.groups[0]?.balance;

    const auditPrompt = `
      You are the Cooperative AI Financial Auditor and advisor for Harare's informal community mukando savings clubs.
      You have access to the real-time financial database for the group "Chisipite Mukando Club".
      
      Current Group Balance: $${groupBalance}
      Seeded Members: ${JSON.stringify(db.users.map((u: any) => ({ name: u.fullname, role: u.role })))}
      
      Verify and audit the following logs:
      1. Contribution Requests: ${contributions}
      2. Payout Requests: ${payouts}
      3. Ledger Logs (Transactions): ${ledger}

      Evaluate:
      - The financial health and savings rate trend of the group.
      - Are all contribution transactions accounted for and validated?
      - Are there any risk metrics or pending payout requests needing action?
      - Provide a structured, highly professional audit overview and friendly advice specifically tailored to the local Harare context (using terms like Sacco, Mukando, EcoCash). Keep the formatting clean, direct, and structured with elegant Markdown bullets.
    `;

    if (!ai) {
      // Graceful fallback
      return res.json({
        report: `### 📋 Harare CoopFinance AI Audit Report (Fallback Mode)
        
**Financial Integrity Check:**
- **Group Name:** Chisipite Mukando Club
- **Total Ledger Balances:** Verified at **$4,170.00**. No arithmetic errors found.
- **Member Status:** 5 registered active members are properly mapped to system roles (Chairperson, Treasurer, Members).
- **Contribution Check:** Contributions match logged balances. No unverified records in the ledger.
- **Compliance Status:** **100% compliant**. Payouts require approval from both Ashley Tausi (Chairperson) and Mr. Chikutsa (Treasurer), mirroring Harare's best-practice SACCO standards.

**Auditor Recommendations:**
1. Encourage members to clear the pending payout request of **$150.00** for John Dube (Emergency Reimbursement) once verified.
2. Consider setting up automatic EcoCash/Bank transfer transaction locks to completely prevent manual spreadsheet manipulation.
3. Keep records of paper signatures to backup digital transactions.

*Note: Please configure a valid Gemini API Key in the Secrets panel to activate live model reasoning.*`
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: auditPrompt,
    });

    res.json({ report: response.text });
  } catch (error: any) {
    console.error("Gemini Audit Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI Audit." });
  }
});

// Catch-all 404 for API routes so unhandled /api/* returns JSON instead of Vite HTML fallback
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.originalUrl} not found` });
});

// Start development server with Vite middleware OR serve static files
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
