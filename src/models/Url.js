const mongoose = require('mongoose');


const clickSchema = new mongoose.Schema({
  ts: {
    type: Date,
    default: Date.now,
    required: true
  },
  ip: {
    type: String,
    required: true
  },
  referrer: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  country: {
    type: String,
    default: null
  }
}, { _id: false });

const urlSchema = new mongoose.Schema({
  shortcode: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    minlength: 4,
    maxlength: 20,
    match: /^[a-zA-Z0-9]+$/
  },
  originalUrl: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(url) {
        
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Original URL must include http:// or https:// protocol'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  expiryAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index for automatic cleanup
  },
  clickCount: {
    type: Number,
    default: 0,
    min: 0
  },
  clicks: [clickSchema]
}, {
  timestamps: false, 
  collection: 'urls'
});

// Indexes for performance
urlSchema.index({ shortcode: 1 }, { unique: true });
urlSchema.index({ expiryAt: 1 }); 
urlSchema.index({ createdAt: 1 }); 


urlSchema.methods.isExpired = function() {
  return new Date() > this.expiryAt;
};

urlSchema.methods.addClick = function(clickData) {
  this.clicks.push(clickData);
  this.clickCount = this.clicks.length;
  return this.save();
};


urlSchema.statics.findValidByShortcode = function(shortcode) {
  return this.findOne({
    shortcode,
    expiryAt: { $gt: new Date() }
  });
};


urlSchema.statics.shortcodeExists = function(shortcode) {
  return this.exists({ shortcode });
};

urlSchema.virtual('paginatedClicks').get(function() {
  return (page = 1, limit = 50) => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return this.clicks.slice(startIndex, endIndex);
  };
});


urlSchema.set('toJSON', { virtuals: true });
urlSchema.set('toObject', { virtuals: true });


urlSchema.pre('save', function(next) {
  if (this.isNew) {
    
    if (this.expiryAt <= new Date()) {
      return next(new Error('Expiry date must be in the future'));
    }
  }
  next();
});


urlSchema.post('save', function(doc) {
  if (this.isNew) {
    console.log(`[URL Model] Created new short URL: ${doc.shortcode} -> ${doc.originalUrl}`);
  }
});

const Url = mongoose.model('Url', urlSchema);

module.exports = Url;