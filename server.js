'use strict';

const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'docs')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});

app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  🐧  DevOps Linux Lab is running!        ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  →  http://localhost:${PORT}                 ║`);
  console.log('║  Press Ctrl+C to stop                    ║');
  console.log('╚══════════════════════════════════════════╝\n');
});
