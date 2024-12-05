const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session'); // For session management
const app = express();
const axios = require('axios');
const port = 3000;


const apiKey='ef0b76a1ce2682af75cbb46ad81607bfde4d9b6d4de54cfc93fd4076a983cfdc' 

// MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'S@@d7643', // Use your MySQL password
  database: 'kafka_predictions2' // Replace with your actual database name
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

app.use(express.static('public')); // To serve static files like index.html and login.html
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware to store session data
app.use(session({
  secret: 'your_secret_key', // Replace with a secure key
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Middleware to check if the user is logged in
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next(); // If logged in, proceed to the next middleware
  } else {
    res.redirect('/login'); // If not logged in, redirect to login page
  }
}

// Routes

// Redirect to the login page on the first access (ignore session)
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    res.redirect('/home'); // If logged in, redirect to home page
  } else {
    res.redirect('/login'); // Otherwise, redirect to login page
  }
});

// Serve the login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html')); // Serve login.html from public folder
});

// Handle login logic
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // Predefined credentials
  const predefinedUsername = 'admin';
  const predefinedPassword = 'admin';

  if (username === predefinedUsername && password === predefinedPassword) {
    // Set session for the user
    req.session.user = username;
    res.json({ success: true, redirectUrl: '/home' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Serve the home page (index.html) after login
app.get('/home', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html')); // Serve home page after login
});

// Logout route
app.post('/api/logout', (req, res) => {
  req.session.destroy(); // Destroy the session on logout
  res.json({ success: true, message: 'Logged out', redirectUrl: '/login' });
});

// API to fetch the most recent attack (protected route)
app.get('/api/recent-attack', requireAuth, (req, res) => {
  const query = 'SELECT id, timestamp, predicted_attack FROM predictions ORDER BY timestamp DESC LIMIT 1';
  connection.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json(results[0]);
  });
});

// API to fetch recent attack logs (protected route)
app.get('/api/attack-logs', requireAuth, (req, res) => {
  const query = 'SELECT id, timestamp, predicted_attack FROM predictions ORDER BY timestamp DESC LIMIT 10';
  connection.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    // Format the timestamp to include milliseconds
    results.forEach((result) => {
      result.timestamp = formatTimestampWithMilliseconds(result.timestamp);
    });

    res.json(results);
  });
});

// API to fetch attack details (protected route)
app.get('/api/attack-details/:id', requireAuth, (req, res) => {
  const query = 'SELECT * FROM predictions WHERE id = ?';
  connection.query(query, [req.params.id], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'Attack not found' });
      return;
    }

    const attack = results[0];

    // Prepend the correct MIME type to the base64 data
    let visualizationImage = null;
    if (attack.visualization) {
      visualizationImage = `data:image/png;base64,${attack.visualization}`;
    }

    const formattedTimestamp = formatTimestampWithMilliseconds(attack.timestamp);

    // Send the attack details, including the base64 image with MIME type
    res.json({
      id: attack.id,
      predicted_attack: attack.predicted_attack,
      timestamp: formattedTimestamp,
      explanation: attack.simplified_explanation,
      visualization: visualizationImage, // Base64 encoded image with MIME type
    });
  });
});

// API to handle feedback submission (protected route)
app.post('/api/feedback', requireAuth, (req, res) => {
  const { attackId, feedbackType, feedbackExplanation } = req.body;

  // Ensure all required fields are provided
  if (!attackId || !feedbackType || !feedbackExplanation) {
    return res.status(400).json({ error: 'Attack ID, feedback type, and explanation are required' });
  }

  // SQL query to update feedbackattack and feedback_explanation columns
  const query = 'UPDATE predictions SET feedbackattack = ?, feedback = ? WHERE id = ?';

  connection.query(query, [feedbackType, feedbackExplanation, attackId], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Attack ID not found' });
    }

    res.json({ success: true, message: 'Feedback submitted successfully' });
  });
});

// API to fetch source IP info (protected route)
app.get('/api/src-ip-info/:id', requireAuth, (req, res) => {
  const attackId = req.params.id;
  
  const query = 'SELECT src_ip FROM predictions WHERE id = ?';
  connection.query(query, [attackId], async (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Source IP not found' });
    }

    const srcIp = results[0].src_ip;

    try {
      // Call VirusTotal API with the source IP
      const reportUrl = `https://www.virustotal.com/vtapi/v2/ip-address/report`;
      const response = await axios.get(reportUrl, {
        params: {
          apikey: apiKey,
          ip: srcIp
        }
      });

      const report = response.data;
      if (report.response_code === 1) {
        // Extract relevant details from the VirusTotal report
        const virusTotalInfo = {
          country: report.country || 'Country information not available',
          network: report.network || 'Network information not available',
          malicious: report.detected_urls && report.detected_urls.length > 0 ? 'Yes' : 'No'
        };

        res.json({
          src_ip: srcIp,
          virus_total_info: virusTotalInfo
        });
      } else {
        res.json({
          src_ip: srcIp,
          message: 'No information available from VirusTotal for this IP address.'
        });
      }
    } catch (error) {
      console.error('Error calling VirusTotal API:', error);
      res.status(500).json({ error: 'Error calling VirusTotal API' });
    }
  });
});


// Helper function for formatting timestamps
function formatTimestampWithMilliseconds(timestamp) {
  const date = new Date(timestamp);
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const padMilliseconds = (n) => n.toString().padStart(3, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${padMilliseconds(date.getMilliseconds())}`;
}

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
