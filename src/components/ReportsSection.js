import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import * as XLSX from 'xlsx';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { format, parse } from 'date-fns';

const ReportsSection = () => {
  const [startDate, setStartDate] = useState(new Date('2025-07-01'));
  const [endDate, setEndDate] = useState(new Date('2025-07-31'));
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSelectingStart, setIsSelectingStart] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);

  const handleGenerateReport = async () => {
    try {
      setIsLoading(true);
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      // Fetch device information for area mapping
      const deviceResponse = await fetch('https://api.powerworkplace.com/api:IbIdPxaw/device_mangement_get_status?customer_id=CityU');
      if (!deviceResponse.ok) throw new Error('Failed to fetch device data');
      const deviceData = await deviceResponse.json();

      // Create device mapping for Area_Name lookup
      const deviceMap = {};
      deviceData.forEach(device => {
        deviceMap[device.Device_id] = {
          area: `${device.Floor} ${device.Area}`,
          location: device.Location,
          floor: device.Floor,
          building: device.Building
        };
      });

      // Fetch visit data using the correct endpoint
      const visitResponse = await fetch(`https://api.powerworkplace.com/api:JhyDriv1/city_sds_history_record_daily?start_time=${startStr}&end_time=${endStr}`);
      if (!visitResponse.ok) throw new Error('Failed to fetch visit data');
      const visitData = await visitResponse.json();

      // Filter records that fall exactly within start and end date (INCLUSIVE of end date)
      const filteredData = visitData.filter((record) => {
        const recordDate = parse(record.date, 'd MMMM yyyy,EEE', new Date());
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999); // Include the entire end date
        return recordDate >= sDate && recordDate <= eDate;
      });

      // Map the data according to the required format
      const finalData = filteredData.map((entry) => ({
        Device_ID: entry.Device_ID,
        Area_Name: deviceMap[entry.Device_ID]?.area || 'Unknown Area',
        Date: entry.date, // Keep original formatted string like "23 July 2025,Wed"
        Visit: entry.Total_visit
      }));

      // Generate Excel file
      const worksheet = XLSX.utils.json_to_sheet(finalData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'SDS Report');

      // Generate filename in the format: SDS_CITYU-SDS_2025-07-23_2025-07-29.csv
      const filename = `SDS_CITYU-SDS_${startStr}_${endStr}.xlsx`;
      XLSX.writeFile(workbook, filename);

    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (date) => {
    if (!isSelectingStart) {
      // First click: selects end date
      setTempEndDate(date);
      setIsSelectingStart(true);
      // Keep calendar open for start date selection
    } else {
      // Second click: selects start date and closes calendar
      let finalStartDate = date;
      let finalEndDate = tempEndDate;
      
      if (date > tempEndDate) {
        // If start date is after end date, swap them
        finalStartDate = tempEndDate;
        finalEndDate = date;
      }
      
      // Apply the final dates
      setStartDate(finalStartDate);
      setEndDate(finalEndDate);
      
      // Clear temporary states and close calendar
      setTempStartDate(null);
      setTempEndDate(null);
      setShowCalendar(false);
      setIsSelectingStart(false);
    }
  };

  const handleCalendarOpen = () => {
    // Clear temporary selection when opening calendar
    setTempStartDate(null);
    setTempEndDate(null);
    setShowCalendar(true);
    setIsSelectingStart(false); // Always start with end date selection
  };

  const handleCalendarClose = () => {
    // Clear temporary states when closing without selection
    setTempStartDate(null);
    setTempEndDate(null);
    setShowCalendar(false);
    setIsSelectingStart(false);
  };

  const CustomInput = React.forwardRef(({ value, onClick, placeholder, isStart }, ref) => (
    <div className="relative">
      <input
        type="text"
        value={value}
        onClick={handleCalendarOpen}
        ref={ref}
        placeholder={placeholder}
        readOnly
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
      />
      <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
    </div>
  ));

  // Determine what should be shown as selected in the calendar
  const getSelectedDate = () => {
    if (tempEndDate && !isSelectingStart) {
      return tempEndDate;
    }
    if (tempStartDate && isSelectingStart) {
      return tempStartDate;
    }
    return null; // Show no selection when starting fresh
  };

  const getStartDate = () => {
    if (tempEndDate && isSelectingStart) {
      return tempEndDate; // Show temp end date as start of range while selecting start
    }
    return tempStartDate;
  };

  const getEndDate = () => {
    if (tempEndDate && !isSelectingStart) {
      return tempEndDate;
    }
    return tempStartDate && isSelectingStart ? tempStartDate : null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Reports</h2>
      <p className="text-gray-600 mb-8 text-left">Please select a date range</p>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start date
            </label>
            <DatePicker
              selected={showCalendar ? getSelectedDate() : startDate}
              onChange={handleDateChange}
              customInput={<CustomInput placeholder="Start date" isStart={true} />}
              dateFormat="MMM dd, yyyy"
              maxDate={new Date()}
              open={showCalendar}
              onClickOutside={handleCalendarClose}
              startDate={showCalendar ? getStartDate() : null}
              endDate={showCalendar ? getEndDate() : null}
              selectsRange={false}
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End date
            </label>
            <DatePicker
              selected={endDate}
              onChange={() => {}}
              customInput={<CustomInput placeholder="End date" isStart={false} />}
              dateFormat="MMM dd, yyyy"
              maxDate={new Date()}
            />
          </div>
        </div>

        <div className="flex-shrink-0">
          <button
            onClick={handleGenerateReport}
            disabled={isLoading}
            className={`px-8 py-3 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md ${
              isLoading 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </div>
            ) : (
              'Generate Report'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsSection;