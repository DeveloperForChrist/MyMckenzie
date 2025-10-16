# TODO: Delete Account Functionality

## Completed
- [x] Add delete button to friend settings page (mckenzie-setting.html)
- [x] Update settings.js to fully delete user data from Firestore (deleteDoc instead of updateDoc)
- [x] Add profile picture deletion from Firebase Storage
- [x] Ensure sign out after deletion
- [x] Add proper IDs to form fields in mckenzie-setting.html for JS functionality
- [x] Include settings.js script in mckenzie-setting.html

## Pending Testing
- [ ] Test delete account on user settings page (settings.html)
- [ ] Test delete account on friend settings page (mckenzie-setting.html)
- [ ] Verify complete data removal (Firestore document, Storage files, Auth user)
- [ ] Confirm logout and redirect to signin page
- [ ] Test error handling (e.g., if Storage deletion fails)
