import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AreaGraphCard = ({ selectedArea }) => {
  const [data, setData] = useState([]);
  const [deviceMapping, setDeviceMapping] = useState({});
  const [allDevices, setAllDevices] = useState([]);

  // Fetch device mapping on component mount
  useEffect(() => {
    const fetchDeviceMapping = async () => {
      try {
        const response = await fetch('https://api.powerworkplace.com/api:IbIdPxaw/device_mangement_get_status?customer_id=CityU');
        const devices = await response.json();
        
        // Store all devices for floor-level aggregation
        setAllDevices(devices);
        
        // Create exact mapping based on the device data structure
        const mapping = {};
        devices.forEach(device => {
          // Map exact area names as they appear in the API
          // From API: "6/F" + "Lobby" = "6/F Lobby"
          // From API: "6/F" + "Activity Rooms" = "6/F Activity Rooms" 
          // From API: "7/F" + "Activity Rooms" = "7/F Activity Rooms"
          
          const exactKey = `${device.Floor} ${device.Area}`;
          mapping[exactKey] = device.Device_id;
          
          // Also handle the singular form that might come from dropdown
          // "Activity Rooms" -> "Activity Room"
          if (device.Area === "Activity Rooms") {
            const singularKey = `${device.Floor} Activity Room`;
            mapping[singularKey] = device.Device_id;
          }
        });
        
        setDeviceMapping(mapping);
      } catch (error) {
        console.error('Error fetching device mapping:', error);
      }
    };

    fetchDeviceMapping();
  }, []);

  // Function to get relevant device IDs based on selected area
  const getRelevantDeviceIds = (selectedArea) => {
    // Check if it's a specific area match
    if (deviceMapping[selectedArea]) {
      return [deviceMapping[selectedArea]];
    }
    
    // Check if it's a floor-level selection (e.g., "6/F", "7/F")
    const floorDevices = allDevices.filter(device => device.Floor === selectedArea);
    return floorDevices.map(device => device.Device_id);
  };

  // Fetch visit data when selectedArea or deviceMapping changes
  useEffect(() => {
    const fetchVisitData = async () => {
      if (allDevices.length === 0) {
        setData([]);
        return;
      }

      const relevantDeviceIds = getRelevantDeviceIds(selectedArea);
      
      if (relevantDeviceIds.length === 0) {
        setData([]);
        return;
      }

      try {
        // Get current date and calculate week range
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        
        // Calculate start of current week (Sunday)
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - currentDay);
        
        // Calculate end of current week (Saturday)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        // Format dates for API (YYYY-MM-DD)
        const startDate = startOfWeek.toISOString().split('T')[0];
        const endDate = endOfWeek.toISOString().split('T')[0];
        
        const response = await fetch(
          `https://api.powerworkplace.com/api:JhyDriv1/city_sds_history_record_daily?start_time=${startDate}&end_time=${endDate}`
        );
        const visitData = await response.json();
        
        // Filter data for the relevant devices
        const deviceData = visitData.filter(item => relevantDeviceIds.includes(item.Device_ID));
        
        // Create week data structure with aggregation
        const weekData = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(startOfWeek);
          date.setDate(startOfWeek.getDate() + i);
          
          // Format date to match API format exactly: "DD Month YYYY,DayName"
          const day = date.getDate().toString().padStart(2, '0');
          const month = date.toLocaleDateString('en-US', { month: 'long' });
          const year = date.getFullYear();
          
          // Get correct day name abbreviation
          const dayAbbreviations = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayName = dayAbbreviations[date.getDay()];
          
          const formattedDate = `${day} ${month} ${year},${dayName}`;
          
          // Aggregate visits for all relevant devices on this date
          let totalVisits = 0;
          
          // Only show data up to current day
          if (i <= currentDay) {
            relevantDeviceIds.forEach(deviceId => {
              const dayData = deviceData.find(item => 
                item.Device_ID === deviceId && item.date === formattedDate
              );
              if (dayData) {
                totalVisits += dayData.Total_visit;
              }
            });
          }
          
          weekData.push({
            day: dayNames[i],
            visits: totalVisits
          });
        }
        
        setData(weekData);
      } catch (error) {
        console.error('Error fetching visit data:', error);
        // Set empty data on error, no dummy data
        setData([
          { day: 'Sun', visits: 0 },
          { day: 'Mon', visits: 0 },
          { day: 'Tue', visits: 0 },
          { day: 'Wed', visits: 0 },
          { day: 'Thu', visits: 0 },
          { day: 'Fri', visits: 0 },
          { day: 'Sat', visits: 0 },
        ]);
      }
    };

    // Debounce the fetch function to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      fetchVisitData();
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [selectedArea, deviceMapping, allDevices]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          padding: '8px 12px'
        }}>
          <p style={{ color: '#000000', margin: '0 0 4px 0', fontWeight: '500' }}>
            {label}
          </p>
          <p style={{ color: '#e6cfe6', fontWeight:800, margin: '0', fontSize: '14px' }}>
            Visits: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Area: <span className="font-bold text-gray-800">{selectedArea}</span>
      </h2>
      {/* Custom Legend */}
      <div className="flex justify-center mb-4">
        <div className="flex items-center gap-2">
          <div className="w-12 h-4 rounded-sm" style={{ backgroundColor: '#FAE9FB' }}></div>
              
          <span className="text-sm text-gray-600 ">Visits</span>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
            <YAxis 
              tickLine={false} 
              axisLine={false} 
              domain={[0, 800]}
              ticks={[0, 100, 200, 300, 400, 500, 600, 700, 800]}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(239, 246, 255, 0.5)' }} 
              content={<CustomTooltip />}
            />
            <Bar 
              dataKey="visits" 
              fill="#FAE9FB" 
              stroke="#e6cfe6" 
              strokeWidth={1.5} 
              barSize={50} 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AreaGraphCard;