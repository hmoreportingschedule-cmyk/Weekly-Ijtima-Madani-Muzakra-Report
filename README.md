# Weekly Ijtima Dashboard – Drive Connected Update

This update uses the exact Google Drive structure supplied:

`My Drive / Dashboard Working / Dashboard Name / Weekly Ijtima & Muzakra`

Inside `Weekly Ijtima & Muzakra`, Apps Script creates if missing:
- `User Photo`
- `Report Files Weekly Ijtima`

The existing Google Sheet must be named:
- `Weekly Ijtima Users`

The Apps Script searches for that Sheet inside the exact folder above. It no longer depends on `getActiveSpreadsheet()`, which fixes the `Cannot read properties of null (reading getDataRange)` web-app error.

## Deploy
1. Replace the Apps Script `Code.gs` with the file in this ZIP.
2. Run `setupSystem()` once and authorize Drive/Sheets access.
3. Deploy the Apps Script as a Web App, executing as the owner, with access allowed for the users who need the dashboard.
4. The frontend `app.js` already contains the supplied Web App URL.
5. Vercel Root Directory should remain `frontend`, Framework Preset `Other`.


## Roles
Use exactly: `Admin`, `HOD`, `Region`, `State`, `Division`, `District`, `User`.
For normal weekly report submitters use `User`.
Default admin: `admin` / `Admin@2026!`.
Run `setupSystem()` once after replacing `Code.gs`.


## Current Google Drive setup
The script uses: My Drive / Dashboard Working / Dashboard Name / Weekly Ijtima & Muzakra. The Google Sheet file must be named `Weekly Ijtima Users`. Run `setupSystem()` once. For normal reporters use Role=`User`.


## V.1 Feature Update
- Separate Ijtima Master and Weekly Ijtima Report data.
- Weekly Ijtima master import accepts Excel/CSV in browser and writes rows to Google Sheets without retaining the upload.
- Ijtima date is calculated from each Masjid's `Ijtima Day`.
- Admin: Weekly Ijtima Report, Weekly Madani Muzakra Report, Volunteer Data, Create/Update User, password update and access assignment.
- User: same three report buttons with submission forms.
- Roles: Admin, HOD, Region, State, Division, District, User.
- Login is optimized with a cached user index; location master is loaded after login.


## V.2 Feature Update
- Download Excel Format for Weekly Ijtima Master.
- Download Excel Format for Volunteer Data.
- Weekly Madani Muzakra has no master upload option and remains separate from Weekly Ijtima.
- Progress Report has separate Weekly Ijtima / Madani Muzakra buttons.
- Progress supports Week-to-Week, Month-to-Month and Year-to-Year comparison.
- Progress includes chart + table.
- Live date/time with seconds on dashboard.
- Login UI appears before location master loading; user cache reduces repeated login reads.
- Master location filtering remains separate from yearly report sheets.


## V.3 Feature Update
- Removed Refresh buttons from header and login.
- Centered the dashboard heading and top information.
- Password entered in Create/Update User is hashed automatically and used for login.
- User Excel upload added; uploaded plaintext Password is converted to SHA-256 in Google Sheet.
- User Excel format download added.
- User location fields are cascading from the Ijtima Master: Country -> Region -> State -> Division -> District -> Area -> Pincode.
- User import validates assigned locations against the Ijtima Master.
- Create/Update User remains available in Admin.
