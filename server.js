const express = require('express');
const fs = require('fs-extra');
const path = require('path');

const app = express();
// Render automatically sets process.env.PORT
const PORT = process.env.PORT || 3000;

// On Render, attach a Persistent Disk at '/var/data' to keep user sites saved permanently.
// Falls back to local 'hosted_sites' for local development.
const SITES_DIR = process.env.RENDER ? '/var/data/hosted_sites' : path.join(__dirname, 'hosted_sites');
fs.ensureDirSync(SITES_DIR);

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Dynamic routing for hosted user sites
app.use('/sites', express.static(SITES_DIR));

// Clean URL router: allows accessing 'codix.onrender.com/sites/my-page' directly
app.get('/sites/:slug', (req, res) => {
  const safeSlug = req.params.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const filePath = path.join(SITES_DIR, `${safeSlug}.html`);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('<h1>404 - Codix Site Not Found</h1>');
  }
});

// API endpoint to compile and save user sites
app.post('/api/publish', async (req, res) => {
  const { slug, pageTitle, htmlContent } = req.body;

  if (!slug || !htmlContent) {
    return res.status(400).json({ error: 'Site slug and content are required.' });
  }

  const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const filePath = path.join(SITES_DIR, `${safeSlug}.html`);

  const fullDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle || safeSlug + ' | Powered by Codix'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-white min-h-screen text-gray-900">
  ${htmlContent}
</body>
</html>`;

  try {
    await fs.writeFile(filePath, fullDocument, 'utf8');

    // Automatically construct public production URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const siteUrl = `${protocol}://${host}/sites/${safeSlug}`;

    res.json({ success: true, url: siteUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to publish site.' });
  }
});

app.listen(PORT, () => {
  console.log(`Codix Engine running on port ${PORT}`);
});