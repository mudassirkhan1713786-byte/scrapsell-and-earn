# ScrapSell & Earn — Website Starter

## Features
- Mobile-responsive English website
- Copper and aluminium scrap categories and owner-editable rates
- Customer enquiry form (name, phone, location, type, quantity, notes)
- Private owner admin panel for rates and enquiry status
- Cash-after-inspection process information

## Run locally
1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. Run `npm install`
4. Set an admin password before running:
   - Windows PowerShell: `$env:ADMIN_PASSWORD="a-long-unique-password"`
   - macOS/Linux: `export ADMIN_PASSWORD="a-long-unique-password"`
5. Run `npm start`
6. Open `http://localhost:3000`

## Important before public launch
- Change the default admin password. Do not publish with `ChangeMe123!`.
- Use HTTPS and a reputable hosting provider.
- This starter stores enquiries in `data.json`; deploy to persistent storage or a database-backed host before real use.
- Add backups, spam/rate limiting, privacy notice and business contact details before launch.
- Uploading scrap photos is not implemented yet; the form currently captures details only.
- Add your real WhatsApp/business phone number and verified domain before launch.
- The rate fields are intentionally blank until the owner adds actual purchase rates.
- This starter is a working starting point, not a hosted/live website or a legal/compliance review.
