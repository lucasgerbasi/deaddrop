// src/App.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { encryptFile, decryptFile } from './crypto';
import { uploadFile, getDownloadUrl } from './api';
import './App.css';
import JSZip from 'jszip';
// NEW: Import toast
import { toast } from 'react-toastify';

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
    const [view, setView] = useState('upload'); 
    const [files, setFiles] = useState([]); 
    const [password, setPassword] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [shareLink, setShareLink] = useState('');
    const [criticalError, setCriticalError] = useState('');

    // --- DOWNLOAD LOGIC ---
    useEffect(() => {
        const hash = window.location.hash.substring(1);
        if (hash) {
            try {
                const [fileID, keyStr, encodedFileName] = hash.split('/');
                if (fileID && keyStr && encodedFileName) {
                    setView('download');
                }
            } catch (e) {
                toast.error('Invalid share link format. The link might be broken or expired.');
                setCriticalError('Invalid share link format. The link might be broken or expired.');
                setView('error');
            }
        }
    }, []);

    const handleDownload = async () => {
        setView('downloading');
        setCriticalError('');
        try {
            const hash = window.location.hash.substring(1);
            const [fileID, keyStr, encodedFileName] = hash.split('/');
            const key = base64UrlDecode(keyStr);
            const originalFileName = decodeURIComponent(encodedFileName || 'deaddrop_archive.zip');

            const downloadUrl = getDownloadUrl(fileID);
            const response = await fetch(downloadUrl);

            if (!response.ok) {
                toast.error('File not found. It may have already been downloaded and deleted.');
                throw new Error('File not found. It may have already been downloaded and deleted.');
            }

            const encryptedBlob = await response.blob();
            const decryptedBlob = await decryptFile(encryptedBlob, key);

            if (!decryptedBlob) {
                toast.error('Decryption failed. The password used by the sender might be incorrect or the file is corrupt.');
                throw new Error('Decryption failed. The password used by the sender might be incorrect or the file is corrupt.');
            }
            
            const url = URL.createObjectURL(decryptedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = originalFileName; 
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            const baseUrl = window.location.href.split('#')[0];
            window.history.replaceState(null, '', baseUrl);
            setView('downloadSuccess');
            toast.success('File(s) downloaded and decrypted successfully!');


        } catch (err) {
            toast.error(`Download failed: ${err.message || 'Please try again.'}`);
            setCriticalError(err.message); // Keep for full-page error display
            setView('error');
        }
    };


    // --- UPLOAD LOGIC ---
    const handleFileDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFiles = e.dataTransfer ? Array.from(e.dataTransfer.files) : Array.from(e.target.files);
        if (droppedFiles.length > 0) {
            setFiles(droppedFiles);
            setCriticalError(''); 
        }
    }, []);
    
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleUpload = async () => {
        if (files.length === 0 || !password) {
            toast.error('Please select at least one file and enter a password.');
            return;
        }
        setView('uploading');
        setCriticalError('');

        try {
            let fileToEncryptBlob;
            let finalFileName;

            if (files.length === 1) {
                fileToEncryptBlob = files[0];
                finalFileName = files[0].name;
            } else {
                const zip = new JSZip();
                for (const fileItem of files) {
                    zip.file(fileItem.name, fileItem);
                }
                fileToEncryptBlob = await zip.generateAsync({ type: "blob" });
                finalFileName = "deaddrop_archive.zip"; 
            }

            const { encryptedBlob, exportedKey } = await encryptFile(fileToEncryptBlob, password);
            const { fileID } = await uploadFile(encryptedBlob, setUploadProgress);
            
            const keyStr = base64UrlEncode(exportedKey);
            const encodedFileName = encodeURIComponent(finalFileName);
            
            const baseUrl = window.location.href.split('#')[0];
            const newShareLink = `${baseUrl}#${fileID}/${keyStr}/${encodedFileName}`;
            
            setShareLink(newShareLink);
            setView('share');
            toast.success('DeadDrop link generated!');


        } catch (err) {
            console.error("Upload error:", err); 
            toast.error(`Upload failed: ${err.message || 'Please try again.'}`);
            setCriticalError(`An error occurred during upload: ${err.message || 'Please try again.'}`);
            setView('error');
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareLink).then(() => {
            toast.success('Link copied to clipboard!');
        }).catch(() => {
            toast.error('Failed to copy link. Please copy manually.');
        });
    };
    
    // --- RENDER LOGIC ---
    
    if (view === 'error') {
        return (
            <div className="container">
                <h1>Something went wrong</h1>
                <p className="error-message">{criticalError || 'An unexpected error occurred.'}</p>
                <a href={window.location.href.split('#')[0]} className="button">Start Over</a>
            </div>
        );
    }
    
    if (view === 'downloadSuccess') {
        return (
            <div className="container">
                <h1>Success!</h1>
                <p>Your file(s) have been downloaded and decrypted. The DeadDrop link you used has now been permanently destroyed.</p>
                <a href={window.location.href.split('#')[0]} className="button">Create your own DeadDrop</a>
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
                <p>Please wait. Your file(s) are being downloaded and decrypted.</p>
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
                 <a href={window.location.href.split('#')[0]} className="button" style={{marginTop: '1rem', boxSizing: 'border-box'}}>Share another file</a>
            </div>
        );
    }

    if (view === 'uploading') {
        return (
            <div className="container">
                <h1>Encrypting & Uploading...</h1>
                <p>Your file(s) are being securely processed. Please wait.</p>
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
                {files.length > 0 ? (
                    <div>
                        <p>Selected files:</p>
                        <ul>
                            {files.map((f, index) => (
                                <li key={index}>{f.name}</li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p>Drag & drop file(s) here, or click to select</p>
                )}
                <input type="file" id="file-input" onChange={handleFileDrop} style={{ display: 'none' }} multiple />
            </div>

            {files.length > 0 && (
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