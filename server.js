// server.js
const express = require('express');
const path = require('path');
const rules = require('./config/rules.json');
const ledger = require('./services/ledger');

const app = express();
app.use(express.json());

// Serve the frontend UI
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------
// SENTINEL CORE LOGIC
// ---------------------------------------------------------
function evaluateSentinelGate(actionType) {
    if (rules.async_whitelist.includes(actionType)) {
        return { allowed: true, status: 'APPROVED_ASYNC', risk: 'LOW', reason: "Auto-approved low risk action" };
    }

    if (rules.sync_human_gate.includes(actionType)) {
        return { allowed: false, status: 'REVIEW_NEEDED', risk: 'MEDIUM', reason: "Requires human review" };
    }

    if (rules.blocked_operations.includes(actionType)) {
        return { allowed: false, status: 'BLOCKED', risk: 'HIGH', reason: "Auto-blocked high risk action" };
    }

    return { allowed: false, status: 'REVIEW_NEEDED', risk: 'MEDIUM', reason: "Unclassified action requires review" };
}

// ---------------------------------------------------------
// API ENDPOINTS
// ---------------------------------------------------------

// 1. Endpoint to retrieve the cryptographic ledger for the UI
app.get('/api/ledger', (req, res) => {
    res.json(ledger.getLedger());
});

// 2. Simulated Agent Endpoint (Receives tool call attempts)
app.post('/api/agent/action', async (req, res) => {
    // Rely purely on the frontend sending an action_type to simulate what an AI "would" have done
    let requestedAction = req.body.action_type;

    // If no action was requested, exit
    if (!requestedAction) {
        return res.status(400).json({ error: "No action requested." });
    }
    
    // Intercept with Sentinel
    const decision = evaluateSentinelGate(requestedAction);
    
    // Log to Cryptographic Ledger
    const logEntry = ledger.logAction({ 
        action_type: requestedAction, 
        status: decision.status, 
        risk: decision.risk 
    });

    if (decision.allowed) {
        res.json({ status: "success", executed: requestedAction, log: logEntry });
    } else {
        res.status(403).json({ error: "SENTINEL_GATE_TRIGGERED", decision: decision, log: logEntry });
    }
});

// 3. Endpoint to resolve a pending action (Human approval/rejection)
app.post('/api/agent/resolve', (req, res) => {
    const { original_index, approved } = req.body;
    
    if (original_index === undefined || approved === undefined) {
        return res.status(400).json({ error: "Missing original_index or approved boolean" });
    }
    
    // Log the human decision to the ledger
    const status = approved ? "APPROVED" : "BLOCKED";
    const logEntry = ledger.logAction({
        action_type: "human_review",
        original_index: original_index,
        status: status,
        risk: "N/A"
    });
    
    res.json({ status: "success", resolution: status, log: logEntry });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SENTINEL Middleware running on port ${PORT}`));