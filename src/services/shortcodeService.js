const config = require('../config');
const Url = require('../models/Url');

/**
 * Shortcode generation and validation utilities
 */
class ShortcodeService {
  constructor() {
    this.base62Chars = config.shortcode.base62Chars;
    this.defaultLength = config.shortcode.defaultLength;
    this.maxRetries = config.shortcode.maxRetries;
  }

  /**
   * Generate a random base62 string of specified length
   * @param {number} length - Length of the shortcode to generate
   * @returns {string} Random base62 string
   */
  generateRandomBase62(length) {
    let result = '';
    const charactersLength = this.base62Chars.length;
    
    for (let i = 0; i < length; i++) {
      result += this.base62Chars.charAt(Math.floor(Math.random() * charactersLength));
    }
    
    return result;
  }

  /**
   * Validate custom shortcode format
   * @param {string} shortcode - Custom shortcode to validate
   * @returns {object} Validation result with isValid and error message
   */
  validateCustomShortcode(shortcode) {
    if (!shortcode || typeof shortcode !== 'string') {
      return {
        isValid: false,
        error: 'Shortcode must be a non-empty string'
      };
    }

    const trimmedShortcode = shortcode.trim();

    if (trimmedShortcode.length < config.shortcode.minCustomLength) {
      return {
        isValid: false,
        error: `Shortcode must be at least ${config.shortcode.minCustomLength} characters long`
      };
    }

    if (trimmedShortcode.length > config.shortcode.maxCustomLength) {
      return {
        isValid: false,
        error: `Shortcode must be at most ${config.shortcode.maxCustomLength} characters long`
      };
    }

    // Check if shortcode contains only alphanumeric characters
    if (!/^[a-zA-Z0-9]+$/.test(trimmedShortcode)) {
      return {
        isValid: false,
        error: 'Shortcode must contain only alphanumeric characters (a-z, A-Z, 0-9)'
      };
    }

    return {
      isValid: true,
      shortcode: trimmedShortcode
    };
  }

  /**
   * Check if a shortcode is available (not already used)
   * @param {string} shortcode - Shortcode to check
   * @returns {Promise<boolean>} True if available, false if taken
   */
  async isShortcodeAvailable(shortcode) {
    try {
      const exists = await Url.shortcodeExists(shortcode);
      return !exists;
    } catch (error) {
      console.error('[ShortcodeService] Error checking shortcode availability:', error);
      throw new Error('Database error while checking shortcode availability');
    }
  }

  /**
   * Generate a unique shortcode with collision handling
   * @param {number} length - Initial length to try (defaults to config default)
   * @returns {Promise<string>} Unique shortcode
   */
  async generateUniqueShortcode(length = this.defaultLength) {
    let currentLength = length;
    let attempts = 0;
    const maxAttemptsPerLength = this.maxRetries;

    while (attempts < maxAttemptsPerLength * 3) { // Allow up to 3 length escalations
      const shortcode = this.generateRandomBase62(currentLength);
      
      try {
        const isAvailable = await this.isShortcodeAvailable(shortcode);
        
        if (isAvailable) {
          console.log(`[ShortcodeService] Generated unique shortcode: ${shortcode} (length: ${currentLength}, attempts: ${attempts + 1})`);
          return shortcode;
        }

        attempts++;

        // If we've exhausted retries for current length, increase length
        if (attempts % maxAttemptsPerLength === 0) {
          currentLength++;
          console.warn(`[ShortcodeService] High collision rate, escalating to length ${currentLength}`);
        }

      } catch (error) {
        console.error('[ShortcodeService] Error during shortcode generation:', error);
        throw error;
      }
    }

    // If we still can't generate after all attempts, throw error
    throw new Error('Unable to generate unique shortcode after maximum attempts. Database may be experiencing high load.');
  }

  /**
   * Process shortcode - either validate custom or generate unique
   * @param {string|null} customShortcode - Optional custom shortcode
   * @returns {Promise<object>} Result with shortcode or error
   */
  async processShortcode(customShortcode = null) {
    try {
      // If custom shortcode provided, validate and check availability
      if (customShortcode) {
        const validation = this.validateCustomShortcode(customShortcode);
        
        if (!validation.isValid) {
          return {
            success: false,
            error: validation.error,
            statusCode: 400
          };
        }

        const isAvailable = await this.isShortcodeAvailable(validation.shortcode);
        
        if (!isAvailable) {
          return {
            success: false,
            error: 'Custom shortcode is already taken',
            statusCode: 409
          };
        }

        return {
          success: true,
          shortcode: validation.shortcode
        };
      }

      // Generate unique shortcode
      const shortcode = await this.generateUniqueShortcode();
      
      return {
        success: true,
        shortcode
      };

    } catch (error) {
      console.error('[ShortcodeService] Error processing shortcode:', error);
      return {
        success: false,
        error: 'Internal server error during shortcode processing',
        statusCode: 500
      };
    }
  }

  /**
   * Get collision statistics for monitoring
   * @returns {object} Statistics about shortcode generation
   */
  getCollisionStats() {
    // This could be enhanced to track actual collision rates
    return {
      defaultLength: this.defaultLength,
      maxRetries: this.maxRetries,
      totalPossibleCombinations: Math.pow(this.base62Chars.length, this.defaultLength),
      base62CharacterSet: this.base62Chars
    };
  }
}

// Export singleton instance
const shortcodeService = new ShortcodeService();
module.exports = shortcodeService;