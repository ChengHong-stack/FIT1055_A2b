# FIT1055 A2b SENTINEL - AI Middleware Gateway

Sentinel is a Node.js-based AI middleware gateway designed to intercept, evaluate, and monitor LLM tool-calling actions. It provides a web dashboard for live auditing, policy enforcement, and human-in-the-loop review.

## Prerequisites
- **Node.js**: v14.0 or higher
- **Ollama**: Local LLM runner
- **Local LLM Model**: `qwen2.5:0.5b` (configured via OpenAI SDK pointing to local Ollama)

## Setup Instructions

1. **Install Dependencies**
   Navigate to the project directory and install the required npm packages:
   ```bash
   npm install
   ```

2. **Prepare the Local AI Model**
   Ensure Ollama is running on your workstation and pull the required model:
   ```bash
   ollama pull qwen2.5:0.5b
   ```

3. **Start the Sentinel Gateway**
   Launch the Node.js server:
   ```bash
   npm start
   ```
   *(Alternatively, you can run `node server.js`)*

4. **Access the Dashboard**
   Open your web browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

## Configuration
- **Rule Definitions**: Risk categorizations and tool permissions are structured in `config/rules.json`.
- **Global Policy Mode**: The system is currently running in a **Strict Human Oversight** mode. *All* AI actions, regardless of predefined base risk levels (LOW, HIGH, CRITICAL), will be forcibly routed to the dashboard with a `REVIEW_NEEDED` status for manual resolution.

## Testing and Simulation
To safely test the routing, polling, and frontend review mechanics without executing real LLM prompts:
1. Open the Dashboard at `http://localhost:3000`.
2. Locate the **Simulator Tools** section on the main page.
3. Click the test buttons to queue mock AI actions.
4. Navigate to the pending actions to Accept or Block the requests, taking note of how the decisions asynchronously write back to the Cryptographic Ledger.