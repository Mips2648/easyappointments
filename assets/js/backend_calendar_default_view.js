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
 * Backend Calendar
 *
 * This module implements the default calendar view of backend.
 *
 * @module BackendCalendarDefaultView
 */
window.BackendCalendarDefaultView = window.BackendCalendarDefaultView || {};

(function (exports) {
    'use strict';

    // Constants
    var FILTER_TYPE_PROVIDER = 'provider';
    var FILTER_TYPE_SERVICE = 'service';

    // Variables
    var lastFocusedEventData = null; // Contains event data for later use.

    var fullcalendar; //Containes fullcalendar
    var workingPlan = {};

    /**
     * Bind event handlers for the calendar view.
     */
    function bindEventHandlers() {
        var $calendarPage = $('#calendar-page');

        /**
         * Event: Reload Button "Click"
         *
         * When the user clicks the reload button an the calendar items need to be refreshed.
         */
        $('#reload-appointments').on('click', function () {
            refreshCalendarAppointments();
        });

        /**
         * Event: Popover Close Button "Click"
         *
         * Hides the open popover element.
         */
        $calendarPage.on('click', '.close-popover', function () {
            $(this).parents('.popover').popover('dispose');
            lastFocusedEventData = null;
        });

        /**
         * Event: Popover Edit Button "Click"
         *
         * Enables the edit dialog of the selected calendar event.
         */
        $calendarPage.on('click', '.edit-popover', function () {
            $(this).parents('.popover').popover('dispose');

            var $dialog;
            var startDatetime;
            var endDatetime;

            if (lastFocusedEventData.extendedProps.data.is_unavailable === '0') {
                var appointment = lastFocusedEventData.extendedProps.data;
                $dialog = $('#manage-appointment');

                BackendCalendarAppointmentsModal.resetAppointmentDialog();

                // Apply appointment data and show modal dialog.
                $dialog.find('.modal-header h3').text(EALang.edit_appointment_title);
                $dialog.find('#appointment-id').val(appointment.id);
                $dialog.find('#select-service').val(appointment.id_services).trigger('change');
                $dialog.find('#select-provider').val(appointment.id_users_provider);

                // Set the start and end datetime of the appointment.
                startDatetime = Date.parseExact(appointment.start_datetime, 'yyyy-MM-dd HH:mm:ss');
                $dialog.find('#start-datetime').datetimepicker('setDate', startDatetime);

                endDatetime = Date.parseExact(appointment.end_datetime, 'yyyy-MM-dd HH:mm:ss');
                $dialog.find('#end-datetime').datetimepicker('setDate', endDatetime);

                var customer = appointment.customer;
                $dialog.find('#customer-id').val(appointment.id_users_customer);
                $dialog.find('#first-name').val(customer.first_name);
                $dialog.find('#last-name').val(customer.last_name);
                $dialog.find('#email').val(customer.email);
                $dialog.find('#phone-number').val(customer.phone_number);
                $dialog.find('#address').val(customer.address);
                $dialog.find('#city').val(customer.city);
                $dialog.find('#zip-code').val(customer.zip_code);
                $dialog.find('#appointment-location').val(appointment.location);
                $dialog.find('#appointment-notes').val(appointment.notes);
                $dialog.find('#customer-notes').val(customer.notes);
                $dialog.modal('show');
            } else {
                var unavailable = lastFocusedEventData.extendedProps.data;

                // Replace string date values with actual date objects.
                unavailable.start_datetime = lastFocusedEventData.start.toString('yyyy-MM-dd HH:mm:ss');
                startDatetime = Date.parseExact(unavailable.start_datetime, 'yyyy-MM-dd HH:mm:ss');
                unavailable.end_datetime = lastFocusedEventData.end.toString('yyyy-MM-dd HH:mm:ss');
                endDatetime = Date.parseExact(unavailable.end_datetime, 'yyyy-MM-dd HH:mm:ss');

                $dialog = $('#manage-unavailable');
                BackendCalendarUnavailabilityEventsModal.resetUnavailableDialog();

                // Apply unavailable data to dialog.
                $dialog.find('.modal-header h3').text('Edit Unavailable Period');
                $dialog.find('#unavailable-start').datetimepicker('setDate', startDatetime);
                $dialog.find('#unavailable-id').val(unavailable.id);
                $dialog.find('#unavailable-provider').val(unavailable.id_users_provider);
                $dialog.find('#unavailable-end').datetimepicker('setDate', endDatetime);
                $dialog.find('#unavailable-notes').val(unavailable.notes);
                $dialog.modal('show');
            }
            lastFocusedEventData = null;
        });

        /**
         * Event: Popover Delete Button "Click"
         *
         * Displays a prompt on whether the user wants the appointment to be deleted. If he confirms the
         * deletion then an AJAX call is made to the server and deletes the appointment from the database.
         */
        $calendarPage.on('click', '.delete-popover', function () {
            $(this).parents('.popover').popover('dispose');

            var url;
            var data;

            var buttons = [
                {
                    text: EALang.cancel,
                    click: function () {
                        $('#message-box').dialog('close');
                        lastFocusedEventData = null;
                    }
                },
                {
                    text: 'OK',
                    click: function () {
                        url = GlobalVariables.baseUrl + '/index.php/backend_api/ajax_delete_appointment';

                        data = {
                            csrfToken: GlobalVariables.csrfToken,
                            appointment_id: lastFocusedEventData.extendedProps.data.id
                        };

                        $.post(url, data)
                            .done(function () {
                                $('#message-box').dialog('close');

                                // Refresh calendar event items.
                                $('#select-filter-item').trigger('change');
                            });
                        lastFocusedEventData = null;
                    }
                }
            ];

            GeneralFunctions.displayMessageBox(EALang.delete_appointment_title,
                EALang.delete_appointment_prompt, buttons);
        });

        /**
         * Event: Calendar Filter Item "Change"
         *
         * Load the appointments that correspond to the select filter item and display them on the calendar.
         */
        $('#select-filter-item').on('change', function () {
            refreshCalendarAppointments();
            // If current value is service, then buttons must be disabled.
            if ($('#select-filter-item option:selected').attr('type') === FILTER_TYPE_SERVICE) {
                $('#insert-appointment, #insert-dropdown').prop('disabled', true);
                fullcalendar.setOption('selectable', false);
                fullcalendar.setOption('editable', false);
            } else {
                $('#insert-appointment, #insert-dropdown').prop('disabled', false);
                fullcalendar.setOption('selectable', true);
                fullcalendar.setOption('editable', true);

                var providerId = $('#select-filter-item').val();

                var provider = GlobalVariables.availableProviders.find(function (availableProvider) {
                    return Number(availableProvider.id) === Number(providerId);
                });

                if (provider && provider.timezone) {
                    $('.provider-timezone').text(GlobalVariables.timezones[provider.timezone]);
                }
            }
        });
    }

    /**
     * Get Calendar Component Height
     *
     * This method calculates the proper calendar height, in order to be displayed correctly, even when the
     * browser window is resizing.
     *
     * @return {Number} Returns the calendar element height in pixels.
     */
    function getCalendarHeight() {
        var result = window.innerHeight - $('#footer').outerHeight() - $('#header').outerHeight()
            - $('#calendar-toolbar').outerHeight() - 30; // 60 for fine tuning
        return (result > 500) ? result : 500; // Minimum height is 500px
    }

    /**
     * Get the event notes for the popup widget.
     *
     * @param {Event} event
     */
    function getEventNotesExcerpt(notes, maxLenght = 100, def = '') {
        if (!notes) {
            return def;
        }

        return notes.length > maxLenght ? notes.substring(0, maxLenght) + '...' : notes;
    }

    function onCalendarSelect(selectionInfo) {
        var difference_in_millisecondes = selectionInfo.end.getTime() - selectionInfo.start.getTime();
        if (selectionInfo.view.type == 'dayGridMonth') {
            var difference_in_days = difference_in_millisecondes / (1000 * 3600 * 24);
            if (difference_in_days == 1) {
                fullcalendar.changeView('timeGridWorkWeek');
                fullcalendar.gotoDate(selectionInfo.start);
                return;
            }
        } else {
            var difference_in_minutes = difference_in_millisecondes / (1000 * 60);
            if (difference_in_minutes == GlobalVariables.calendarTimeslot) {
                // is simple click => create appointment
                createAppointment(selectionInfo);
            } else {
                $('#insert-unavailable').trigger('click');
                $('#unavailable-start').datepicker('setDate', selectionInfo.start);
                $('#unavailable-end').datepicker('setDate', selectionInfo.end);

            }
        }
    }

    function createAppointment(selectionInfo) {
        $('#insert-appointment').trigger('click');

        // Preselect time
        $('#start-datetime').datepicker('setDate', selectionInfo.start);

        // Preselect service & provider.
        var service;

        if ($('#select-filter-item option:selected').attr('type') === FILTER_TYPE_SERVICE) {
            service = GlobalVariables.availableServices.find(function (service) {
                return Number(service.id) === Number($('#select-filter-item').val());
            });
            $('#select-service').val(service.id).trigger('change');

        } else {
            var provider = GlobalVariables.availableProviders.find(function (provider) {
                return Number(provider.id) === Number($('#select-filter-item').val());
            });

            service = GlobalVariables.availableServices.find(function (service) {
                return provider.services.indexOf(service.id) !== -1
            });

            if (service) {
                $('#select-service').val(service.id);
            }

            if (!$('#select-service').val()) {
                $('#select-service option:first').prop('selected', true);
            }

            $('#select-service').trigger('change');

            if (provider) {
                $('#select-provider').val(provider.id);
            }

            if (!$('#select-provider').val()) {
                $('#select-provider option:first').prop('selected', true);
            }

            $('#select-provider').trigger('change');
        }

        return;
    }

    function getEventPopupHtml(eventInfo) {
        var $html;
        var displayEdit;
        var displayDelete;

        var event = eventInfo.event;
        var showActions = eventInfo.jsEvent.type === 'click';

        if (Boolean(Number(event.extendedProps.data.is_unavailable)) === true) {
            displayEdit = (GlobalVariables.user.privileges.appointments.edit === true && showActions === true) ? 'mr-2' : 'd-none';
            displayDelete = (GlobalVariables.user.privileges.appointments.delete === true && showActions === true) ? 'mr-2' : 'd-none';

            $html = $('<div/>', {
                'html': [
                    $('<strong/>', {
                        'class': 'd-inline-block mr-2',
                        'text': EALang.start
                    }),
                    $('<span/>', {
                        'text': GeneralFunctions.formatDate(event.start, GlobalVariables.dateFormat, true)
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block mr-2',
                        'text': EALang.end
                    }),
                    $('<span/>', {
                        'text': GeneralFunctions.formatDate(event.end, GlobalVariables.dateFormat, true)
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block mr-2',
                        'text': EALang.notes
                    }),
                    $('<span/>', {
                        'text': getEventNotesExcerpt(event.extendedProps.data.notes, 100, '-')
                    }),
                    $('<br/>'),

                    showActions ? $('<hr/>') : '',

                    showActions ? $('<div/>', {
                        'class': 'd-flex justify-content-center',
                        'html': [
                            $('<button/>', {
                                'class': 'close-popover btn btn-outline-secondary mr-2',
                                'html': [
                                    $('<i/>', {
                                        'class': 'fas fa-ban mr-2'
                                    }),
                                    $('<span/>', {
                                        'text': EALang.close
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'class': 'delete-popover btn btn-danger ' + displayDelete,
                                'html': [
                                    $('<i/>', {
                                        'class': 'fas fa-trash-alt mr-2'
                                    }),
                                    $('<span/>', {
                                        'text': EALang.delete
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'class': 'edit-popover btn btn-primary ' + displayEdit,
                                'html': [
                                    $('<i/>', {
                                        'class': 'fas fa-edit mr-2'
                                    }),
                                    $('<span/>', {
                                        'text': EALang.edit
                                    })
                                ]
                            })
                        ]
                    }) : ''
                ]
            });

        } else {
            displayEdit = (GlobalVariables.user.privileges.appointments.edit === true && showActions === true) ? 'mr-2' : 'd-none';
            displayDelete = (GlobalVariables.user.privileges.appointments.delete === true && showActions === true) ? 'mr-2' : 'd-none';

            $html = $('<div/>', {
                'html': [
                    $('<strong/>', {
                        'class': 'd-inline-block mr-2',
                        'text': EALang.start
                    }),
                    $('<span/>', {
                        'text': GeneralFunctions.formatDate(event.start, GlobalVariables.dateFormat, true)
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block mr-2',
                        'text': EALang.end
                    }),
                    $('<span/>', {
                        'text': GeneralFunctions.formatDate(event.end, GlobalVariables.dateFormat, true)
                    }),
                    $('<br/>'),
                    $('<strong/>', {
                        'class': 'd-inline-block mr-2',
                        'text': EALang.service
                    }),
                    $('<span/>', {
                        'text': event.extendedProps.data.service.name
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block mr-2',
                        'text': EALang.provider
                    }),
                    GeneralFunctions.renderMapIcon(event.extendedProps.data.provider),
                    $('<span/>', {
                        'text': event.extendedProps.data.provider.first_name + ' ' + event.extendedProps.data.provider.last_name
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block mr-2',
                        'text': EALang.customer
                    }),
                    GeneralFunctions.renderMapIcon(event.extendedProps.data.customer),
                    $('<span/>', {
                        'class': 'd-inline-block ml-1',
                        'text': event.extendedProps.data.customer.first_name + ' ' + event.extendedProps.data.customer.last_name
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block mr-2',
                        'text': EALang.email
                    }),
                    GeneralFunctions.renderMailIcon(event.extendedProps.data.customer.email),
                    $('<span/>', {
                        'class': 'd-inline-block ml-1',
                        'text': event.extendedProps.data.customer.email
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block mr-2',
                        'text': EALang.phone
                    }),
                    GeneralFunctions.renderPhoneIcon(event.extendedProps.data.customer.phone_number),
                    $('<span/>', {
                        'class': 'd-inline-block ml-1',
                        'text': event.extendedProps.data.customer.phone_number
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block mr-2',
                        'text': EALang.notes
                    }),
                    $('<span/>', {
                        'text': getEventNotesExcerpt(event.extendedProps.data.notes, 100, '-')
                    }),
                    $('<br/>'),

                    showActions ? $('<hr/>') : '',

                    showActions ? $('<div/>', {
                        'class': 'd-flex justify-content-center',
                        'html': [
                            $('<button/>', {
                                'class': 'close-popover btn btn-outline-secondary mr-2',
                                'html': [
                                    $('<i/>', {
                                        'class': 'fas fa-ban mr-2'
                                    }),
                                    $('<span/>', {
                                        'text': EALang.close
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'class': 'delete-popover btn btn-danger ' + displayDelete,
                                'html': [
                                    $('<i/>', {
                                        'class': 'fas fa-trash-alt mr-2'
                                    }),
                                    $('<span/>', {
                                        'text': EALang.delete
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'class': 'edit-popover btn btn-primary ' + displayEdit,
                                'html': [
                                    $('<i/>', {
                                        'class': 'fas fa-edit mr-2'
                                    }),
                                    $('<span/>', {
                                        'text': EALang.edit
                                    })
                                ]
                            })
                        ]
                    }) : ''
                ]
            });
        }
        return $html;
    }

    function displayEventPopup(eventInfo) {
        $('.popover').popover('dispose'); // Close all open popovers.

        $(eventInfo.jsEvent.target).popover({
            placement: 'top',
            title: eventInfo.event.title,
            content: getEventPopupHtml(eventInfo),
            html: true,
            container: '#calendar',
            trigger: eventInfo.jsEvent.type == 'mouseover' ? 'hover' : 'manual'
        });

        $(eventInfo.jsEvent.target).popover('toggle');

        // Fix popover position.
        if ($('.popover').length > 0 && $('.popover').position().top < 200) {
            $('.popover').css('top', '200px');
        }
    }

    function calendarEventHover(eventInfo) {
        if (lastFocusedEventData != null) {
            return;
        }
        if (eventInfo.event.groupId == 'workingplan') {
            return;
        }
        displayEventPopup(eventInfo);
    }

    /**
     * Calendar Event "Click" Callback
     *
     * When the user clicks on an appointment object on the calendar, then a data preview popover is display
     * above the calendar item.
     */
    function calendarEventClick(eventClickInfo) {
        lastFocusedEventData = eventClickInfo.event;
        displayEventPopup(eventClickInfo);
    }

    /**
     * Calendar Event "Resize" Callback
     *
     * The user can change the duration of an event by resizing an appointment object on the calendar. This
     * change needs to be stored to the database too and this is done via an ajax call.
     *
     * @see updateAppointmentData()
     */
    function calendarEventResize(eventInfo) {
        if (GlobalVariables.user.privileges.appointments.edit === false) {
            eventInfo.revert();
            Backend.displayNotification(EALang.no_privileges_edit_appointments);
            return;
        }

        var successCallback;

        if ($('#notification').is(':visible')) {
            $('#notification').hide('bind');
        }

        var eventData = eventInfo.event.extendedProps.data;

        if (Boolean(Number(eventData.is_unavailable)) === false) {
            // Prepare appointment data.
            eventData.end_datetime = eventInfo.event.end.toString('yyyy-MM-dd HH:mm:ss');

            var appointment = GeneralFunctions.clone(eventData);

            // Must delete the following because only appointment data should be provided to the AJAX call.
            delete appointment.customer;
            delete appointment.provider;
            delete appointment.service;

            // Success callback
            successCallback = function () {
                // Display success notification to user.
                var undoFunction = function () {
                    appointment.end_datetime = eventInfo.oldEvent.end.toString('yyyy-MM-dd HH:mm:ss');

                    var url = GlobalVariables.baseUrl + '/index.php/backend_api/ajax_save_appointment';

                    var data = {
                        csrfToken: GlobalVariables.csrfToken,
                        appointment_data: JSON.stringify(appointment)
                    };

                    $.post(url, data)
                        .done(function () {
                            $('#notification').hide('blind');
                        });

                    eventInfo.revert();
                };

                Backend.displayNotification(EALang.appointment_updated, [
                    {
                        'label': EALang.undo,
                        'function': undoFunction
                    }
                ]);
                $('#footer').css('position', 'static'); // Footer position fix.

                // Update the event data for later use.
                eventInfo.event.setExtendedProp('data', eventData)
            };

            // Update appointment data.
            BackendCalendarApi.saveAppointment(appointment, null, successCallback);
        } else {
            // Update unavailable time period.
            var unavailable = {
                id: eventData.id,
                start_datetime: eventInfo.event.start.toString('yyyy-MM-dd HH:mm:ss'),
                end_datetime: eventInfo.event.end.toString('yyyy-MM-dd HH:mm:ss'),
                id_users_provider: eventData.id_users_provider
            };

            // eventInfo.event.extendedProps.data.end_datetime = unavailable.end_datetime;

            // Define success callback function.
            successCallback = function () {
                // Display success notification to user.
                var undoFunction = function () {
                    unavailable.end_datetime = eventInfo.oldEvent.end.toString('yyyy-MM-dd HH:mm:ss');

                    var url = GlobalVariables.baseUrl + '/index.php/backend_api/ajax_save_unavailable';

                    var data = {
                        csrfToken: GlobalVariables.csrfToken,
                        unavailable: JSON.stringify(unavailable)
                    };

                    $.post(url, data)
                        .done(function () {
                            $('#notification').hide('blind');
                        });

                    eventInfo.revert();
                };

                Backend.displayNotification(EALang.unavailable_updated, [
                    {
                        'label': EALang.undo,
                        'function': undoFunction
                    }
                ]);

                $('#footer').css('position', 'static'); // Footer position fix.

                // Update the event data for later use.
                // eventInfo.event.setExtendedProp('data', eventData)
            };

            BackendCalendarApi.saveUnavailable(unavailable, successCallback, null);
        }
    }

    /**
     * Calendar Window "Resize" Callback
     *
     * The calendar element needs to be re-sized too in order to fit into the window. Nevertheless, if the window
     * becomes very small the the calendar won't shrink anymore.
     *
     * @see getCalendarHeight()
     */
    function calendarWindowResize(view) {
        fullcalendar.setOption('height', getCalendarHeight());
    }

    /**
     * Calendar Event "Drop" Callback
     *
     * This event handler is triggered whenever the user drags and drops an event into a different position
     * on the calendar. We need to update the database with this change. This is done via an ajax call.
     *
     * @param {object} eventInfo
     */
    function calendarEventDrop(eventInfo) {
        if (GlobalVariables.user.privileges.appointments.edit === false) {
            eventInfo.revert();
            Backend.displayNotification(EALang.no_privileges_edit_appointments);
            return;
        }

        if ($('#notification').is(':visible')) {
            $('#notification').hide('bind');
        }

        var successCallback;

        var event = eventInfo.event;

        if (event.extendedProps.data.is_unavailable === '0') {
            // Prepare appointment data.
            var appointment = GeneralFunctions.clone(event.extendedProps.data);

            // Must delete the following because only appointment data should be provided to the ajax call.
            delete appointment.customer;
            delete appointment.provider;
            delete appointment.service;

            appointment.start_datetime = eventInfo.event.start.toString('yyyy-MM-dd HH:mm:ss');
            appointment.end_datetime = eventInfo.event.end.toString('yyyy-MM-dd HH:mm:ss');

            event.extendedProps.data.start_datetime = appointment.start_datetime;
            event.extendedProps.data.end_datetime = appointment.end_datetime;

            // Define success callback function.
            successCallback = function () {
                // Define the undo function, if the user needs to reset the last change.
                var undoFunction = function () {
                    appointment.start_datetime = eventInfo.oldEvent.start.toString('yyyy-MM-dd HH:mm:ss');
                    appointment.end_datetime = eventInfo.oldEvent.end.toString('yyyy-MM-dd HH:mm:ss');

                    event.extendedProps.data.start_datetime = appointment.start_datetime;
                    event.extendedProps.data.end_datetime = appointment.end_datetime;

                    var url = GlobalVariables.baseUrl + '/index.php/backend_api/ajax_save_appointment';

                    var data = {
                        csrfToken: GlobalVariables.csrfToken,
                        appointment_data: JSON.stringify(appointment)
                    };

                    $.post(url, data)
                        .done(function () {
                            $('#notification').hide('blind');
                        });

                    eventInfo.revert();
                };

                Backend.displayNotification(EALang.appointment_updated, [
                    {
                        'label': EALang.undo,
                        'function': undoFunction
                    }
                ]);

                $('#footer').css('position', 'static'); // Footer position fix.
            };

            // Update appointment data.
            BackendCalendarApi.saveAppointment(appointment, null, successCallback);
        } else {
            // Update unavailable time period.
            var unavailable = {
                id: event.extendedProps.data.id,
                start_datetime: event.start.toString('yyyy-MM-dd HH:mm:ss'),
                end_datetime: event.end.toString('yyyy-MM-dd HH:mm:ss'),
                id_users_provider: event.extendedProps.data.id_users_provider
            };

            successCallback = function () {
                var undoFunction = function () {
                    unavailable.start_datetime = eventInfo.oldEvent.start.toString('yyyy-MM-dd HH:mm:ss');
                    unavailable.end_datetime = eventInfo.oldEvent.end.toString('yyyy-MM-dd HH:mm:ss');

                    event.extendedProps.data.start_datetime = unavailable.start_datetime;
                    event.extendedProps.data.end_datetime = unavailable.end_datetime;

                    var url = GlobalVariables.baseUrl + '/index.php/backend_api/ajax_save_unavailable';
                    var data = {
                        csrfToken: GlobalVariables.csrfToken,
                        unavailable: JSON.stringify(unavailable)
                    };

                    $.post(url, data)
                        .done(function () {
                            $('#notification').hide('blind');
                        });

                    eventInfo.revert();
                };

                Backend.displayNotification(EALang.unavailable_updated, [
                    {
                        label: EALang.undo,
                        function: undoFunction
                    }
                ]);

                $('#footer').css('position', 'static'); // Footer position fix.
            };

            BackendCalendarApi.saveUnavailable(unavailable, successCallback);
        }
    }

    /**
     * Calendar "View Render" Callback
     *
     * Whenever the calendar changes or refreshes its view certain actions need to be made, in order to
     * display proper information to the user.
     */
    function calendarViewRender() {
        if ($('#select-filter-item').val() === null) {
            return;
        }

        refreshCalendarAppointments();

        $(window).trigger('resize'); // Places the footer on the bottom.

        // Remove all open popovers.
        $('.close-popover').each(function (index, closePopoverButton) {
            $(closePopoverButton).parents('.popover').popover('dispose');
        });
        lastFocusedEventData = null;

        // Add new pop overs.
        $('.fv-events').each(function (index, eventElement) {
            $(eventElement).popover();
        });
    }

    /**
     * Convert titles to HTML
     *
     * On some calendar events the titles contain html markup that is not displayed properly due to the
     * FullCalendar plugin. This plugin sets the .fc-event-title value by using the $.text() method and
     * not the $.html() method. So in order for the title to display the html properly we convert all the
     * .fc-event-titles where needed into html.
     */
    function convertTitlesToHtml() {
        // Convert the titles to html code.
        $('.fc-custom').each(function (index, customEventElement) {
            var title = $(customEventElement).find('.fc-event-title').text();
            $(customEventElement).find('.fc-event-title').html(title);
            var time = $(customEventElement).find('.fc-event-time').text();
            $(customEventElement).find('.fc-event-time').html(time);
        });
    }

    /**
     * Refresh Calendar Appointments
     *
     * This method reloads the registered appointments for the selected date period and filter type.
     *
     * @param {Object} $calendar The calendar jQuery object.
     * @param {Number} recordId The selected record id.
     * @param {String} filterType The filter type, could be either FILTER_TYPE_PROVIDER or FILTER_TYPE_SERVICE.
     * @param {Date} startDate Visible start date of the calendar.
     * @param {Date} endDate Visible end date of the calendar.
     */
    function refreshCalendarAppointments() {
        if ($('#select-filter-item').val() === null) {
            return;
        }
        var $selectFilterItem = $('#select-filter-item');
        var recordId = $selectFilterItem.val();
        var filterType = $selectFilterItem.find('option:selected').attr('type');

        var url = GlobalVariables.baseUrl + '/index.php/backend_api/ajax_get_calendar_appointments';

        var startDate = fullcalendar.view.activeStart.toString('yyyy-MM-dd');
        var endDate = fullcalendar.view.activeEnd.toString('yyyy-MM-dd');

        var data = {
            csrfToken: GlobalVariables.csrfToken,
            record_id: recordId,
            start_date: startDate,
            end_date: endDate,
            filter_type: filterType
        };

        $('#loading').css('visibility', 'hidden');

        return $.post(url, data)
            .done(function (response) {

                fullcalendar.removeAllEvents();


                var appointmentEvents = [];
                var notes;

                // Add workingplan to calendar.
                // TODO: define workinplan by day
                var wpEvent = [
                    {
                        groupId: 'workingplan',
                        startTime: workingPlan.monday.start,
                        endTime: workingPlan.monday.end,
                        display: 'inverse-background',
                        color: 'grey',
                        editable: false,
                        selectable: false,
                        daysOfWeek: [1, 2, 3, 4, 5]
                    }
                ];
                fullcalendar.addEventSource(wpEvent);

                // Add appointments to calendar.
                response.appointments.forEach(function (appointment) {
                    notes = getEventNotesExcerpt(appointment.notes, 30);
                    notes = notes ? ' - ' + notes : '';

                    var appointmentEvent = {
                        id: appointment.id,
                        title: appointment.customer.first_name + ' ' + appointment.customer.last_name + notes,
                        start: appointment.start_datetime,
                        end: appointment.end_datetime,
                        allDay: false,
                        // display: 'background',
                        color: appointment.service.color,
                        data: appointment // Store appointment data for later use.
                    };

                    appointmentEvents.push(appointmentEvent);
                });
                fullcalendar.addEventSource(appointmentEvents);

                // Add custom unavailable periods
                var unavailabilityEvents = [];
                response.unavailables.forEach(function (unavailable) {
                    notes = getEventNotesExcerpt(unavailable.notes, 30);
                    notes = notes ? ' - ' + notes : '';

                    var unavailabilityEvent = {
                        title: EALang.unavailable + notes,
                        start: unavailable.start_datetime,
                        end: unavailable.end_datetime,
                        allDay: false,
                        color: '#879DB4',
                        editable: true,
                        className: 'fc-unavailable fc-custom',
                        data: unavailable
                    };

                    unavailabilityEvents.push(unavailabilityEvent);
                });

                fullcalendar.addEventSource(unavailabilityEvents);
            })
            .always(function () {
                $('#loading').css('visibility', '')
            });
    }

    function getHour(time) {
        return parseInt(time.split(':')[0]);
    }


    exports.initialize = function () {
        GlobalVariables.systemSettings.forEach(function (setting) {
            if (setting.name === 'company_working_plan') {
                workingPlan = $.parseJSON(setting.value);
            }
        });

        var defaultView = window.innerWidth < 600 ? 'listDay' : 'timeGridWorkWeek';
        var viewList = window.innerWidth < 600 ? 'listDay,timeGridDay,dayGridMonth' : 'timeGridWorkWeek,timeGridWeek,dayGridMonth';

        var slotStart = (getHour(workingPlan.monday.start) - 1) + ':00:00';
        var slotEnd = (getHour(workingPlan.monday.end) + 1) + ':00:00';

        var calendarEl = document.getElementById('calendar');
        fullcalendar = new FullCalendar.Calendar(calendarEl, {
            initialView: defaultView,
            height: getCalendarHeight(),
            locale: 'fr', // the initial locale
            nowIndicator: true,
            allDaySlot: false,
            slotDuration: '00:' + GlobalVariables.calendarTimeslot + ':00',
            slotMinTime: slotStart,
            slotMaxTime: slotEnd,
            scrollTime: (new Date()).getHours() - 1 + ':00:00',
            editable: true,
            displayEventEnd: false,
            eventDisplay: 'block',
            weekNumbers: true,
            weekNumberFormat: { week: 'numeric' },
            headerToolbar: {
                start: 'prev,next today',
                center: 'title',
                end: viewList
            },
            views: {
                timeGridDay: {
                    displayEventTime: false
                },
                timeGridWorkWeek: {
                    type: 'timeGridWeek',
                    weekends: false,
                    buttonText: '5 jours',
                    displayEventTime: false
                },
                timeGridWeek: {
                    displayEventTime: false
                }
            },

            selectable: true,

            select: onCalendarSelect,

            // Calendar events need to be declared on initialization.
            windowResize: calendarWindowResize,
            datesSet: calendarViewRender,
            eventClick: calendarEventClick,
            eventMouseEnter: calendarEventHover,
            eventResize: calendarEventResize,
            eventDrop: calendarEventDrop,
            // eventAfterAllRender: convertTitlesToHtml
        });
        fullcalendar.render();

        // Trigger once to set the proper footer position after calendar initialization.
        calendarWindowResize();

        // Fill the select list boxes of the page.
        if (GlobalVariables.availableProviders.length > 0) {
            $('<optgroup/>', {
                'label': EALang.providers,
                'type': 'providers-group',
                'html': GlobalVariables.availableProviders.map(function (availableProvider) {

                    return $('<option/>', {
                        'value': availableProvider.id,
                        'type': FILTER_TYPE_PROVIDER,
                        'text': availableProvider.first_name + ' ' + availableProvider.last_name
                    })
                })
            })
                .appendTo('#select-filter-item');
        }

        if (GlobalVariables.availableServices.length > 0) {
            $('<optgroup/>', {
                'label': EALang.services,
                'type': 'services-group',
                'html': GlobalVariables.availableServices.map(function (availableService) {
                    return $('<option/>', {
                        'value': availableService.id,
                        'type': FILTER_TYPE_SERVICE,
                        'text': availableService.name
                    })
                })
            })
                .appendTo('#select-filter-item');
        }

        // Check permissions.
        if (GlobalVariables.user.role_slug === Backend.DB_SLUG_PROVIDER) {
            $('#select-filter-item optgroup:eq(0)')
                .find('option[value="' + GlobalVariables.user.id + '"]')
                .prop('selected', true);
            $('#select-filter-item').prop('disabled', true);
        }

        if (GlobalVariables.user.role_slug === Backend.DB_SLUG_SECRETARY) {
            // Remove the providers that are not connected to the secretary.
            $('#select-filter-item optgroup:eq(1)').remove();

            $('#select-filter-item option[type="provider"]').each(function (index, option) {
                var provider = GlobalVariables.secretaryProviders.find(function (secretaryProviderId) {
                    return Number($(option).val()) === Number(secretaryProviderId);
                });

                if (!provider) {
                    $(option).remove();
                }
            });

            if (!$('#select-filter-item option[type="provider"]').length) {
                $('#select-filter-item optgroup[type="providers-group"]').remove();
            }
        }

        // Bind the default event handlers.
        bindEventHandlers();

        $('#select-filter-item').trigger('change');

        // Display the edit dialog if an appointment hash is provided.
        if (GlobalVariables.editAppointment) {
            var $dialog = $('#manage-appointment');
            var appointment = GlobalVariables.editAppointment;
            BackendCalendarAppointmentsModal.resetAppointmentDialog();

            $dialog.find('.modal-header h3').text(EALang.edit_appointment_title);
            $dialog.find('#appointment-id').val(appointment.id);
            $dialog.find('#select-service').val(appointment.id_services).trigger('change');
            $dialog.find('#select-provider').val(appointment.id_users_provider);

            // Set the start and end datetime of the appointment.
            var startDatetime = Date.parseExact(appointment.start_datetime, 'yyyy-MM-dd HH:mm:ss');
            $dialog.find('#start-datetime').datetimepicker('setDate', startDatetime);

            var endDatetime = Date.parseExact(appointment.end_datetime, 'yyyy-MM-dd HH:mm:ss');
            $dialog.find('#end-datetime').datetimepicker('setDate', endDatetime);

            var customer = appointment.customer;
            $dialog.find('#customer-id').val(appointment.id_users_customer);
            $dialog.find('#first-name').val(customer.first_name);
            $dialog.find('#last-name').val(customer.last_name);
            $dialog.find('#email').val(customer.email);
            $dialog.find('#phone-number').val(customer.phone_number);
            $dialog.find('#address').val(customer.address);
            $dialog.find('#city').val(customer.city);
            $dialog.find('#zip-code').val(customer.zip_code);
            $dialog.find('#appointment-location').val(appointment.location);
            $dialog.find('#appointment-notes').val(appointment.notes);
            $dialog.find('#customer-notes').val(customer.notes);

            $dialog.modal('show');
        }

        if (!$('#select-filter-item option').length) {
            $('#calendar-actions button').prop('disabled', true);
        }

        // Fine tune the footer's position only for this page.
        if (window.innerHeight < 700) {
            $('#footer').css('position', 'static');
        }

        // Automatically refresh the calendar page every 10 seconds (without loading animation).
        setInterval(function () {
            refreshCalendarAppointments();
        }, 60000);
    };

})(window.BackendCalendarDefaultView);
