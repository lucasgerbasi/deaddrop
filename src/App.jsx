// src/App.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { encryptFile, decryptFile } from './crypto';
import { uploadFile, getDownloadUrl } from './api';
import './App.css';

// A helper function to encode the key for the URL
function base64UrlEncode(str) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(str)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// A helper function to decode the key from the URL
function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
        str += '=';
    }
    const decoded = atob(str);
    const buffer = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
        buffer[i] = decoded.charCodeAt(i);
    }
    return buffer;
}


function App() {
    const [view, setView] = useState('upload'); // 'upload', 'uploading', 'share', 'download', 'downloading', 'error'
    const [file, setFile] = useState(null);
    const [password, setPassword] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [shareLink, setShareLink] = useState('');
    const [error, setError] = useState('');

    // --- DOWNLOAD LOGIC ---
    // This runs once when the component first loads
    useEffect(() => {
        const hash = window.location.hash.substring(1);
        if (hash) {
            try {
                const [fileID, keyStr, fileName] = hash.split('/');
                if (fileID && keyStr && fileName) {
                    setView('download');
                }
            } catch (e) {
                setError('Invalid share link format.');
                setView('error');
            }
        }
    }, []);

    const handleDownload = async () => {
        setView('downloading');
        setError('');
        try {
            const hash = window.location.hash.substring(1);
            const [fileID, keyStr, encodedFileName] = hash.split('/');
            const key = base64UrlDecode(keyStr);
            const originalFileName = decodeURIComponent(encodedFileName || 'decrypted_file');


            const downloadUrl = getDownloadUrl(fileID);
            const response = await fetch(downloadUrl);

            if (!response.ok) {
                throw new Error('File not found. It may have already been downloaded and deleted.');
            }

            const encryptedBlob = await response.blob();
            const decryptedBlob = await decryptFile(encryptedBlob, key);

            if (!decryptedBlob) {
                throw new Error('Decryption failed. The password used by the sender might be incorrect or the file is corrupt.');
            }
            
            // Create a temporary link to trigger the browser's download prompt
            const url = URL.createObjectURL(decryptedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = originalFileName; 
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Since the link is single-use, redirect to the main page after a successful download
            setTimeout(() => window.location.href = window.location.origin, 100);

        } catch (err) {
            setError(err.message);
            setView('error');
        }
    };


    // --- UPLOAD LOGIC ---
    const handleFileDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFile = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
        if (droppedFile) {
            setFile(droppedFile);
        }
    }, []);
    
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleUpload = async () => {
        if (!file || !password) {
            setError('Please select a file and enter a password.');
            return;
        }
        setView('uploading');
        setError('');

        try {
            const { encryptedBlob, exportedKey } = await encryptFile(file, password);
            const { fileID } = await uploadFile(encryptedBlob, setUploadProgress);
            
            const keyStr = base64UrlEncode(exportedKey);
            const encodedFileName = encodeURIComponent(file.name);
            const baseUrl = window.location.href.split('#')[0];
            const newShareLink = `${baseUrl}#${fileID}/${keyStr}/${encodedFileName}`;
            setShareLink(newShareLink);
            setView('share');

        } catch (err) {
            setError('An error occurred during upload. Please try again.');
            setView('error');
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareLink).then(() => {
            alert('Link copied to clipboard!');
        });
    };
    
    // --- RENDER LOGIC ---
    // Decides what to show the user based on the current 'view' state
    
    if (view === 'error') {
        return (
            <div className="container">
                <h1>Something went wrong</h1>
                <p className="error-message">{error}</p>
                <a href="/" className="button">Start Over</a>
            </div>
        );
    }

    if (view === 'download') {
        return (
            <div className="container">
                <h1>File Received</h1>
                <p>A file has been shared with you. It will be decrypted in your browser.</p>
                <button onClick={handleDownload} className="button download-button">Download & Decrypt File</button>
            </div>
        );
    }
    
    if (view === 'downloading') {
         return (
            <div className="container">
                <h1>Downloading...</h1>
                <p>Please wait. Your file is being downloaded and decrypted.</p>
                 <div className="loader"></div>
            </div>
        );
    }
    
    if (view === 'share') {
        return (
            <div className="container">
                <h1>Link Ready!</h1>
                <p>Copy this link and send it. It will only work once.</p>
                <div className="share-link-wrapper">
                    <input type="text" value={shareLink} readOnly />
                    <button onClick={copyToClipboard}>Copy</button>
                </div>
                 <a href="/" className="button" style={{marginTop: '1rem'}}>Share another file</a>
            </div>
        );
    }

    if (view === 'uploading') {
        return (
            <div className="container">
                <h1>Encrypting & Uploading...</h1>
                <p>Your file is being securely processed. Please wait.</p>
                <progress value={uploadProgress} max="100"></progress>
                <p>{uploadProgress}%</p>
            </div>
        );
    }

    return (
        <div className="container">
            <h1>DeadDrop</h1>
            <p>Secure, one-time file sharing.</p>
            
            <div 
                id="drop-zone"
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('file-input')?.click()}
            >
                {file ? `Selected: ${file.name}` : 'Drag & drop a file here, or click to select'}
                <input type="file" id="file-input" onChange={handleFileDrop} style={{ display: 'none' }} />
            </div>

            {file && (
                <div className="password-section">
                    <input
                        type="password"
                        placeholder="Enter a password to encrypt"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button onClick={handleUpload} className="button">Encrypt & Create Link</button>
                </div>
            )}
        </div>
    );
}

export default App;