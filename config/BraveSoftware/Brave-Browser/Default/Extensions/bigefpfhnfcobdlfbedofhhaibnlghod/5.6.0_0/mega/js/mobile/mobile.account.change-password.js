/**
 * My Account Change Password functionality
 */
mobile.settings.account.changePassword = {

    /**
     * @param {Object} $page The jQuery selector object for the current page
     */
    $page: null,

    /**
     * Initialise the page
     */
    init: function() {

        'use strict';

        // If not logged in, return to the login page
        if (typeof u_attr === 'undefined') {
            loadSubPage('login');
            return false;
        }

        // Cache the selector for the page
        this.$page = $('.mobile.my-account-change-password-page');

        // Initialise page functionality
        this.initUpdateButton();

        // Load password strength estimator and initialise the back button to go back to the main My Account page
        mobile.initPasswordFieldsKeyupEvent(this.$page);
        mobile.initPasswordEstimatorLibrary(this.$page);
        mobile.initPasswordStrengthCheck(this.$page);
        mobile.initPasswordVisibleToggle(this.$page);

        // Show the page
        this.$page.removeClass('hidden');
    },

    /**
     * Initialise the Update button to update the user's password and re-encrypt their Master/Recovery Key
     */
    initUpdateButton: function() {

        'use strict';

        var $passwordField = this.$page.find('.password-input');
        var $confirmPasswordField = this.$page.find('.password-confirm-input');
        var $updateButton = this.$page.find('.update-password-button');
        var $inputs = $passwordField.add($confirmPasswordField);

        $inputs.rebind('input', () => {

            $passwordField.parent().removeClass('incorrect');
            $confirmPasswordField.parent().removeClass('incorrect');
        });

        $passwordField.val('').trigger('input');
        $confirmPasswordField.val('');

        $('i.pass-visible', $inputs).removeClass('icon-eye-hidden').addClass('icon-eye-reveal');
        $inputs.attr({'type': 'password'});

        // Add click/tap handler to button
        $updateButton.rebind('tap', () => {

            // Get the current text field values
            var password = $passwordField.val();
            var confirmPassword = $confirmPasswordField.val();

            // If the fields are not completed, the button should not do anything and looks disabled anyway
            if (password.length < 1 || confirmPassword.length < 1) {
                return false;
            }

            // Unfocus (blur) the input fields to prevent the cursor showing on iOS and also hide the keyboard
            $passwordField.add($confirmPasswordField).trigger('blur');

            // Check if the entered passwords are valid or strong enough
            var passwordValidationResult = security.isValidPassword(password, confirmPassword);

            // If bad result
            if (passwordValidationResult !== true) {

                // Add red border, red input text and show warning icon
                $passwordField.parent().addClass('incorrect');
                $confirmPasswordField.parent().addClass('incorrect');

                // Show error dialog and return early
                mobile.messageOverlay.show(passwordValidationResult);
                return false;
            }

            const {$page} = mobile.settings.account.changePassword;
            const $verifyActionPage = $('.mobile.two-factor-page.verify-action-page');

            // Pass the encrypted password to the API
            mobile.settings.account.changePassword.updatePassword(password)
                .then(() => {

                    // Success
                    $page.removeClass('hidden');
                    $verifyActionPage.addClass('hidden');

                    // Show 'Your password has been changed' message and load the account page on button click
                    mobile.messageOverlay.show(l[725], null).then(() => loadSubPage('fm/account'));
                })
                .catch((ex) => {
                    $page.removeClass('hidden');
                    $verifyActionPage.addClass('hidden');
                    tell(ex);
                })
                .finally(() => {
                    $('.password-input, .password-confirm-input', $page).val('');
                });

            // Prevent double taps
            return false;
        });
    },

    /**
     * Updates the user's password, re-encrypts their Master Key, then sends to the server
     * @param {String} newPassword The user's new password
     */
    async updatePassword(newPassword) {
        'use strict';
        let twoFactorPin = null;
        const [
            hasTwoFactor,
            accountAuthVersion
        ] = await Promise.all([twofactor.isEnabledForAccount(), security.changePassword.checkAccountVersion()]);

        // Check if 2FA is enabled on their account
        if (hasTwoFactor) {

            mobile.settings.account.changePassword.$page.addClass('hidden');

            // Show the verify 2FA action page to collect the user's PIN
            twoFactorPin = await mobile.twofactor.verifyAction.init();
        }

        const same = await security.changePassword.isPasswordTheSame($.trim(newPassword), accountAuthVersion);

        // You have entered your current password, please enter a new password.
        assert(!same, l[22126]);

        if (accountAuthVersion === 2) {
            return security.changePassword.newMethod(newPassword, twoFactorPin);
        }

        return security.changePassword.oldMethod(newPassword, twoFactorPin);
    },

    /**
     * Update the UI after attempting to change the password and let the user know if it failed or was successful
     * @param {Number} result The result from the change password API request
     */
    completeChangePassword: function(result) {

        'use strict';

        loadingDialog.hide();

        // Cache selector
        var $page = mobile.settings.account.changePassword.$page;
        var $verifyActionPage = $('.mobile.two-factor-page.verify-action-page');

        // If something went wrong with the 2FA PIN
        if (result === EFAILED || result === EEXPIRED) {
            mobile.twofactor.verifyAction.showVerificationError();
        }

        // If something else went wrong, show an error
        else if (typeof result === 'number' && result < 0) {
            $page.removeClass('hidden');
            $verifyActionPage.addClass('hidden');
            mobile.messageOverlay.show(l[135]);
        }
        else {
            // Success
            $page.removeClass('hidden');
            $verifyActionPage.addClass('hidden');

            // Show 'Your password has been changed' message and load the account page on button click
            mobile.messageOverlay.show(l[725], null).then(() => {
                $page.addClass('hidden');
                loadSubPage('fm/account');
            });
        }

        // Clear password fields
        $page.find('.password-input').val('');
        $page.find('.password-confirm-input').val('');
    }
};
