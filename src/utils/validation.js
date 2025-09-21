const validator = require('validator');

/**
 * Validation utilities for URL shortener
 */
class ValidationService {
  /**
   * Validate URL with strict requirements
   * @param {string} url - URL to validate
   * @returns {object} Validation result
   */
  static validateUrl(url) {
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        error: 'URL is required and must be a string'
      };
    }

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      return {
        isValid: false,
        error: 'URL cannot be empty'
      };
    }

    // Check if URL has protocol (required for security)
    if (!trimmedUrl.match(/^https?:\/\//)) {
      return {
        isValid: false,
        error: 'URL must include http:// or https:// protocol'
      };
    }

    // Use validator.js for comprehensive URL validation
    if (!validator.isURL(trimmedUrl, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      allow_underscores: true,
      host_whitelist: false,
      host_blacklist: false,
      allow_trailing_dot: false,
      allow_protocol_relative_urls: false
    })) {
      return {
        isValid: false,
        error: 'Invalid URL format'
      };
    }

    // Additional security checks to prevent SSRF
    try {
      const urlObj = new URL(trimmedUrl);
      
      // Block localhost, private IP ranges, and loopback addresses
      const hostname = urlObj.hostname.toLowerCase();
      
      if (hostname === 'localhost' || 
          hostname === '127.0.0.1' || 
          hostname === '0.0.0.0' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
        return {
          isValid: false,
          error: 'URLs pointing to private/local addresses are not allowed'
        };
      }

      // Block file:// and other potentially dangerous protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return {
          isValid: false,
          error: 'Only HTTP and HTTPS protocols are allowed'
        };
      }

    } catch (urlError) {
      return {
        isValid: false,
        error: 'Malformed URL'
      };
    }

    return {
      isValid: true,
      url: trimmedUrl
    };
  }

  /**
   * Validate validity (time in minutes)
   * @param {any} validity - Validity value to validate
   * @param {number} defaultValue - Default validity in minutes
   * @returns {object} Validation result
   */
  static validateValidity(validity, defaultValue = 30) {
    // If not provided, use default
    if (validity === undefined || validity === null) {
      return {
        isValid: true,
        validity: defaultValue
      };
    }

    // Convert to number if it's a string
    const validityNum = Number(validity);

    if (isNaN(validityNum)) {
      return {
        isValid: false,
        error: 'Validity must be a number'
      };
    }

    if (validityNum <= 0) {
      return {
        isValid: false,
        error: 'Validity must be greater than 0 minutes'
      };
    }

    if (validityNum > 525600) { // 1 year in minutes
      return {
        isValid: false,
        error: 'Validity cannot exceed 1 year (525600 minutes)'
      };
    }

    // Round to nearest integer
    return {
      isValid: true,
      validity: Math.round(validityNum)
    };
  }

  /**
   * Validate pagination parameters
   * @param {any} page - Page number
   * @param {any} limit - Items per page
   * @returns {object} Validation result
   */
  static validatePagination(page, limit) {
    const result = {
      page: 1,
      limit: 50
    };

    // Validate page
    if (page !== undefined && page !== null) {
      const pageNum = Number(page);
      if (isNaN(pageNum) || pageNum < 1) {
        return {
          isValid: false,
          error: 'Page must be a positive integer'
        };
      }
      result.page = Math.floor(pageNum);
    }

    // Validate limit
    if (limit !== undefined && limit !== null) {
      const limitNum = Number(limit);
      if (isNaN(limitNum) || limitNum < 1) {
        return {
          isValid: false,
          error: 'Limit must be a positive integer'
        };
      }
      if (limitNum > 1000) {
        return {
          isValid: false,
          error: 'Limit cannot exceed 1000'
        };
      }
      result.limit = Math.floor(limitNum);
    }

    return {
      isValid: true,
      ...result
    };
  }

  /**
   * Sanitize input string
   * @param {string} input - Input to sanitize
   * @param {number} maxLength - Maximum allowed length
   * @returns {string} Sanitized input
   */
  static sanitizeInput(input, maxLength = 1000) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .substring(0, maxLength)
      .replace(/[<>]/g, ''); // Remove potential XSS characters
  }

  /**
   * Extract and validate IP address from request
   * @param {object} req - Express request object
   * @returns {string} Client IP address
   */
  static extractClientIP(req) {
    // Check x-forwarded-for header first (for proxy/load balancer scenarios)
    const xForwardedFor = req.get('x-forwarded-for');
    if (xForwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ips = xForwardedFor.split(',').map(ip => ip.trim());
      return ips[0];
    }

    // Fallback to connection remote address
    return req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           'unknown';
  }

  /**
   * Validate and sanitize headers
   * @param {object} req - Express request object
   * @returns {object} Sanitized headers
   */
  static extractSafeHeaders(req) {
    const headers = {
      referrer: null,
      userAgent: null
    };

    // Extract and sanitize referrer
    const referrer = req.get('referer') || req.get('referrer');
    if (referrer) {
      headers.referrer = this.sanitizeInput(referrer, 500);
    }

    // Extract and sanitize user agent
    const userAgent = req.get('user-agent');
    if (userAgent) {
      headers.userAgent = this.sanitizeInput(userAgent, 500);
    }

    return headers;
  }
}

module.exports = ValidationService;