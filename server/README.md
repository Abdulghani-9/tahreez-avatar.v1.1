# Tahreez Reception Avatar — Server

Run locally:
```
cd server
npm init -y
npm install express multer cors
node server.js
```
Open http://localhost:8080

## STT (replace stub)
Wire Google Cloud STT (ar-SA/en-US) and return `{ text }` from `/api/stt`.

## Knowledge (replace stub)
Index your "Tahreez info" PDFs/XLSX into a vector DB and answer in `/api/ask`.
