import fs from 'fs';

const LOG_FILE = 'llm_logs.jsonl';

/**
 * Clears the existing LLM log file.
 */
export function clearLogs() {
  if (fs.existsSync(LOG_FILE)) {
    try {
      fs.unlinkSync(LOG_FILE);
    } catch (err) {
      console.warn(`Failed to clear ${LOG_FILE}:`, err);
    }
  }
}

/**
 * Logs an LLM interaction to the JSONL file.
 * @param {string} context - The context or name of the function making the call.
 * @param {string} model - The model being used.
 * @param {string} prompt - The raw text prompt sent to the LLM.
 * @param {Object} response - The structured response parsed from the LLM.
 * @param {Error} [error] - Any error that occurred during the generation.
 */
export function logLLMCall(context, model, prompt, response = null, error = null) {
  let errorDetails = null;
  if (error) {
    errorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    };
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    context,
    model,
    prompt: prompt.trim(),
    response,
    error: errorDetails
  };

  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n', 'utf8');
  } catch (err) {
    console.error("Failed to write to LLM logs:", err);
  }
}

/**
 * Logs a lifecycle event to the JSONL file (e.g. Scrape Start, Retry Start).
 * @param {string} eventName - The name of the event.
 * @param {Object} details - Additional metadata about the event.
 */
export function logEvent(eventName, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: eventName,
    ...details
  };

  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n', 'utf8');
  } catch (err) {
    console.error("Failed to write event to LLM logs:", err);
  }
}
