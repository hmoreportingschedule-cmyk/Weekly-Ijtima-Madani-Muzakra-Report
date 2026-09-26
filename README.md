# Weekly Ijtima Dashboard — V.20

V.20 requested updates:
- Assigned location boundary hides Country/Region/etc. through the assigned level while keeping lower selections available.
- Weekly Madani Muzakra is Saturday-only, with Saturday default and backend validation.
- Madani Muzakra progress control uses the same progress workflow as Weekly Ijtima.
- Dashboard/login/sidebar title updated to “Weekly Ijtima & Madani Muzakra” with Arial Black styling.
- Existing functionality otherwise retained.


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


## V.4 Feature Update
- Notification bell icon added to the top-right dashboard header.
- Notification badge shows the number of pending Weekly Ijtima reports.
- Clicking the bell opens a table with Ijtima/Masjid name, location, Ijtima day, due date and the requested reminder message.
- Notifications are based on each Masjid's assigned Ijtima Day and the current Monday-Sunday week.
- Future scheduled Ijtima dates are not marked missing before their day arrives.
- The notification list is filtered by the logged-in user's access.


## V.5 Feature Update
- Google Apps Script Web App URL is embedded in frontend/app.js.
- Notification bell is hidden on the Login page.
- Notification bell becomes visible only after successful login.


## V.6 Feature Update
- Password is now stored in the `Password` column exactly as entered by Admin; `Password Hash` is no longer used for new users.
- Login compares the exact Password value from the Users sheet.
- Existing hash-only users can still login once using their old password and are automatically migrated to the Password column.
- Login cache is isolated under `users_fast_v6`.
- Location master is never loaded during credential verification.
- Login UI shows immediate progress and has a 15-second request timeout instead of hanging indefinitely.
- User Create/Update and Excel import now write plaintext Password to the Password column.


## V8 Login Repair
- Admin User ID and Username are both `admin`.
- Admin password is `Admin@2026!` and is written to the `Password` column.
- Login accepts either User ID or Username.
- Older Users sheets with Password Hash in column C are migrated by inserting Password after Username.
- Exact Admin credentials automatically repair/create the Admin row on login.
- User template includes Password as a visible column.


## V.9 Location & Volunteer Update
- Fixed cascading location dropdowns: Country -> Region -> State -> Division -> District -> Area -> Pincode -> Locality -> Masjid.
- Region now shows Region names, not Masjid names.
- Pincode now shows Pincode values.
- Selecting a parent location repopulates only valid child values from the master data.
- Volunteer Data now has Country, Region, State, Division, District, Area, Pincode and Masjid selectors.
- Volunteer Excel download format now includes all location fields plus Name, Mobile and Details.
- Volunteer backend stores Pincode and validates non-admin users against their assigned location.
- Old volunteer Excel files containing only Name/Mobile/Details remain importable.


## V.16 — Requested UI/UX Update
- Report buttons renamed to Add Weekly Ijtima Report and Add Weekly Madani Muzakra Report.
- Professional operations-console dashboard layout inspired by the supplied reference.
- Professional split login screen with Show Password and Reset Password (old/new password).
- Cascading Add Report location controls remain filtered by the assigned location, with fixed assigned levels locked automatically so the next level (State/Division/District/Area/Pincode/Locality/Masjid) remains selectable.
- Weekly/monthly/yearly progress comparison keeps the existing backend and adds a bar + trend-line visual.
- Mobile responsive layout and a 15-second request timeout were added without changing the Google Sheet data model.
- Google Apps Script includes the changePassword action for the login-page password reset.


## V24 — Reference Screenshot UI Update
- Updated frontend visual styling to closely match the supplied Islamic green/gold dashboard screenshot.
- Expanded sidebar to the reference proportions with Islamic decorative motif, gold accents and matching navigation button treatment.
- Added full-width emerald/gold header treatment, lantern accent, date/time capsule, notification and logout styling.
- Updated welcome banner, Reports heading, three equal report action cards, and Weekly Ijtima form cards to match the reference layout.
- Preserved the existing Google Apps Script API URL, login flow, cascading locations, report submission, volunteer data, progress reporting, notifications and password reset functionality.
- This is a visual/UI update only; the existing data model and backend actions were not intentionally changed.
