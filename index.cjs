const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware with proper CORS configuration
app.use(cors({
  origin: ['https://bolt.new', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// In-memory storage (or use a database)
let catalogTags = null;
let lastUpdated = null;
let allBatches = []; // Store info about all uploaded batches

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
    const { catalog, totalImages, userId, userEmail, folderInfo } = req.body;
    
    if (!catalog || !Array.isArray(catalog)) {
      return res.status(400).json({ 
        error: 'Invalid data format',
        message: 'Catalog must be an array'
      });
    }
    
    // If this is the first upload or we're replacing everything
    if (!catalogTags) {
      catalogTags = {
        catalog: [],
        totalImages: 0,
        userId,
        userEmail,
        publishedAt: new Date().toISOString(),
        batches: []
      };
    }
    
    // Add new batch info
    const batchInfo = {
      batchId: folderInfo?.batchId || `batch_${Date.now()}`,
      folderName: folderInfo?.folderName || 'Unknown Folder',
      driveType: folderInfo?.driveType || 'local',
      networkPath: folderInfo?.networkPath,
      analyzedDate: folderInfo?.analyzedDate || new Date().toISOString(),
      imageCount: totalImages,
      startIndex: catalogTags.catalog.length,
      endIndex: catalogTags.catalog.length + catalog.length - 1
    };
    
    // Append to existing catalog
    catalogTags.catalog = [...catalogTags.catalog, ...catalog];
    catalogTags.totalImages = catalogTags.catalog.length;
    catalogTags.batches.push(batchInfo);
    catalogTags.lastUpdated = new Date().toISOString();
    
    lastUpdated = new Date().toISOString();
    
    res.json({
      success: true,
      message: 'Catalog tags updated successfully',
      totalImages: catalogTags.totalImages,
      batchInfo: batchInfo,
      totalBatches: catalogTags.batches.length
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