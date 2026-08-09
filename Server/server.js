import express, { json, static as expressStatic } from 'express';
import { promises as fs } from 'fs';
import { join } from 'node:path';

const __filename = import.meta.filename;
const __dirname = import.meta.dirname;

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = join(import.meta.dirname, 'data.json');

// Middleware
app.use(json());

// Serve the static files from the Vite build directory
// (Assuming you run `npm run build` and it creates a 'dist' folder)
app.use(expressStatic(join(import.meta.dirname, 'dist')));

// Helper to initialize data file if it doesn't exist
async function ensureDataFileExists() {
  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    // If file doesn't exist, create it with empty schedule
    const emptySchedule = {};
    await fs.writeFile(DATA_FILE, JSON.stringify(emptySchedule, null, 2));
    console.log('Created new data.json file.');
  }
}

ensureDataFileExists();

// --- API ROUTES ---

// GET: Retrieve the schedule
app.get('/api/schedule', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading schedule:', error);
    res.status(500).json({ error: 'Failed to read schedule' });
  }
});

// POST: Update the schedule
app.post('/api/schedule', async (req, res) => {

  try {
    const newSchedule = req.body;
    
    await fs.writeFile(DATA_FILE, JSON.stringify(newSchedule, null, 2));
    res.json({ success: true, message: 'Schedule saved successfully' });
  } catch (error) {
    console.error('Error saving schedule:', error);
    res.status(500).json({ error: 'Failed to save schedule' });
  }
});

// Fallback: Send all other requests to the React app (Client-side routing)
app.get('/*matchall', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📁 Saving data to ${DATA_FILE}`);
});