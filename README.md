# DeadDrop 📧

**Secure, One-Time, Ephemeral File Sharing**

[![Deployed with GitHub Pages](https://github.com/lucasgerbasi/deaddrop/actions/workflows/deploy.yml/badge.svg)](https://lucasgerbasi.github.io/deaddrop/)
[![Deployed on Render](https://img.shields.io/badge/Backend%20on-Render-46E0D2?style=flat&logo=render)](https://ephemeral-backend-lucasgerbasi.onrender.com/)

## 🚀 Live Demo

Experience DeadDrop in action:
**Frontend (Client):** [https://lucasgerbasi.github.io/deaddrop/](https://lucasgerbasi.github.io/DeadDrop/)

**Backend (API):** [https://ephemeral-backend-lucasgerbasi.onrender.com/](https://ephemeral-backend-lucasgerbasi.onrender.com/) (This link will show "Cannot GET /" as it's an API, but it's live!)

## 📖 About DeadDrop

DeadDrop is a privacy-focused, ephemeral file-sharing web application inspired by the concept of "dead drops", anonymous, temporary locations used for exchanging items in espionage. It provides a secure way to share sensitive files with the absolute certainty that the file will be permanently destroyed after its first successful download by the intended recipient.

Unlike traditional cloud storage or messaging apps, DeadDrop adheres to a strict **Zero-Knowledge Architecture**, ensuring that your files are never exposed to any third party (including the server host) in an unencrypted state. All cryptographic operations happen securely within your browser.

## ✨ Key Features

*   **Zero-Knowledge Encryption:** Files are encrypted client-side using **AES-256-GCM** with a password you provide. The server never sees your unencrypted data or your encryption key.
*   **Ephemeral by Design:** Files are permanently deleted from the server immediately after the first successful download. Links are truly single-use.
*   **Multiple File Support:** Easily share multiple files or an entire folder, which are automatically compressed into a `.zip` archive client-side before encryption and upload.
*   **Secure Key Exchange:** The encryption key is embedded directly in the URL's hash fragment (`#`). This ensures the key is never transmitted to the server, upholding the zero-knowledge principle.
*   **Progressive User Feedback:** Real-time upload progress bars and clear toast notifications (via `react-toastify`) keep the user informed during cryptographic operations and file transfers.
*   **Robust Error Handling:** Clear messages and visual cues guide the user through potential issues.
*   **Cost-Effective Deployment:** The entire application is designed to run efficiently on free-tier hosting services.

## 🛠️ Technical Stack

**Frontend:**
*   **React:** A declarative JavaScript library for building user interfaces.
*   **Vite:** A fast build tool for modern web projects.
*   **Web Crypto API:** Browser's native cryptographic API for secure, in-browser encryption (PBKDF2, AES-256-GCM).
*   **JSZip:** Client-side library for compressing multiple files into a single `.zip` archive before encryption.
*   **React Toastify:** For elegant, non-intrusive UI notifications.
*   **Deployment:** GitHub Pages (automated via GitHub Actions).

**Backend:**
*   **Node.js:** A JavaScript runtime for server-side logic.
*   **Express.js:** A fast, minimalist web framework for Node.js APIs.
*   **Multer:** Middleware for handling `multipart/form-data`, primarily for file uploads.
*   **Node-Cron:** For scheduling server-side cleanup tasks.
*   **Deployment:** Render.com (Free Tier).

## 💡 Architecture Highlights

### **Client-Side End-to-End Encryption (E2EE)**

*   **Key Derivation:** A robust **PBKDF2** algorithm (100,000 iterations with a unique random salt per file) derives a strong encryption key from the user's password directly in the browser.
*   **Authenticated Encryption:** **AES-256-GCM** is used not only for confidentiality but also for data integrity. Any tampering with the encrypted file during its temporary staging on the server will result in decryption failure, alerting the recipient.
*   **Zero-Knowledge Key Transfer:** The encryption key is never sent to the backend. It's appended to the shareable URL as a **hash fragment (`#`)**, making it accessible only to the client-side JavaScript of the recipient's browser.

### **Ephemeral Backend Service**

*   The Node.js/Express backend acts as a **"blind conduit."** It only accepts and stores encrypted file blobs temporarily.
*   **Delete-on-Download:** A critical feature where `fs.unlink()` is triggered immediately after a successful file stream to the recipient, ensuring the file's permanent destruction.
*   **Failsafe Cleanup:** A `node-cron` job runs hourly to delete any residual encrypted files older than 24 hours that might have been abandoned or failed to download, safeguarding disk space.

### **Decoupled & Automated Deployment**

*   The frontend (React app) is built and deployed to GitHub Pages using a **GitHub Actions** workflow, providing continuous deployment.
*   The backend (Node.js API) is hosted on Render.com's free tier, offering similar automated deployments directly from its GitHub repository. This separation maximizes cost-efficiency and leverages platform-specific optimizations.

## 🚀 How to Use DeadDrop

1.  **Go to the Live Demo:** Open the DeadDrop frontend in your browser.
2.  **Select Files:** Drag and drop one or more files (or a whole folder!) into the designated area, or click to select them.
3.  **Set a Password:** Enter a strong password to encrypt your files. This password is crucial for decryption and is never sent to the server.
4.  **Generate Link:** Click "Encrypt & Create Link." DeadDrop will encrypt your files in your browser, compress them (if multiple), upload the encrypted blob to the backend, and generate a unique, single-use share link.
5.  **Share the Link:** Copy the generated link and send it to your recipient.
6.  **Recipient Downloads:** When the recipient opens the link, their browser will download the encrypted file(s), read the key from the URL, decrypt everything in their browser, and prompt them to save the original file(s).
7.  **Destruction:** Once the download is complete, the file is automatically and permanently deleted from the DeadDrop server, making the link invalid for future use.

## ⚙️ Local Development Setup

To run DeadDrop locally, you'll need Node.js and npm installed.

### **1. Backend Setup**

```bash
# Clone the backend repository (if separate, or navigate to your backend folder)
git clone https://github.com/lucasgerbasi/ephemeral-backend.git
cd ephemeral-backend

# Install dependencies
npm install

# Start the backend server
npm start
# Or, if you used `node index.js` previously:
# node index.js
```
The backend server will typically run on `http://localhost:3001` (or the port specified in its console output).

### **2. Frontend Setup**

```bash
# Clone the frontend repository
git clone https://github.com/lucasgerbasi/DeadDrop.git
cd deaddrop

# Install dependencies
npm install

# IMPORTANT: Ensure backend URL is correct in src/api.js
# Open src/api.js and verify API_BASE_URL points to your deployed Render backend:
# const API_BASE_URL = 'https://ephemeral-backend-lucasgerbasi.onrender.com';

# Start the frontend development server
npm run dev
```
The frontend application will typically open in your browser at `http://localhost:5173`.

## 🚢 Deployment

The project leverages continuous deployment for both its frontend and backend components:

*   **Frontend (GitHub Pages):** Pushes to the `main` branch of `deaddrop` repository automatically trigger a GitHub Actions workflow that builds the React application and deploys it to `https://lucasgerbasi.github.io/deaddrop/`.
*   **Backend (Render.com):** Pushes to the `main` branch of the `ephemeral-backend` repository automatically trigger a build and deployment on Render.com, updating the live API endpoint.

## 🛣️ Future Roadmap

DeadDrop is designed for extensibility, with exciting plans for future enhancements:

### **Version 2.0: Quality of Life & Polish**

*   **Enhanced UI/UX:** Refine animations, add subtle micro-interactions, and ensure full responsiveness across various devices.
*   **Self-Destruct Timers:** Implement an optional feature allowing senders to define a specific expiration time (e.g., 10 minutes, 1 hour) for a link, providing an additional layer of ephemerality.

### **Version 3.0: The Ephemeral Dream (WebRTC P2P Transfer)**

*   **True Peer-to-Peer Transfer:** Explore a direct client-to-client transfer mode using WebRTC. In this advanced setup, the backend server would solely act as a "signaling" server to facilitate the connection between sender and receiver. The encrypted file data would then flow directly, **never touching the server at all**, representing the ultimate form of privacy and ephemerality.

## 📄 License

© 2025 Lucas Gerbasi. All rights reserved.

This work is proprietary and all rights are reserved. You may not use, modify, or distribute this code in any form without the express written permission of Lucas Gerbasi. No license is granted.
