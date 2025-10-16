const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SECRET_CODE = process.env.SECRET_CODE;

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
  baseURL: 'https://aipipe.iitm.ac.in/anthropic/v1'
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Simple in-memory task queue
 * For production, replace with DB, Redis, or queue service
 */
const TASK_QUEUE_FILE = path.join(process.cwd(), 'task-queue.json');
function enqueueTask(task) {
  let queue = [];
  try {
    if (fs.existsSync(TASK_QUEUE_FILE)) {
      queue = JSON.parse(fs.readFileSync(TASK_QUEUE_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to read task queue:', err);
  }
  queue.push(task);
  try {
    fs.writeFileSync(TASK_QUEUE_FILE, JSON.stringify(queue, null, 2));
  } catch (err) {
    console.error('Failed to write task queue:', err);
  }
}

// === Existing helper functions ===
// decodeDataURI, generateCode, createGitHubRepo, pushFileToGitHub,
// enableGitHubPages, getLatestCommitSHA, updateFileOnGitHub,
// notifyEvaluationURL, generateREADME, MIT_LICENSE
// (Copy all your existing helper functions here without change)

// ====================== API HANDLER ======================
module.exports = async (req, res) => {
  // Allow GET for testing
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: "LLM Deployment API is running",
      endpoint: "/api/build",
      method: "POST",
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const {
      email,
      secret,
      task,
      round,
      nonce,
      brief,
      checks,
      evaluation_url,
      attachments = []
    } = req.body;

    if (secret !== SECRET_CODE) {
      return res.status(401).json({ error: 'Invalid secret code' });
    }

    if (!email || !task || !round || !nonce || !brief || !evaluation_url) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'task', 'round', 'nonce', 'brief', 'evaluation_url']
      });
    }

    // === IMMEDIATE RESPONSE ===
    res.status(200).json({
      success: true,
      message: 'Task received and queued for processing',
      task: task,
      round: round,
      nonce: nonce
    });

    // === QUEUE TASK FOR ASYNC PROCESSING ===
    enqueueTask({
      email,
      task,
      round,
      nonce,
      brief,
      checks,
      evaluation_url,
      attachments,
      timestamp: new Date().toISOString()
    });

    console.log(`Queued task: ${task}, round: ${round}, email: ${email}`);
  } catch (error) {
    console.error('Request handling error:', error);
    // Response already sent
  }
};
