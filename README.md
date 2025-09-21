# URL Shortener Microservice

A production-ready URL shortener microservice built with Node.js, Express, and MongoDB. Features include custom shortcodes, click tracking, automatic expiry, comprehensive logging integration with AffordMed test server, and Docker support.

## 🚀 Quick Start

### Prerequisites

- Node.js (≥16.0.0) 
- Yarn (≥1.22.0)
- MongoDB (≥4.4) or Docker
- Git

### Local Development Setup

1. **Clone and navigate to the repository:**
   ```bash
   git clone <repository-url>
   cd url-shortener-microservice
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your specific configuration if needed
   ```

4. **Start MongoDB** (if running locally):
   ```bash
   # On Windows with MongoDB installed\n   net start MongoDB\n   # On macOS with Homebrew\n   brew services start mongodb-community\n   # On Linux\n   sudo systemctl start mongod\n   ```

Testing (Postman)

1st: POST /shorturls (create)

2nd: GET /:shortcode (redirect works)

3rd: GET /shorturls/:shortcode (stats update).
