# Testing Brief for Ramone and Wesley

## What I Need
I’m away for the next 3 weeks, and I need you to help me check that VerifiedBizLink works properly.

Please use the site the way a normal person would. Click the buttons, try the forms, upload files, and let me know what feels wrong, confusing, or broken.

## How To Test
Try to go through the site from start to finish, not just one page.

## Priority Order (Most Important First)
Please test in this order so the most important areas are always covered:

1. Sign in and account access
2. Vetting Hub and document uploads
3. Profile and settings updates
4. Navigation between main pages
5. Notifications, support, and chat
6. Onboarding and support pages

If you run out of time on any day, finish items 1 to 3 first.

### 1. Sign In and Sign Up
Start on these pages:
- `/login`
- `/signup`

Please check:
- Can you type in the email and password boxes?
- Does the show/hide password button work?
- Does the “Change password?” link open the right page?
- Does the sign in button work?
- On sign up, can you choose Customer or Business?
- Do all the sign up fields work?
- Does the Terms and Privacy checkbox work?
- Does the Create Account button work?
- After signing in or signing up, does it take you to the right place?

### 2. Onboarding
After creating an account, check the setup steps that follow.

Please look for:
- Continue and Back buttons
- Skip buttons
- Any page that asks for company details, preferences, or package choices
- Any button that finishes setup or moves you to the next step
- Whether the final step makes sense

### 3. Vetting Hub
Open `/vetting` and test the whole business verification area.

Please check:
- Edit Profile
- Save Business Profile
- Submit for Vetting
- Every Upload button for documents
- Every Re-upload button
- Every View button
- The Download link inside the document preview window
- Learn More
- Contact Agent
- Notifications
- Sign Out

For document uploads, please make sure:
- The file picker opens
- A file can be uploaded without errors
- The uploaded file shows up on the page
- Re-upload replaces the old file
- View opens the document properly

### 4. Main Parts of the App
Please also test the main menu and anything easy to reach from it:
- Home
- My Network
- Vetting Hub
- Analytics
- Settings
- Notifications
- Sign Out
- The mobile menu, if you’re on a smaller screen
- The chat button
- Any ad or banner that appears

Also check these common day-to-day actions:
- Moving between pages without errors
- Returning to the previous page after completing an action
- Refreshing a page and confirming saved data is still there
- Signing out and signing back in to confirm session stability

### 5. Help and Policy Pages
Please check these pages too:
- `/contact`
- `/privacy`
- `/terms`

## Must-Pass Functionality List
These are the core functions that must work every time:

1. Login works and opens the correct area
2. Signup works for both Customer and Business options
3. Business profile saves correctly
4. Document uploads work (upload, view, re-upload)
5. Submit for Vetting works and updates status
6. Main navigation links open the correct pages
7. Notifications panel opens without errors
8. Sign out works and returns to login

If any one of these fails, please report it immediately as medium or high severity.

## What To Look For On Every Button
Each time you click something, please confirm:
- The button is easy to see and click
- It gives a clear result
- It opens the right page, box, message, or change on the screen
- It does not freeze or need extra clicks
- It does not say success if nothing actually happened

If a button is disabled, that should make sense.

## What To Send Me
When you find an issue, please report it like this:

- Page:
- What you clicked:
- What you expected to happen:
- What actually happened:
- Device/browser:
- Screenshot or short video if possible:
- How serious it feels: low / medium / high

## The Most Important Problems
Please focus on:
- Uploads that fail
- Buttons that do nothing
- Wrong page redirects
- Data not saving
- Text that sounds false or misleading
- Important controls being hard to find
- Problems on mobile
- Anything that feels unreliable in a live demo

## How To Think About It
Please test it like a regular business user, not like a developer.
If something feels confusing to you, it will probably confuse someone else too, so please mention it.

## How I’ll Use Your Feedback
Send me the issues every day or two, and I’ll turn them into fixes or changes.
Keep notes as you go so nothing gets forgotten.
