const express = require('express');
const geoip = require('geoip-lite');
const Url = require('../models/Url');
const shortcodeService = require('../services/shortcodeService');
const ValidationService = require('../utils/validation');
const loggingClient = require('../services/loggingClient');
const config = require('../config');

const router = express.Router();


router.post('/shorturls', async (req, res) => {
  try {
    const { url, validity, shortcode } = req.body;

    
    const urlValidation = ValidationService.validateUrl(url);
    if (!urlValidation.isValid) {
      return res.status(400).json({
        message: urlValidation.error
      });
    }

 
    const validityValidation = ValidationService.validateValidity(validity, config.defaultValidityMinutes);
    if (!validityValidation.isValid) {
      return res.status(400).json({
        message: validityValidation.error
      });
    }

   
    const shortcodeResult = await shortcodeService.processShortcode(shortcode);
    if (!shortcodeResult.success) {
      return res.status(shortcodeResult.statusCode || 500).json({
        message: shortcodeResult.error
      });
    }

    
    const expiryAt = new Date(Date.now() + validityValidation.validity * 60 * 1000);

 
    const urlDoc = new Url({
      shortcode: shortcodeResult.shortcode,
      originalUrl: urlValidation.url,
      expiryAt,
      clickCount: 0,
      clicks: []
    });

    await urlDoc.save();

    const shortLink = `${config.hostname}/${shortcodeResult.shortcode}`;
    const response = {
      shortLink,
      expiry: expiryAt.toISOString()
    };

    
    try {
      await loggingClient.Log(
        'backend',
        'info',
        'service',
        `Short URL created: ${shortcodeResult.shortcode} -> ${urlValidation.url}`
      );
    } catch (logError) {
     
      console.warn('[Routes] Failed to log URL creation:', logError.message);
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('[Routes] Error creating short URL:', error);
    
    
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Shortcode already exists'
      });
    }

    res.status(500).json({
      message: 'Internal server error'
    });
  }
});


router.get('/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;

    
    const urlDoc = await Url.findOne({ shortcode });

    if (!urlDoc) {
      return res.status(404).json({
        message: 'shortcode not found'
      });
    }

    
    if (urlDoc.isExpired()) {
      return res.status(410).json({
        message: 'link expired'
      });
    }

    
    const clientIP = ValidationService.extractClientIP(req);
    const headers = ValidationService.extractSafeHeaders(req);
    
   
    let country = null;
    try {
      const geo = geoip.lookup(clientIP);
      country = geo ? geo.country : null;
    } catch (geoError) {
    
      console.warn('[Routes] GeoIP lookup failed:', geoError.message);
    }

    
    const clickData = {
      ts: new Date(),
      ip: clientIP,
      referrer: headers.referrer,
      userAgent: headers.userAgent,
      country
    };

    await urlDoc.addClick(clickData);

    
    try {
      await loggingClient.Log(
        'backend',
        'info',
        'route',
        `Redirect: ${shortcode} accessed from IP ${clientIP}`
      );
    } catch (logError) {
     
      console.warn('[Routes] Failed to log redirect:', logError.message);
    }

    
    res.redirect(302, urlDoc.originalUrl);

  } catch (error) {
    console.error('[Routes] Error handling redirect:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});


router.get('/shorturls/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;
    const { page, limit } = req.query;

    
    const paginationValidation = ValidationService.validatePagination(page, limit);
    if (!paginationValidation.isValid) {
      return res.status(400).json({
        message: paginationValidation.error
      });
    }

    // Find the URL document
    const urlDoc = await Url.findOne({ shortcode });

    if (!urlDoc) {
      return res.status(404).json({
        message: 'shortcode not found'
      });
    }

    // Prepare paginated clicks
    const startIndex = (paginationValidation.page - 1) * paginationValidation.limit;
    const endIndex = startIndex + paginationValidation.limit;
    const paginatedClicks = urlDoc.clicks.slice(startIndex, endIndex);

    // Build response
    const response = {
      shortcode: urlDoc.shortcode,
      originalUrl: urlDoc.originalUrl,
      createdAt: urlDoc.createdAt,
      expiry: urlDoc.expiryAt,
      totalClicks: urlDoc.clickCount,
      clicks: paginatedClicks
    };

    res.json(response);

  } catch (error) {
    console.error('[Routes] Error getting shortcode stats:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

module.exports = router;