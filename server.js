const express = require('express');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Set directory for stored static user sites
const SITES_DIR = path.join(__dirname, 'hosted_sites');

// Ensure storage directory exists at startup
fs.ensureDirSync(SITES_DIR);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Dynamic Router for User-Created Codix Sites
app.get('/sites/:slug', (req, res) => {
  const safeSlug = req.params.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  // Strip trailing '.html' if passed in URL
  const cleanSlug = safeSlug.endsWith('-html') ? safeSlug.slice(0, -5) : safeSlug;
  const filePath = path.join(SITES_DIR, `${cleanSlug}.html`);

  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>404 - Codix Site Not Found</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-900 text-white flex items-center justify-center min-h-screen font-sans">
      <div class="text-center p-8 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-w-md">
        <h1 class="text-4xl font-extrabold text-indigo-400 mb-2">404</h1>
        <h2 class="text-xl font-bold mb-4">Codix Site Not Found</h2>
        <p class="text-gray-400 text-sm mb-6">The site <code class="bg-gray-700 px-2 py-1 rounded text-indigo-300">${cleanSlug}</code> does not exist or has been removed.</p>
        <a href="/" class="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg transition">Back to Studio Builder</a>
      </div>
    </body>
    </html>
  `);
});

// Publishing API Route
app.post('/api/publish', async (req, res) => {
  try {
    const { slug, pageTitle, htmlContent } = req.body;

    if (!slug || !htmlContent) {
      return res.status(400).json({ error: 'Site address (slug) and content are required.' });
    }

    const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const filePath = path.join(SITES_DIR, `${safeSlug}.html`);

    const fullDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle || safeSlug + ' | Created with Codix'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Playfair+Display:wght@700&family=Poppins:wght@400;600;700&family=Roboto+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-white min-h-screen text-gray-900">
  ${htmlContent}
</body>
</html>`;

    await fs.writeFile(filePath, fullDocument, 'utf8');

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const siteUrl = `${protocol}://${host}/sites/${safeSlug}`;

    res.json({ success: true, url: siteUrl });
  } catch (err) {
    console.error('Publish Error:', err);
    res.status(500).json({ error: 'Failed to write site to disk.' });
  }
});

app.listen(PORT, () => {
  console.log(`Codix Engine running on port ${PORT}`);
});