const axios = require('axios');

const SECRET_CODE = process.env.SECRET_CODE;
const WORKER_URL = "https://llm-deployment-worker.onrender.com"; 
// External worker endpoint (e.g., Railway, Render, your own server)

// Vercel function - just validates and forwards to worker
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ 
      success: true, 
      status: "operational",
      message: "LLM Deployment API is running",
      endpoint: "/api/build",
      method: "POST",
      timestamp: new Date().toISOString(),
      worker_configured: !!WORKER_URL
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, secret, task, round, nonce, brief, checks, evaluation_url, attachments = [] } = req.body;

    // Validate secret
    if (secret !== SECRET_CODE) {
      return res.status(401).json({ error: 'Invalid secret code' });
    }

    // Validate required fields
    if (!email || !task || !round || !nonce || !brief || !evaluation_url) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['email', 'task', 'round', 'nonce', 'brief', 'evaluation_url']
      });
    }

    // Forward to worker immediately (don't wait for response)
    if (WORKER_URL) {
      axios.post(WORKER_URL, req.body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      }).catch(err => {
        console.error('Worker notification failed:', err.message);
      });
    }

    // Return immediate success
    return res.status(200).json({ 
      success: true, 
      message: 'Task received and forwarded to worker',
      task: task,
      round: round,
      nonce: nonce,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
