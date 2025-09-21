const axios = require('axios');
const config = require('../config');

/**
 * Logging client that integrates with AffordMed test server
 * Handles authentication, token caching, and automatic token refresh
 */
class LoggingClient {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    this.isAuthenticating = false;
    this.authPromise = null;
    
    // Validate required configuration
    this.validateConfig();
  }

  /**
   * Validate that all required logging configuration is present
   */
  validateConfig() {
    const required = ['authUrl', 'logsUrl', 'accessCode', 'clientId', 'clientSecret', 'email', 'name', 'rollNo'];
    const missing = required.filter(key => !config.logging[key]);
    
    if (missing.length > 0) {
      console.warn(`[LoggingClient] Missing required config: ${missing.join(', ')}. Logging will be disabled.`);
      this.disabled = true;
    }
  }

  /**
   * Authenticate with the AffordMed auth service
   * @returns {Promise<string>} Authentication token
   */
  async authenticate() {
    if (this.disabled) {
      throw new Error('Logging client is disabled due to missing configuration');
    }

    // If already authenticating, wait for the existing promise
    if (this.isAuthenticating && this.authPromise) {
      return this.authPromise;
    }

    this.isAuthenticating = true;
    
    this.authPromise = this._performAuth();
    
    try {
      const result = await this.authPromise;
      this.isAuthenticating = false;
      return result;
    } catch (error) {
      this.isAuthenticating = false;
      throw error;
    }
  }

  /**
   * Perform the actual authentication request
   * @private
   */
  async _performAuth() {
    try {
      const authData = {
        email: config.logging.email,
        name: config.logging.name,
        rollNo: config.logging.rollNo,
        accessCode: config.logging.accessCode,
        clientID: config.logging.clientId,
        clientSecret: config.logging.clientSecret
      };

      console.log('[LoggingClient] Authenticating with AffordMed service...');
      
      const response = await axios.post(config.logging.authUrl, authData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.token) {
        this.token = response.data.token;
        
        // Set expiry to 50 minutes from now (assuming 1 hour token validity)
        this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000);
        
        console.log('[LoggingClient] Authentication successful');
        return this.token;
      } else {
        throw new Error('No token received from auth service');
      }
    } catch (error) {
      console.warn('[LoggingClient] Authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if the current token is valid and not expired
   * @returns {boolean}
   */
  isTokenValid() {
    return this.token && this.tokenExpiry && new Date() < this.tokenExpiry;
  }

  /**
   * Get a valid authentication token, refreshing if necessary
   * @returns {Promise<string>}
   */
  async getValidToken() {
    if (this.isTokenValid()) {
      return this.token;
    }

    return await this.authenticate();
  }

  /**
   * Send a log message to the AffordMed logging service
   * @param {string} stack - The stack name (e.g., 'backend')
   * @param {string} level - Log level (e.g., 'info', 'error', 'warn')
   * @param {string} packageName - Package name (e.g., 'service', 'route')
   * @param {string} message - Log message
   * @param {number} retries - Number of retries (internal use)
   */
  async Log(stack, level, packageName, message, retries = 3) {
    if (this.disabled) {
      console.warn('[LoggingClient] Logging disabled, skipping log entry');
      return;
    }

    try {
      const token = await this.getValidToken();
      
      const logData = {
        stack,
        level,
        package: packageName,
        message,
        timestamp: new Date().toISOString()
      };

      await axios.post(config.logging.logsUrl, logData, {
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Optional: Log successful submission (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[LoggingClient] Log sent: ${stack}/${level}/${packageName} - ${message}`);
      }
    } catch (error) {
      console.warn('[LoggingClient] Failed to send log:', error.message);
      
      // Retry logic with exponential backoff
      if (retries > 0) {
        const delay = Math.pow(2, 3 - retries) * 1000; // 1s, 2s, 4s delays
        
        console.warn(`[LoggingClient] Retrying in ${delay}ms... (${retries} retries left)`);
        
        setTimeout(() => {
          this.Log(stack, level, packageName, message, retries - 1);
        }, delay);
      } else {
        console.warn('[LoggingClient] Max retries exceeded, giving up on log entry');
      }
    }
  }

  /**
   * Convenience method for info logs
   */
  async info(stack, packageName, message) {
    return this.Log(stack, 'info', packageName, message);
  }

  /**
   * Convenience method for error logs
   */
  async error(stack, packageName, message) {
    return this.Log(stack, 'error', packageName, message);
  }

  /**
   * Convenience method for warning logs
   */
  async warn(stack, packageName, message) {
    return this.Log(stack, 'warn', packageName, message);
  }
}

// Export a singleton instance
const loggingClient = new LoggingClient();
module.exports = loggingClient;