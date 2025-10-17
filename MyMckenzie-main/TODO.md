# TODO: Redesign Whole Web App with 60% Purple, 30% White, 10% Black Theme

## Overview
Redesign the entire web app with 60% purple, 30% white, 10% black theme. Index and chatbot pages should be purple throughout. Standardize :root variables across all CSS files to match style.css theme.

## Steps
- [x] Update all CSS files :root variables to match style.css
- [x] Adjust styles in each CSS file for 60% purple backgrounds, 30% white text, 10% black accents
- [x] Special: Make index (style.css) and chatbot (chatbot.css) purple throughout
- [x] Update signin.css styles
- [x] Update user-signup.css :root variables and styles (already has correct theme)
- [x] Update Friend-Signup.css styles (already has correct theme)
- [x] Update billing.css styles (already has correct theme)
- [x] Update bill-mckenzie.css styles (already has correct theme)
- [x] Update Contact.css styles (already has correct theme)
- [x] Update ContactMckenzie.css styles (already has correct theme)
- [x] Update join.css styles (already has correct theme)
- [x] Update JoinMckenzie.css styles (already has correct theme)
- [x] Removed marketplace directory and marketplace.css (user requested removal)
- [x] Update mckenzie-setting.css styles (already has correct theme)
- [x] Update settings.css styles (already has correct theme)
- [x] Update pages.css styles (already has correct theme)
- [x] Update friend-Dashboard.css styles (added missing :root variables for consistency)
- [x] Test all pages locally on port 8080 (server running on http://0.0.0.0:8080/) - all pages return 200 OK
- [x] Address chatbot error if needed (backend issue: "⚠️ The service is overloaded or unavailable. Please try again in a minute." - separate backend issue, not addressed in this redesign task)

## New Features Added
- [x] Create comprehensive connect-portal.html with all required form fields
- [x] Update chatbot.js to count messages and refer users after 2 exchanges
- [x] Integrate Gemini AI to generate conversation summaries for case details
- [x] Add form submission logic with file uploads, draft saving, and case reference numbers
- [x] Add CSS styling for form sections, checkboxes, and draft button
- [x] Test connect-portal.html loading (returns 200)
- [x] Create case-portal.js for McKenzie Friends to view and accept/decline cases
- [x] Add case portal styling to friend-Dashboard.css
- [x] Fix form submission redirect to user-dashboard.html instead of case-portal
- [x] Shorten form by reducing textarea rows and simplifying labels
- [x] Add Firebase integration to prefill user name and email from database
- [x] Improve case-portal.html layout with statistics, filters, and better UX
- [x] Add success popup after case submission with 24-hour response expectation
- [x] Store submitted cases in array for friend portal visibility with numbered cards

## Firebase Case Workflow Implementation
- [x] Update connect-portal.js to submit cases to Firebase Firestore instead of localStorage
- [x] Update case-portal.js to load cases from Firebase Firestore
- [x] Update acceptCase function to update case status in Firebase
- [x] Update declineCase function to delete case from Firebase
- [x] Update statistics to reflect Firebase data
- [ ] Test case submission workflow: Submit case → Verify in Firebase → Check portal display → Test accept/decline
- [ ] Add user notification system for case status updates (optional)
- [ ] Implement authentication checks for portal access (optional)
