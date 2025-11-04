  # Hapio Booking System - Complete API Documentation
 
 
  HAPIO BOOKING SYSTEM - COMPLETE API DOCUMENTATION
  Base URL: http://localhost:4012/booking_system
 
 
 
  ====================================================================================
  📘 BOOKINGS MODULE
  ====================================================================================
 
  1️⃣ Create Booking
  Endpoint: POST /createBookings
  Description: Creates a new booking for a resource and service.
 
  Request Body:
  {
    "resource_id": "<resource_id>",
    "service_id": "<service_id>",
    "location_id": "<location_id>",
    "price": "120.000",
    "customer_id": "<customer_id>",
    "customer_name": "John Doe",
    "starts_at": "2025-10-30T09:00:00+08:00",
    "ends_at": "2025-10-30T10:00:00+08:00"
  }
 
  Response Example (200):
  {
    "id": "<booking_id>"
  }
 
  Error Codes: 400, 422, 500
 
  ------------------------------------------------------------
  2️⃣ View All Bookings
  Endpoint: GET /viewAllBookings
  Description: Retrieves all bookings in the system.
  Response: Array of booking objects.
 
  ------------------------------------------------------------
  3️⃣ View Booking by ID
  Endpoint: GET /viewBooking/<booking_id>
  Description: Retrieves a single booking by ID.
 
  ------------------------------------------------------------
  4️⃣ Filter Bookings
  Endpoint: GET /viewFilteredBookings?resource_id=<resource_id>&service_id=<service_id>&location_id=<location_id>
  Description: Filters bookings by resource, service, or location.
 
  ------------------------------------------------------------
  5️⃣ Update Booking
  Endpoint: PATCH /updateBooking/<booking_id>
  Description: Updates booking start or end time before it begins.
 
  Request Body Example (200):
 
  {
    "starts_at": "2025-10-29T12:15:00+08:00",
    "ends_at": "2025-10-29T13:15:00+08:00"
  }
 
  or
  {
    "starts_at": "2025-10-29T12:15:00+08:00"
  }
  or
 
  {
    "ends_at": "2025-10-29T13:15:00+08:00"
  }
  or
  {
    "starts_at": "2025-10-29T12:15:00+08:00",
    "ends_at": "2025-10-29T13:15:00+08:00",
    "price": "10.000"
  }
  or
  {
    "price": "10.000"
  }
  or
  {
    "starts_at": "2025-10-29T12:15:00+08:00",
    "price": "10.000"
  }
  or
  {
    "ends_at": "2025-10-29T13:15:00+08:00",
    "price": "10.000"
  }
 
  ------------------------------------------------------------
  6️⃣ Delete Booking
  Endpoint: DELETE /deleteBooking/<booking_id>
  Description: Deletes a booking by its ID.
 
 
 
 
 
 
 
  ====================================================================================
  📘 RESOURCE MODULE
  ====================================================================================
 
  1️⃣ Create Resource
  Endpoint: POST  /createResource
  Description: Creates a resource (auto setup with Limitations).
 
  Request Body example:
  {
    "defined_timings": [
      { "weekday": "monday", "start_time": "09:00:00", "end_time": "12:00:00" },
      { "weekday": "monday", "start_time": "14:00:00", "end_time": "18:00:00" },
      { "weekday": "tuesday", "start_time": "09:00:00", "end_time": "17:00:00" },
      { "weekday": "wednesday", "start_time": "09:00:00", "end_time": "17:00:00" },
      { "weekday": "thursday", "start_time": "09:00:00", "end_time": "17:00:00" },
      { "weekday": "friday", "start_time": "09:00:00", "end_time": "17:00:00" }
    ],
    "max_duration": "PT10H",
    "min_duration": "PT1H",
    "duration_interval": "PT15M",
    "resource_name": "Conference Room A",
    "start_date": "2025-10-20",
    "photo_url": "https://example.com/images/conference-room-a.jpg",
    "capacity": 10,
    "resource_details": {
      "description": "Large conference room with modern amenities"
    },
    "email_confirmation": true,
    "resource_plans": [
      { "plan_name": "Innobuddies"},
      { "plan_name": "InnoPeers" }
    ],
    "category": "meeting_room",
    "location_id": "g1PhBs8LucuZrpXXOVfwIdzXcFdpvwazyMupP9iH9e59ca39",
    "rates": [
      {
        "price_name": "Standard Hourly Rate",
        "description": "Basic hourly rate for conference room usage",
        "price": 50.000,
        "renewal_type": "every hour"
      },
      {
        "price_name": "Daily Package",
        "description": "Full day access with all amenities included",
        "price": 300.000,
        "renewal_type": "every day"
      }
    ]
  }
 
 
  Response:
  { "message": "Resource created successfully", "resource_id": "<resource_id>" }
 
  ------------------------------------------------------------
  2️⃣ View All Resources
  Endpoint: GET /viewAllresources
  Description: Lists all resources.
  Response 200
  [
    {
      "id": "res_x",
      "name": "Room A",
      "metadata": { ... }
    },
    ...
  ]
 
  ------------------------------------------------------------
  3️⃣ View Resource by Name
  Endpoint: GET /viewResource/<resource_name>
  Description: Retrieves resource details by name.
  Response 200
  {
    "data": {
      "id": "res_x",
      "name": "Conference Room A",
      "metadata": { ... }
    }
  }
 
  ------------------------------------------------------------
  <!-- 4️⃣ Get Resource Info
  Endpoint: GET /getResourceByName/<resource_name>
  Description: Fetches processed details (id, category, capacity, etc.)
  Response 200
  {
    "id": "res_x",
    "name": "Conference Room A",
    "location_id": "<location_id>",
    "metadata": { ... }
  } -->
  ------------------------------------------------------------
  5️⃣ Resource Schedule Info - for a weekday
  Endpoint: GET /getResourceScheduleInfo/<resource_name>?weekday=<weekday>
  Description: Retrieves full schedule (recurring + blocks). Returns combined resource + schedule info. Optional weekday query filters to a single weekday.
  Retrieves the details of a weekday in resource.
 
  Response 200
  {
    "resource": { ... },
    "recurring_schedule": { ... },
    "weekday_block": { ... }
  }
 
  ------------------------------------------------------------
  6️⃣ All Schedule Blocks
  Endpoint: GET /getAllResourceScheduleBlocks/<resource_name>
  Description: Retrieves all schedule blocks grouped by weekday.
  Response 200
  { "monday":[...], "tuesday":[...], ... }
 
  ------------------------------------------------------------
  7️⃣ Weekly Schedule
  Endpoint: GET /getResourceWeeklySchedule/<resource_name>
  Description: Retrieves summarized weekly schedule.
  Response 200
  { ...weekly schedule object... }
 
  ------------------------------------------------------------
  8️⃣ Delete Resource
  Endpoint: DELETE /deleteResource/<resource_id>
  Response 200
  { "message": "Resource deleted successfully" }
 
 
 
 
 
  ====================================================================================
  RECURRING SCHEDULES
  ====================================================================================
 
  ------------------------------------------------------------
  4️⃣ Get Recurring Schedule
  Endpoint: GET /getRecurringSchedule/<resource_id>
  Get recurring schedules for a resource (returns first schedule object in helpers).
  Response 200
  {
    "id":"recurring_schedule_id",
    "resource_id":"...",
    "start_date":"2025-10-01",
    "end_date":null
  }
 
  ------------------------------------------------------------
  5️⃣ Get Schedule Block by weekday
  Endpoint: GET /getScheduleBlock/<resource_id>/<recurring_schedule_id>/<weekday>
  Get the schedule block for a given weekday under a recurring schedule.
  Response 200
  {
    "id":"block_abc",
    "weekday":"monday",
    "start_time":"09:00",
    "end_time":"17:00"
  }
  ------------------------------------------------------------
  6️⃣ Get Schedule Block ID
  Endpoint: GET /getScheduleBlockId/<resource_name>/<weekday>
  Lookup schedule block id by resource name and weekday (helper that chains resource->recurringSchedule->block lookup).
  Response 200
  { "resource_name": "Conference Room A", "weekday": "monday", "schedule_block_id":"id" }
  ------------------------------------------------------------
  7️⃣ Get All Schedule Blocks by Weekday
  Endpoint: GET /getAllResourceScheduleBlocks/<resource_name>
  Returns schedule blocks for resource organized by weekday.
  Response 200
  { "monday":[...], "tuesday":[...], ... }
 
  ------------------------------------------------------------
  8️⃣ Create New Schedule Blocks (Add New Days like Saturday/Sunday)
 
  Endpoint:
  POST /booking_system/createScheduleBlocks/:resource_id/:recurring_schedule_id
 
  Description:
  Creates one or more non-overlapping schedule blocks for an existing recurring schedule.
  Use this when you want to add new weekdays (like Saturday or Sunday) or add additional time slots to existing weekdays.
 
  This endpoint can safely be used after resource creation to extend or modify your schedule.
 
  Request Parameters (Path):
 
  Name  Type  Required  Description
  resource_id string  ✅ The ID of the resource
  recurring_schedule_id string  ✅ The ID of the recurring schedule to which blocks are added
 
  Request Body (JSON):
 
  {
    "blocks": [
      {
        "weekday": "monday",
        "start_time": "09:00:00",
        "end_time": "12:00:00"
      },
      {
        "weekday": "monday",
        "start_time": "13:00:00",
        "end_time": "17:00:00"
      },
      {
        "weekday": "tuesday",
        "start_time": "10:00:00",
        "end_time": "16:00:00"
      }
    ]
  }
 
 
 
  ✅ Notes:
 
  blocks must be an array.
 
  Each block must contain:
 
  weekday — one of monday to sunday
 
  start_time — 24-hour format (HH:MM:SS)
 
  end_time — 24-hour format (HH:MM:SS)
 
  Blocks on the same day must not overlap.
 
  You can create multiple blocks for the same weekday in a single request.
 
  Response Example (201):
 
  {
    "message": "Schedule blocks created successfully",
    "data": {
      "status": 201,
      "created_blocks": [
        {
          "weekday": "saturday",
          "start_time": "09:00:00",
          "end_time": "17:00:00",
          "id": "block_123"
        },
        {
          "weekday": "sunday",
          "start_time": "10:00:00",
          "end_time": "16:00:00",
          "id": "block_124"
        }
      ]
    }
  }
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
  ====================================================================================
  📘 UPDATE MODULE
  ====================================================================================
 
  1️⃣ Update Resource
  Endpoint: PUT /updateResource/<resource_id>
  Description: Update resource fields (forwards to Hapio via helper). Fields accepted are the same as createResource (partial accepted).
  Request JSON (partial/any):
  {
    "name": "A (Updated)",
    "capacity": 15,
    "metadata": {
      "photo_url": "https://example.com/images/updated-room.jpg",
      "resource_details": {
        "description": "Updated room with new AV equipment and extended space.!!!!"
      },
      "email_confirmation": false,
      "rates": [
        {
          "price_name": "Standard Hourly Rate - update",
          "description": "Updated hourly rate after renovation",
          "price": 30,
          "renewal_type": "every hour"
        }
      ]
    },
    "max_duration": "PT12H",
    "min_duration": "PT30M",
    "duration_interval": "PT30M",
    "defined_timings": [
      { "weekday": "monday", "start_time": "09:00:00", "end_time": "17:00:00" },
      { "weekday": "tuesday", "start_time": "09:00:00", "end_time": "17:00:00" }
    ]
  }
 
  Response 200
  { "message": "Resource updated successfully", "data": { ... } }
 
 
 
 
  Note:
 
  -------------------------------------------------------------------------------
 
 
  2️⃣ Get Service
 
  Endpoint: GET /getService/<service_id>
  Description:
  Retrieves the specified service directly from the Hapio API.
  Includes pricing, duration, buffer times, booking window, and metadata.
 
  Request:
  Path Parameter:
  service_id (string, required) – UUID of the service
 
  Response 200 Example:
 
  {
    "id": "14c61826-8fb3-415b-80ae-c54d159b0d57",
    "name": "The First Service",
    "price": "149.000",
    "type": "fixed",
    "duration": "PT1H",
    "bookable_interval": "PT10M",
    "buffer_time_before": "PT10M",
    "buffer_time_after": "PT5M",
    "booking_window_start": "PT2H",
    "booking_window_end": "P60D",
    "cancelation_threshold": "PT24H",
    "enabled": true,
    "created_at": "2021-01-30T16:45:42+00:00",
    "updated_at": "2021-01-30T16:52:19+00:00"
  }
 
  ------------------------------------------------------------
  3️⃣ Get Service ID by Resource
  Endpoint: POST /getServiceIdbyResourceId
 
  Request:
  { "resource_id": "<resource_id>" }
  Response:
  <service_id>
 
  ------------------------------------------------------------
  4️⃣ Update Schedule Block
  Endpoint:
  PUT /booking_system/updateScheduleBlock/:resource_id/:recurring_schedule_id/:schedule_block_id
 
  Description:
  Updates a single schedule block or splits it into multiple non-overlapping blocks.
  Internally, this calls the Hapio API route:
  PUT /resources/{resource_id}/recurring-schedules/{recurring_schedule_id}/schedule-blocks/{schedule_block_id}
  —but the frontend only talks to your Express route.
 
  Request Body Example:
 
  {
    "weekday": "monday",
    "newBlocks": [
      { "start_time": "09:00:00", "end_time": "12:00:00" },
      { "start_time": "14:00:00", "end_time": "18:00:00" }
    ]
  }
 
 
  Response Example (200):
 
  {
    "status": 200,
    "message": "Schedule block updated successfully",
    "data": [
      {
        "id": "block_1",
        "weekday": "monday",
        "start_time": "09:00:00",
        "end_time": "12:00:00"
      },
      {
        "id": "block_2",
        "weekday": "monday",
        "start_time": "14:00:00",
        "end_time": "18:00:00"
      }
    ]
  }
 
  ------------------------------------------------------------
  5️⃣ Bulk Update Schedule Blocks
  Bulk Update Schedule Blocks
 
  Endpoint:
  PATCH /booking_system/updateBulkScheduleBlocks/:resource_id/:recurring_schedule_id
 
  Description:
  Updates multiple schedule blocks in one request.
  Automatically continues updating even if some blocks fail due to overlaps.
 
  Request Body Example:
 
  {
    "scheduleBlocks": [
      {
        "schedule_block_id": "block_1",
        "weekday": "monday",
        "newBlocks": [
          { "start_time": "09:00:00", "end_time": "12:00:00" },
          { "start_time": "13:00:00", "end_time": "18:00:00" }
        ]
      },
      {
        "schedule_block_id": "block_2",
        "weekday": "tuesday",
        "newBlocks": [
          { "start_time": "10:00:00", "end_time": "17:00:00" }
        ]
      }
    ]
  }
 
 
  Response Example (200):
 
  {
    "message": "Bulk recurring schedule block update completed.",
    "results": [
      {
        "success": true,
        "schedule_block_id": "block_1",
        "weekday": "monday",
        "message": "Updated successfully."
      },
      {
        "success": true,
        "schedule_block_id": "block_2",
        "weekday": "tuesday",
        "message": "Updated successfully."
      },
      {
        "success": false,
        "weekday": "wednesday",
        "skipped": true,
        "reason": "Overlapping schedule block (422)"
      }
    ]
  }
 
 
  ------------------------------------------------------------
  6️⃣ Delete Schedule Block
 
  Endpoint:
  DELETE /booking_system/deleteScheduleBlock/:resource_id/:recurring_schedule_id :schedule_block_id
 
  Description:
  Deletes a specific recurring schedule block for a resource.
  This permanently removes the schedule block from the resource’s recurring schedule.
  Deletion cannot be undone.
 
  Path Parameters:
 
  Name  Type  Required  Description
  resource_id string  ✅ The ID of the resource
  recurring_schedule_id string  ✅ The ID of the recurring schedule
  schedule_block_id string  ✅ The ID of the schedule block to delete
 
  Request Example:
 
  DELETE /booking_system/deleteScheduleBlock/0437c688-1715-4550-8f57-4ffaeacb8177/04e3b221-f1d0-4ecb-89c9-f75bd98224d6/806eae73-f40c-437b-8f7a-14d2b57d7334
 
 
  No request body required.
 
  Response Example (200):
 
  {
    "message": "Schedule block deleted successfully",
    "data": {
      "status": 204,
      "message": "No Content"
    }
  }
 
 
  ====================================================================================
  📘 VIEW MODULE
  ====================================================================================
 
  1️⃣ View Service by ID
  Endpoint: GET /viewServiceByServiceId/<service_id>
 
  ====================================================================================
  📘 COMMON ERROR CODES
  ====================================================================================
 
  400 - Missing or invalid fields
  404 - Resource, Booking, or Service not found
  409 - Duplicate or conflict
  422 - Invalid schedule or overlap
  500 - Internal server error
 
  ====================================================================================
 
 