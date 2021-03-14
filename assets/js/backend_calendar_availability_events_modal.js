/* ----------------------------------------------------------------------------
 * Easy!Appointments - Open Source Web Scheduler
 *
 * @package     EasyAppointments
 * @author      A.Tselegidis <alextselegidis@gmail.com>
 * @copyright   Copyright (c) 2013 - 2020, Alex Tselegidis
 * @license     http://opensource.org/licenses/GPL-3.0 - GPLv3
 * @link        http://easyappointments.org
 * @since       v1.2.0
 * ---------------------------------------------------------------------------- */

/**
 * Backend Calendar Availability Events Modal
 *
 * This module implements the availability events modal functionality.
 *
 * @module BackendCalendarAvailabilityEventsModal
 */
window.BackendCalendarAvailabilityEventsModal = window.BackendCalendarAvailabilityEventsModal || {};

(function (exports) {

    'use strict';

    function bindEventHandlers() {
        /**
         * Event: Manage available Dialog Save Button "Click"
         *
         * Stores the available period changes or inserts a new record.
         */
        $('#manage-available #save-available').on('click', function () {
            var $dialog = $('#manage-available');
            $dialog.find('.modal-message').addClass('d-none');
            $dialog.find('.has-error').removeClass('has-error');

            var start = $dialog.find('#available-starttime').datetimepicker('getDate');

            if (!start) {
                $dialog.find('#available-starttime').closest('.form-group').addClass('has-error');
                return;
            }

            var end = Date.parse($dialog.find('#available-endtime').datetimepicker('getDate'));

            if (!end) {
                $dialog.find('#available-endtime').closest('.form-group').addClass('has-error');
                return;
            }

            if (start > end) {
                // Start time is after end time - display message to user.
                $dialog.find('.modal-message')
                    .text(EALang.start_date_before_end_error)
                    .addClass('alert-danger')
                    .removeClass('d-none');

                $dialog.find('#available-starttime, #available-endtime').closest('.form-group').addClass('has-error');
                return;
            }

            // available period records go to the availabilities table.
            var available = {
                start_time: start.toString('yyyy-MM-dd HH:mm'),
                end_time: end.toString('yyyy-MM-dd HH:mm'),
                id_users_provider: $('#available-provider').val(),
                id_services: $dialog.find('#available-service').val(),
            };

            if ($dialog.find('#available-id').val() !== '') {
                // Set the id value, only if we are editing an appointment.
                available.id = $dialog.find('#available-id').val();
            }

            var successCallback = function () {
                // Display success message to the user.
                Backend.displayNotification(EALang.available_saved);

                // Close the modal dialog and refresh the calendar appointments.
                $dialog.find('.alert').addClass('d-none');
                $dialog.modal('hide');
                $('#select-filter-item').trigger('change');
            };

            BackendCalendarApi.saveAvailable(available, successCallback, null);
        });

        /**
         * Event : Insert available Time Period Button "Click"
         *
         * When the user clicks this button a popup dialog appears and the use can set a time period where
         * he cannot accept any appointments.
         */
        $('#insert-available').on('click', function () {
            BackendCalendarAvailabilityEventsModal.resetAvailableDialog();
            var $dialog = $('#manage-available');

            // Set the selected filter item and find the next appointment time as the default modal values.
            if ($('#select-filter-item option:selected').attr('type') === 'provider') {
                var providerId = $('#select-filter-item').val();

                var providers = GlobalVariables.availableProviders.filter(function (provider) {
                    return Number(provider.id) === Number(providerId);
                });

                if (providers.length) {
                    $dialog.find('#available-service').val(providers[0].services[0]).trigger('change');
                    $dialog.find('#available-provider').val(providerId);
                }
            } else if ($('#select-filter-item option:selected').attr('type') === 'service') {
                $dialog.find('#available-service option[value="' + $('#select-filter-item').val() + '"]')
                    .prop('selected', true);
            } else {
                $dialog.find('#available-service option:first')
                    .prop('selected', true)
                    .trigger('change');
            }

            // Set the default datetime values.
            var start = new Date();
            var currentMin = parseInt(start.toString('mm'));

            if (currentMin > 0 && currentMin < 15) {
                start.set({ 'minute': 15 });
            } else if (currentMin > 15 && currentMin < 30) {
                start.set({ 'minute': 30 });
            } else if (currentMin > 30 && currentMin < 45) {
                start.set({ 'minute': 45 });
            } else {
                start.addHours(1).set({ 'minute': 0 });
            }

            $dialog.find('#available-provider')
                .val($('#select-filter-item').val())
                .closest('.form-group');

            // if ($('.calendar-view').length === 0) {
            //     $dialog.find('#available-provider')
            //         .val($('#select-filter-item').val())
            //         .closest('.form-group')
            //         .hide();
            // }

            $dialog.find('#available-start').val(GeneralFunctions.formatDate(start, GlobalVariables.dateFormat, true));
            $dialog.find('#available-end').val(GeneralFunctions.formatDate(start.addHours(1), GlobalVariables.dateFormat, true));
            $dialog.find('.modal-header h3').text(EALang.new_available_title);
            $dialog.modal('show');
        });

        /**
         * Event: Selected Service "Change"
         *
         * When the user clicks on a service, its available providers should become visible. Also we need to
         * update the start and end time of the appointment.
         */
        $('#available-service').on('change', function () {
            var serviceId = $('#available-service').val();

            $('#available-provider').empty();

            // Update the providers select box.

            GlobalVariables.availableProviders.forEach(function (provider) {
                provider.services.forEach(function (providerServiceId) {
                    if (GlobalVariables.user.role_slug === Backend.DB_SLUG_SECRETARY && GlobalVariables.secretaryProviders.indexOf(provider.id) === -1) {
                        return; // continue
                    }

                    // If the current provider is able to provide the selected service, add him to the listbox.
                    if (Number(providerServiceId) === Number(serviceId)) {
                        $('#available-provider')
                            .append(new Option(provider.first_name + ' ' + provider.last_name, provider.id));
                    }
                });
            });
        });

        $('#available-recurring').on('change', function () {
            if ($(this).prop('checked')) {
                $('.available-recurring-options').show();
            } else {
                $('.available-recurring-options').hide();
            }

        });
    }

    /**
     * Reset available dialog form.
     *
     * Reset the "#manage-available" dialog. Use this method to bring the dialog to the initial state
     * before it becomes visible to the user.
     */
    exports.resetAvailableDialog = function () {
        var $dialog = $('#manage-available');

        $dialog.find('#available-id').val('');

        // Set default time values
        var start = GeneralFunctions.formatDate(new Date(), GlobalVariables.dateFormat, true);
        var end = GeneralFunctions.formatDate(new Date().addHours(1), GlobalVariables.dateFormat, true);
        var dateFormat;

        switch (GlobalVariables.dateFormat) {
            case 'DMY':
                dateFormat = 'dd/mm/yy';
                break;
            case 'MDY':
                dateFormat = 'mm/dd/yy';
                break;
            case 'YMD':
                dateFormat = 'yy/mm/dd';
                break;
        }

        var fDay = GlobalVariables.firstWeekday;
        var fDaynum = GeneralFunctions.getWeekDayId(fDay);

        $dialog.find('#available-starttime').timepicker({
            dateFormat: dateFormat,
            timeFormat: GlobalVariables.timeFormat === 'regular' ? 'h:mm TT' : 'HH:mm',

            // Translation
            dayNames: [EALang.sunday, EALang.monday, EALang.tuesday, EALang.wednesday,
            EALang.thursday, EALang.friday, EALang.saturday],
            dayNamesShort: [EALang.sunday.substr(0, 3), EALang.monday.substr(0, 3),
            EALang.tuesday.substr(0, 3), EALang.wednesday.substr(0, 3),
            EALang.thursday.substr(0, 3), EALang.friday.substr(0, 3),
            EALang.saturday.substr(0, 3)],
            dayNamesMin: [EALang.sunday.substr(0, 2), EALang.monday.substr(0, 2),
            EALang.tuesday.substr(0, 2), EALang.wednesday.substr(0, 2),
            EALang.thursday.substr(0, 2), EALang.friday.substr(0, 2),
            EALang.saturday.substr(0, 2)],
            monthNames: [EALang.january, EALang.february, EALang.march, EALang.april,
            EALang.may, EALang.june, EALang.july, EALang.august, EALang.september,
            EALang.october, EALang.november, EALang.december],
            prevText: EALang.previous,
            nextText: EALang.next,
            currentText: EALang.now,
            closeText: EALang.close,
            timeOnlyTitle: EALang.select_time,
            timeText: EALang.start,
            hourText: EALang.hour,
            minuteText: EALang.minutes,
            firstDay: fDaynum
        });
        $dialog.find('#available-starttime').val(start);

        $dialog.find('#available-endtime').timepicker({
            dateFormat: dateFormat,
            timeFormat: GlobalVariables.timeFormat === 'regular' ? 'h:mm TT' : 'HH:mm',

            // Translation
            dayNames: [EALang.sunday, EALang.monday, EALang.tuesday, EALang.wednesday,
            EALang.thursday, EALang.friday, EALang.saturday],
            dayNamesShort: [EALang.sunday.substr(0, 3), EALang.monday.substr(0, 3),
            EALang.tuesday.substr(0, 3), EALang.wednesday.substr(0, 3),
            EALang.thursday.substr(0, 3), EALang.friday.substr(0, 3),
            EALang.saturday.substr(0, 3)],
            dayNamesMin: [EALang.sunday.substr(0, 2), EALang.monday.substr(0, 2),
            EALang.tuesday.substr(0, 2), EALang.wednesday.substr(0, 2),
            EALang.thursday.substr(0, 2), EALang.friday.substr(0, 2),
            EALang.saturday.substr(0, 2)],
            monthNames: [EALang.january, EALang.february, EALang.march, EALang.april,
            EALang.may, EALang.june, EALang.july, EALang.august, EALang.september,
            EALang.october, EALang.november, EALang.december],
            prevText: EALang.previous,
            nextText: EALang.next,
            currentText: EALang.now,
            closeText: EALang.close,
            timeOnlyTitle: EALang.select_time,
            timeText: EALang.end,
            hourText: EALang.hour,
            minuteText: EALang.minutes,
            firstDay: fDaynum
        });
        $dialog.find('#available-endtime').val(end);

        $dialog.find('#available-recurring-end').datetimepicker({
            dateFormat: dateFormat,
            timeFormat: GlobalVariables.timeFormat === 'regular' ? 'h:mm TT' : 'HH:mm',

            // Translation
            dayNames: [
                EALang.sunday, EALang.monday, EALang.tuesday, EALang.wednesday,
                EALang.thursday, EALang.friday, EALang.saturday],
            dayNamesShort: [
                EALang.sunday.substr(0, 3), EALang.monday.substr(0, 3),
                EALang.tuesday.substr(0, 3), EALang.wednesday.substr(0, 3),
                EALang.thursday.substr(0, 3), EALang.friday.substr(0, 3),
                EALang.saturday.substr(0, 3)],
            dayNamesMin: [
                EALang.sunday.substr(0, 2), EALang.monday.substr(0, 2),
                EALang.tuesday.substr(0, 2), EALang.wednesday.substr(0, 2),
                EALang.thursday.substr(0, 2), EALang.friday.substr(0, 2),
                EALang.saturday.substr(0, 2)],
            monthNames: [
                EALang.january, EALang.february, EALang.march, EALang.april,
                EALang.may, EALang.june, EALang.july, EALang.august, EALang.september,
                EALang.october, EALang.november, EALang.december],
            prevText: EALang.previous,
            nextText: EALang.next,
            currentText: EALang.now,
            closeText: EALang.close,
            timeOnlyTitle: EALang.select_time,
            timeText: EALang.until,
            hourText: EALang.hour,
            minuteText: EALang.minutes,
            firstDay: fDaynum
        });

        $("#available-recurring").prop("checked", false);
        $('.available-recurring-options').hide();
    };

    exports.initialize = function () {
        var $availabilityProvider = $('#available-provider');

        for (var index in GlobalVariables.availableProviders) {
            var provider = GlobalVariables.availableProviders[index];

            $availabilityProvider.append(new Option(provider.first_name + ' ' + provider.last_name, provider.id));
        }

        bindEventHandlers();
    };

})(window.BackendCalendarAvailabilityEventsModal);
