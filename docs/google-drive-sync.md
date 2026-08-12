# Google Drive Auto-Sync Integration Documentation

AnalyzeUp 2.0 supports real-time automatic ingestion of CSV and Excel spreadsheets from Google Drive. This document guides developers and administrators through setting up, configuring, and maintaining the Google Drive integration.

## 1. Google Cloud Console Setup

To connect to Google Drive, you must create a project in the [Google Cloud Console](https://console.cloud.google.com) and obtain OAuth 2.0 Credentials.

### Steps:
1. **Create Project**: Create a new project or select an existing one.
2. **Enable APIs**: Navigate to **APIs & Services > Library**, search for **Google Drive API**, and click **Enable**.
3. **Configure OAuth Consent Screen**:
   - Set user type to **External**.
   - Input Application details.
   - Under **Scopes**, add `https://www.googleapis.com/auth/drive.readonly` and `https://www.googleapis.com/auth/userinfo.email`.
   - Add test user email addresses if in Development/Testing status.
4. **Create Credentials**:
   - Go to **APIs & Services > Credentials**.
   - Click **+ Create Credentials > OAuth client ID**.
   - Set Application Type to **Web application**.
   - Under **Authorized redirect URIs**, add:
     `http://localhost:9002/api/drive/callback` (or your production redirect handler URL).
   - Copy the generated **Client ID** and **Client Secret**.

---

## 2. Environment Configuration

Append the following environment keys to your `.env` file (reference `.env.example`):

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:9002/api/drive/callback
```

---

## 3. Scopes & API Endpoints

We use the minimum read-only permissions to preserve security.

- **Scopes**:
  - `https://www.googleapis.com/auth/drive.readonly`: Grants access to query file lists and fetch media contents.
  - `https://www.googleapis.com/auth/userinfo.email`: Retrieves the logged-in Google email to display in the UI connection status.

- **API Route Handlers**:
  - `GET /api/drive/auth`: Initiates the OAuth flow, appending the user's Firestore UID in the `state` parameter.
  - `GET /api/drive/callback`: Completes the code token exchange, queries user profile info, and persists details in Firestore.
  - `GET /api/drive/folders`: Lists folders in root directory for sync scoping.
  - `POST /api/drive/folders`: Auto-creates the sync folder (`AnalyzeUp_Data_Sync`) or selects an existing folder.
  - `GET /api/drive/scan`: Scans the chosen folder for `.csv`, `.xlsx`, and `.xls` files.
  - `POST /api/drive/sync`: Downloads files, converts Excel files to standard CSV format on the server using `xlsx`, and serves them for validation.

---

## 4. Ingestion Pipeline & Duplicate Protection

### Data Processing Flow:
1. **Google Drive Sync Trigger**: Triggered manually by clicking "Sync Now".
2. **Download & Convert**: Download the alt=media stream from Google Drive. If the file is Excel, parse workbook sheets and output standard CSV text.
3. **Change Detection**: Prevent duplicate syncs by comparing file size and modified dates in Firestore under `users/${userId}/google_drive_files`. Unchanged files are skipped.
4. **Mapping Application**: If the CSV columns match a previously saved mapping signature, execute silent client-side ingestion. Otherwise, open the `ImportDialog` mapping wizard.
5. **Deduplication**: Transactions with identical `orderNumber` parameters are filtered out automatically to avoid double-counting.
6. **Inventory Snapshots**: Files classified as `INVENTORY_MASTER` or `WAREHOUSE_STOCK` overwrite current stock metrics (`overwriteStock: true`) instead of adding values cumulatively.

---

## 5. Troubleshooting & FAQ

#### The connection card shows "Sync Expired" or "Disconnected".
Google Drive access tokens expire every 1 hour. AnalyzeUp refreshes them automatically. If a refresh fails (e.g. if the user revoked access in Google settings), click **Reconnect** to re-authenticate.

#### Why isn't a spreadsheet appearing in the scanned files list?
Verify that:
1. The spreadsheet is inside the correct folder (default: `AnalyzeUp_Data_Sync`).
2. The file extension is `.csv`, `.xlsx`, or `.xls`. Other formats are ignored.

#### Why did stock double-count on sync?
Confirm that the spreadsheet file type was classified correctly as `INVENTORY_MASTER` or `WAREHOUSE_STOCK`. Sales reports (`SALES_REPORT`) do not overwrite stock levels.
