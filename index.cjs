const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory storage (or use a database)
let catalogTags = null;
let lastUpdated = null;

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'JewelRender Catalog API',
    endpoints: {
      'GET /api/catalog-tags': 'Get current catalog tags',
      'POST /api/catalog-tags': 'Update catalog tags',
      'GET /api/status': 'Check API status'
    }
  });
});

// Get catalog tags
app.get('/api/catalog-tags', (req, res) => {
  if (!catalogTags) {
    return res.status(404).json({ 
      error: 'No catalog tags found',
      message: 'Ask your uploader to publish tags first'
    });
  }
  
  res.json({
    success: true,
    data: catalogTags,
    lastUpdated: lastUpdated
  });
});

// Save/Update catalog tags
app.post('/api/catalog-tags', (req, res) => {
  try {
    const { catalog, totalImages, userId, userEmail } = req.body;
    
    if (!catalog || !Array.isArray(catalog)) {
      return res.status(400).json({ 
        error: 'Invalid data format',
        message: 'Catalog must be an array'
      });
    }
    
    catalogTags = {
      catalog,
      totalImages: totalImages || catalog.length,
      userId,
      userEmail,
      publishedAt: new Date().toISOString()
    };
    
    lastUpdated = new Date().toISOString();
    
    res.json({
      success: true,
      message: 'Catalog tags updated successfully',
      totalImages: catalogTags.totalImages,
      publishedAt: catalogTags.publishedAt
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to update catalog tags',
      message: error.message
    });
  }
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'active',
    hasData: !!catalogTags,
    lastUpdated: lastUpdated,
    totalImages: catalogTags ? catalogTags.totalImages : 0
  });
});

// Health check for Railway
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Catalog API running on port ${PORT}`);
});