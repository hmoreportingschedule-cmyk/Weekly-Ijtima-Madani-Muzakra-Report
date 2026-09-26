# Weekly Ijtima Dashboard

Starter implementation for a weekly Ijtima reporting dashboard using:
- Frontend: static HTML/CSS/JS (can be deployed to Vercel)
- Backend: Google Apps Script Web App
- Database: Google Sheets
- Files: Google Drive

## Google Drive structure
Weekly Ijtima Dashboard/
  User Photo/
  Report Files Weekly Ijtima/

## Important
1. Create a Google Sheet named `Weekly Ijtima User Details`.
2. Open Extensions -> Apps Script.
3. Copy `apps-script/Code.gs` into the Apps Script project.
4. Run `setupSystem()` once and authorize. This creates the default Admin user if it does not already exist.
5. Default Admin credentials:
   - User ID: `admin`
   - Password: `Admin@2026!`
   Change the password in the Users sheet/backend before production use.
6. Deploy as Web app.
7. Put the Web App URL in `frontend/app.js` as `API_URL`.
8. Deploy the frontend to Vercel.

This is a clean starter package. To update an existing dashboard without changing its design, provide the current project ZIP.
