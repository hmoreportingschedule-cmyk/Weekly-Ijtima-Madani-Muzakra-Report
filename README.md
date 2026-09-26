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


## V.10 Location Cascade Fix
Admin User Access Location now uses the exact hierarchy:
Country -> Region -> State -> Division -> District -> Area -> Pincode -> Locality -> Masjid Name.
Each dropdown is populated only from the rows matching all previous selections. Pincode never displays Region names.
User access schema also stores Locality and Masjid Name.


## V.11 Updates
- Volunteer Data backend and Excel format now exactly use: Country, Region, State, Division, District, Area, Pincode, Masjid Name, Volunteer Name, Mobile, Whatsapp, Zimmedari Level.
- Working logout now clears the server session and returns to Login.
- User Profile added with assigned location details and profile photo upload.
- Password change available both before login (User ID + Old Password + New Password) and inside User Profile.
- Admin user-location assignment remains hierarchical; once an upper location is assigned, its parent selectors are hidden and only lower-level selectors remain visible.


## V.13 Progress & Targets
- Added Admin Targets management with Excel/CSV upload and downloadable target format.
- Targets are stored by year in `Targets YYYY` tabs inside the `Weekly Ijtima Users` spreadsheet.
- Progress supports Weekly, Monthly and Yearly comparisons with Actual, Target, Variance, Achievement %, Average Actual, Average Target and Average-to-Average achievement.
- Added polished bar, line and achievement charts to the Progress Report.
- Added login-page Reset Password UI and preserved the existing User Profile password change flow.


## V.14 Update
- Admin can view and edit all Ijtima/Muzakra reports from Reports management.
- Users can edit their own reports up to 3 times; after 3 edits the Edit action is locked.
- Profile is shown only when the single User Profile navigation button is clicked; it no longer opens automatically after login.
- Duplicate top Profile button removed.
- Login and dashboard UI refreshed for a more professional responsive layout.
