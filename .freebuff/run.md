# Preview Run Doc

## How to reproduce uncommitted artifacts

1. The backend `.env` was updated in the main checkout to remove Supabase/Redis requirements and add real API keys. Copy from main checkout:
   ```
   copy backend\.env from main checkout (already present)
   copy frontend\.env from main checkout (already present)
   ```

2. ONNX assets are synced via the predev script:
   ```
   cd frontend && node scripts/copy-onnx-assets.js
   ```

3. Python backend dependencies are installed:
   ```
   cd backend && pip install -r requirements.txt
   ```

4. Frontend dependencies are installed:
   ```
   cd frontend && npm install
   ```

5. The `label_encoder_v2.pkl` was created from metadata class labels (not in git):
   ```
   cd backend && python -c "import pickle; from sklearn.preprocessing import LabelEncoder; le=LabelEncoder(); le.fit(['Backend Developer','Data Scientist','DevOps Engineer','Frontend Developer','Full Stack Developer','Software Developer']); pickle.dump(le, open('models/label_encoder_v2.pkl','wb'))"
   ```

## How to run the server

### Backend (port 8000)
```
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend (port 5173)
```
cd frontend
npm run dev
```

Or run vite directly (skipping predev):
```
cd frontend
npx vite --port 5173
```

The backend must be running for the frontend to make API calls. The frontend connects to the backend via `VITE_API_URL=http://localhost:8000`.
