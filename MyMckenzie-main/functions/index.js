const functions = require('firebase-functions');
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');
const pdf = require('pdf-parse');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const storage = new Storage();

async function fetchStorageFileContents(bucketName, filePath) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [meta] = await file.getMetadata();
  const contentType = meta.contentType || '';
  const [buffer] = await file.download();
  if (contentType.includes('pdf') || filePath.toLowerCase().endsWith('.pdf')) {
    try {
      const data = await pdf(buffer);
      return data.text;
    } catch (e) {
      console.error('PDF parse error for', filePath, e);
      return buffer.toString('utf8');
    }
  }
  // default: return as utf8 text
  return buffer.toString('utf8');
}

app.post('/generate', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || (functions.config && functions.config().gemini && functions.config().gemini.key);
    if (!apiKey) return res.status(500).json({ error: 'Server misconfigured: missing GEMINI_API_KEY' });

    const body = req.body || {};

    // If the client provided storagePaths, fetch their content and append to the prompt
    const storagePaths = body.storagePaths || [];
    if (Array.isArray(storagePaths) && storagePaths.length) {
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET || (functions.config && functions.config().project && functions.config().project.storageBucket) || (process.env.GCLOUD_PROJECT + '.appspot.com');
      const fileTexts = [];
      for (const path of storagePaths) {
        // path can be 'folder/name.pdf' or 'gs://bucket/folder/name.pdf'
        let filePath = path;
        let targetBucket = bucketName;
        if (path.startsWith('gs://')) {
          const rest = path.replace('gs://', '');
          const firstSlash = rest.indexOf('/');
          if (firstSlash > 0) {
            targetBucket = rest.slice(0, firstSlash);
            filePath = rest.slice(firstSlash + 1);
          }
        }
        try {
          const text = await fetchStorageFileContents(targetBucket, filePath);
          if (text) fileTexts.push({ path: filePath, text: text.slice(0, 20000) }); // cap to avoid huge prompts
        } catch (e) {
          console.error('Error fetching storage file', path, e);
        }
      }
      if (fileTexts.length) {
        // append as an assistant/system message so the model can reference it
        const attachmentsText = fileTexts.map(f => `-- FILE: ${f.path} --\n${f.text}`).join('\n\n');
        body.contents = body.contents || [];
        body.contents.push({ role: 'user', parts: [{ text: `Attached files content:\n${attachmentsText}` }] });
      }
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

exports.api = functions.https.onRequest(app);
