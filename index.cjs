const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// In-memory storage PER USER (or use a database)
let userCatalogs = {}; // Store catalogs by userId

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

// Get catalog tags - NOW REQUIRES userId
app.get('/api/catalog-tags', (req, res) => {
  const userId = req.query.userId || req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(400).json({ 
      error: 'User ID required',
      message: 'Please provide userId as query parameter'
    });
  }
  
  if (!userCatalogs[userId]) {
    return res.status(404).json({ 
      error: 'No catalog tags found',
      message: 'Ask your uploader to publish tags first'
    });
  }
  
  res.json({
    success: true,
    data: userCatalogs[userId],
    lastUpdated: userCatalogs[userId].lastUpdated
  });
});

// Save/Update catalog tags - NOW STORES PER USER
app.post('/api/catalog-tags', (req, res) => {
  try {
    const { catalog, totalImages, userId, userEmail, folderInfo, tierStats } = req.body;
    
    if (!catalog || !Array.isArray(catalog)) {
      return res.status(400).json({ 
        error: 'Invalid data format',
        message: 'Catalog must be an array'
      });
    }
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID required',
        message: 'userId must be provided in request body'
      });
    }
    
    // Initialize user catalog if doesn't exist
    if (!userCatalogs[userId]) {
      userCatalogs[userId] = {
        catalog: [],
        totalImages: 0,
        userId,
        userEmail,
        publishedAt: new Date().toISOString(),
        batches: [],
        tierStats: { basic: 0, enhanced: 0, premium: 0 }
      };
    }
    
    // Add new batch info
    const batchInfo = {
      batchId: folderInfo?.batchId || `batch_${Date.now()}`,
      folderName: folderInfo?.folderName || 'Unknown Folder',
      driveType: folderInfo?.driveType || 'local',
      networkPath: folderInfo?.networkPath,
      fullPath: folderInfo?.fullPath,
      analyzedDate: folderInfo?.analyzedDate || new Date().toISOString(),
      imageCount: totalImages,
      startIndex: userCatalogs[userId].catalog.length,
      endIndex: userCatalogs[userId].catalog.length + catalog.length - 1
    };
    
    // Append to user's catalog
    userCatalogs[userId].catalog = [...userCatalogs[userId].catalog, ...catalog];
    userCatalogs[userId].totalImages = userCatalogs[userId].catalog.length;
    userCatalogs[userId].batches.push(batchInfo);
    userCatalogs[userId].lastUpdated = new Date().toISOString();
    
    // Update tier stats if provided
    if (tierStats) {
      userCatalogs[userId].tierStats = tierStats;
    }
    
    res.json({
      success: true,
      message: 'Catalog tags updated successfully',
      totalImages: userCatalogs[userId].totalImages,
      batchInfo: batchInfo,
      totalBatches: userCatalogs[userId].batches.length
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to update catalog tags',
      message: error.message
    });
  }
});

// Status endpoint - NOW SHOWS PER-USER STATS
app.get('/api/status', (req, res) => {
  const totalUsers = Object.keys(userCatalogs).length;
  const totalImages = Object.values(userCatalogs).reduce(
    (sum, userCatalog) => sum + (userCatalog.totalImages || 0), 0
  );
  
  res.json({
    status: 'active',
    totalUsers,
    totalImages,
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 + ' MB'
  });
});

// NEW: Clear user data endpoint (for testing)
app.delete('/api/catalog-tags/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (userCatalogs[userId]) {
    delete userCatalogs[userId];
    res.json({
      success: true,
      message: `Cleared catalog data for user ${userId}`
    });
  } else {
    res.status(404).json({
      error: 'User not found'
    });
  }
});

// Health check for Railway
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Catalog API running on port ${PORT}`);
});