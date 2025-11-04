import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

const BASE_URL = 'https://njs-01.optimuslab.space/booking_system';

const apiRequest = async (endpoint, method = 'GET', data = null) => {
  const url = `${BASE_URL}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    // Check if response is plain text
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/plain')) {
      return await response.text();
    }
    
    // Try to parse as JSON, but if it fails and looks like plain text, return as text
    const responseText = await response.text();
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      // If it's a UUID-like string (service ID), return as is
      if (responseText.match(/^[a-f0-9-]{36}$/i)) {
        return responseText;
      }
      // Otherwise, throw the parse error
      throw parseError;
    }
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

function LimitationsTab({ resource, onUpdate }) {
  const [expandedSections, setExpandedSections] = useState({
    availableTimes: false,
    capacity: false,
    duration: false
  });
  
  const [localCapacity, setLocalCapacity] = useState(10);
  
  // Schedule state
  const [scheduleData, setScheduleData] = useState(null);
  const [availabilityGrid, setAvailabilityGrid] = useState(() => 
    Array.from({ length: 24 }, () => Array(7).fill(false))
  );
  const [originalGrid, setOriginalGrid] = useState(() => 
    Array.from({ length: 24 }, () => Array(7).fill(false))
  );

  // Duration state - keeping same format as create modal
  const [durationState, setDurationState] = useState({
    max_duration: { value: 10, unit: 'hours' },
    min_duration: { value: 1, unit: 'hours' },
    duration_interval: { value: 15, unit: 'minutes' }
  });

  // Service ID state
  const [serviceId, setServiceId] = useState(null);

  // Grid interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  // View mode state - 'auto', 'monfri', or 'everyday'
  const [viewMode, setViewMode] = useState('monfri');

  // Helper to convert PT format to {value, unit}
  const convertPTtoValueUnit = (ptString) => {
    if (!ptString || typeof ptString !== 'string') {
      return { value: 0, unit: 'minutes' };
    }
    
    const match = ptString.match(/PT(?:(\d+)D)?(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) {
      return { value: 0, unit: 'minutes' };
    }
    
    const days = parseInt(match[1] || 0);
    const hours = parseInt(match[2] || 0);
    const minutes = parseInt(match[3] || 0);
    
    if (days > 0) {
      return { value: days, unit: 'days' };
    } else if (hours > 0 && minutes === 0) {
      return { value: hours, unit: 'hours' };
    } else if (hours > 0 && minutes > 0) {
      // Convert to total minutes if mixed
      return { value: hours * 60 + minutes, unit: 'minutes' };
    } else {
      return { value: minutes, unit: 'minutes' };
    }
  };

  // Helper to convert {value, unit} to PT format
  const convertValueUnitToPT = (value, unit) => {
    const val = parseInt(value) || 0;
    if (unit === 'days') {
      return `PT${val * 24}H`;
    } else if (unit === 'hours') {
      return `PT${val}H`;
    } else {
      return `PT${val}M`;
    }
  };

  // Fetch service ID and schedule info on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('LimitationsTab: Initializing with resource:', resource);
        
        // Set capacity
        const cap = resource.limitations?.capacity || resource.originalData?.metadata?.capacity || 10;
        setLocalCapacity(cap);
        
        // Get service ID (non-blocking, don't fail if this errors)
        try {
          const serviceIdResponse = await apiRequest('/getServiceIdbyResourceId', 'POST', {
            resource_id: resource.id
          });
          console.log('✅ Service ID response:', serviceIdResponse);
          console.log('✅ Service ID type:', typeof serviceIdResponse);
          
          // Handle both string response and object response
          const actualServiceId = typeof serviceIdResponse === 'string' 
            ? serviceIdResponse.trim()
            : serviceIdResponse?.service_id || serviceIdResponse?.id;
            
          console.log('✅ Actual service ID:', actualServiceId);
          setServiceId(actualServiceId);
          
          // Get service details for duration
          if (actualServiceId) {
            try {
              const serviceDetails = await apiRequest(`/getService/${actualServiceId}`, 'GET');
              console.log('✅ Service details:', serviceDetails);
              
              setDurationState({
                max_duration: convertPTtoValueUnit(serviceDetails.max_duration || 'PT10H'),
                min_duration: convertPTtoValueUnit(serviceDetails.min_duration || 'PT1H'),
                duration_interval: convertPTtoValueUnit(serviceDetails.duration_step || serviceDetails.bookable_interval || 'PT15M')
              });
            } catch (serviceErr) {
              console.warn('⚠️ Could not fetch service details:', serviceErr);
              // Use resource originalData first, then fallback
              setDurationState({
                max_duration: convertPTtoValueUnit(
                  resource.originalData?.max_duration || resource.max_duration || 'PT10H'
                ),
                min_duration: convertPTtoValueUnit(
                  resource.originalData?.min_duration || resource.min_duration || 'PT1H'
                ),
                duration_interval: convertPTtoValueUnit(
                  resource.originalData?.duration_interval || resource.duration_interval || 'PT15M'
                )
              });
            }
          } else {
            // Use resource originalData first, then fallback
            console.log('📋 Using resource duration data as fallback');
            setDurationState({
              max_duration: convertPTtoValueUnit(
                resource.originalData?.max_duration || resource.max_duration || 'PT10H'
              ),
              min_duration: convertPTtoValueUnit(
                resource.originalData?.min_duration || resource.min_duration || 'PT1H'
              ),
              duration_interval: convertPTtoValueUnit(
                resource.originalData?.duration_interval || resource.duration_interval || 'PT15M'
              )
            });
          }
        } catch (serviceIdErr) {
          console.warn('⚠️ Could not fetch service ID:', serviceIdErr);
          // Use resource originalData first, then fallback
          setDurationState({
            max_duration: convertPTtoValueUnit(
              resource.originalData?.max_duration || resource.max_duration || 'PT10H'
            ),
            min_duration: convertPTtoValueUnit(
              resource.originalData?.min_duration || resource.min_duration || 'PT1H'
            ),
            duration_interval: convertPTtoValueUnit(
              resource.originalData?.duration_interval || resource.duration_interval || 'PT15M'
            )
          });
        }
        
        // Get schedule info
        let scheduleInfo = null;
        let newGrid = Array.from({ length: 24 }, () => Array(7).fill(false));
        
        try {
          scheduleInfo = await apiRequest(`/getResourceScheduleInfo/${encodeURIComponent(resource.name)}`, 'GET');
          console.log('✅ Schedule info response:', scheduleInfo);
          console.log('✅ Schedule blocks array:', scheduleInfo?.schedule_blocks);
          console.log('✅ Number of blocks:', scheduleInfo?.schedule_blocks?.length);
          setScheduleData(scheduleInfo);
          
          // Initialize grid from schedule blocks
          if (scheduleInfo && scheduleInfo.schedule_blocks && Array.isArray(scheduleInfo.schedule_blocks)) {
            const weekdayMap = {
              'monday': 0,
              'tuesday': 1,
              'wednesday': 2,
              'thursday': 3,
              'friday': 4,
              'saturday': 5,
              'sunday': 6
            };
            
            console.log('🔄 Processing schedule blocks...');
            scheduleInfo.schedule_blocks.forEach((block, idx) => {
              console.log(`Block ${idx}:`, block);
              const dayIndex = weekdayMap[block.weekday];
              console.log(`  Weekday: ${block.weekday} -> dayIndex: ${dayIndex}`);
              
              if (dayIndex !== undefined) {
                const startHour = parseInt(block.start_time.split(':')[0]);
                const endHour = parseInt(block.end_time.split(':')[0]);
                console.log(`  Time: ${startHour}:00 - ${endHour}:00`);
                
                for (let h = startHour; h < endHour; h++) {
                  newGrid[h][dayIndex] = true;
                }
              }
            });
            
            console.log('✅ Grid initialized from schedule blocks');
          } else {
            console.warn('⚠️ No schedule_blocks found, using fallback');
            // Fallback to defined_timings from resource
            if (resource.defined_timings && Array.isArray(resource.defined_timings)) {
              console.log('📋 Using defined_timings fallback:', resource.defined_timings);
              const weekdayMap = {
                'monday': 0,
                'tuesday': 1,
                'wednesday': 2,
                'thursday': 3,
                'friday': 4,
                'saturday': 5,
                'sunday': 6
              };
              
              resource.defined_timings.forEach(timing => {
                const dayIndex = weekdayMap[timing.weekday];
                if (dayIndex !== undefined) {
                  const startHour = parseInt(timing.start_time.split(':')[0]);
                  const endHour = parseInt(timing.end_time.split(':')[0]);
                  for (let h = startHour; h < endHour; h++) {
                    newGrid[h][dayIndex] = true;
                  }
                }
              });
            }
          }
        } catch (err) {
          console.error('❌ Error fetching schedule info:', err);
          // Fallback to defined_timings from resource
          if (resource.defined_timings && Array.isArray(resource.defined_timings)) {
            console.log('📋 Using defined_timings fallback due to error:', resource.defined_timings);
            const weekdayMap = {
              'monday': 0,
              'tuesday': 1,
              'wednesday': 2,
              'thursday': 3,
              'friday': 4,
              'saturday': 5,
              'sunday': 6
            };
            
            resource.defined_timings.forEach(timing => {
              const dayIndex = weekdayMap[timing.weekday];
              if (dayIndex !== undefined) {
                const startHour = parseInt(timing.start_time.split(':')[0]);
                const endHour = parseInt(timing.end_time.split(':')[0]);
                for (let h = startHour; h < endHour; h++) {
                  newGrid[h][dayIndex] = true;
                }
              }
            });
          }
        }
        
        console.log('📊 Final grid state:', newGrid);
        setAvailabilityGrid(newGrid);
        setOriginalGrid(JSON.parse(JSON.stringify(newGrid)));
        
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    
    if (resource && resource.id) {
      fetchData();
    }
  }, [resource]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Grid interaction functions
  const toggleCell = (hourIndex, dayIndex) => {
    setAvailabilityGrid(prev => {
      const next = prev.map(row => row.slice());
      next[hourIndex][dayIndex] = !next[hourIndex][dayIndex];
      return next;
    });
  };

  const handleMouseDown = (hourIndex, dayIndex) => {
    setIsDragging(true);
    const originalState = availabilityGrid[hourIndex][dayIndex];
    setDragStart({ hour: hourIndex, day: dayIndex, originalState });
    toggleCell(hourIndex, dayIndex);
  };

  const handleMouseEnter = (hourIndex, dayIndex) => {
    if (isDragging && dragStart) {
      const startHour = Math.min(dragStart.hour, hourIndex);
      const endHour = Math.max(dragStart.hour, hourIndex);
      const startDay = Math.min(dragStart.day, dayIndex);
      const endDay = Math.max(dragStart.day, dayIndex);
      
      setAvailabilityGrid(prev => {
        const next = prev.map(row => row.slice());
        const targetValue = !dragStart.originalState;
        
        for (let h = startHour; h <= endHour; h++) {
          for (let d = startDay; d <= endDay; d++) {
            next[h][d] = targetValue;
          }
        }
        return next;
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // REMOVED: applyPreset function that was overwriting the schedule data
  // The buttons now act as visual indicators only, not as data modifiers

  // Check if Mon-Fri pattern is selected (for auto-detection)
  const isMonFriPattern = () => {
    // Check if Mon-Fri have any selected time and Sat-Sun are empty
    let monFriHasSelection = false;
    for (let d = 0; d < 5; d++) {
      for (let h = 0; h < 24; h++) {
        if (availabilityGrid[h][d]) {
          monFriHasSelection = true;
          break;
        }
      }
      if (monFriHasSelection) break;
    }
    
    let satSunHasSelection = false;
    for (let d = 5; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (availabilityGrid[h][d]) {
          satSunHasSelection = true;
          break;
        }
      }
      if (satSunHasSelection) break;
    }
    
    return monFriHasSelection && !satSunHasSelection;
  };

  // Check if everyday pattern is selected (for auto-detection)
  const isEverydayPattern = () => {
    // Check if all 7 days have any selected time
    let allDaysHaveSelection = true;
    for (let d = 0; d < 7; d++) {
      let dayHasSelection = false;
      for (let h = 0; h < 24; h++) {
        if (availabilityGrid[h][d]) {
          dayHasSelection = true;
          break;
        }
      }
      if (!dayHasSelection) {
        allDaysHaveSelection = false;
        break;
      }
    }
    return allDaysHaveSelection;
  };

  // Determine which view mode to use
  const getEffectiveViewMode = () => {
    if (viewMode === 'monfri') return 'monfri';
    if (viewMode === 'everyday') return 'everyday';
    // Auto mode: detect pattern
    if (isMonFriPattern()) return 'monfri';
    return 'everyday';
  };

  const effectiveViewMode = getEffectiveViewMode();

  // Convert grid to schedule blocks for each day
  const convertGridToScheduleBlocks = (dayIndex) => {
    const blocks = [];
    let startHour = null;
    
    for (let hour = 0; hour < 24; hour++) {
      if (availabilityGrid[hour][dayIndex] && startHour === null) {
        startHour = hour;
      } else if (!availabilityGrid[hour][dayIndex] && startHour !== null) {
        blocks.push({
          start_time: `${startHour.toString().padStart(2, '0')}:00:00`,
          end_time: `${hour.toString().padStart(2, '0')}:00:00`
        });
        startHour = null;
      }
    }
    
    if (startHour !== null) {
      blocks.push({
        start_time: `${startHour.toString().padStart(2, '0')}:00:00`,
        end_time: '24:00:00'
      });
    }
    
    return blocks;
  };

  // Check which days changed
  const getChangedDays = () => {
    const changedDays = [];
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      let dayChanged = false;
      for (let hour = 0; hour < 24; hour++) {
        if (availabilityGrid[hour][dayIndex] !== originalGrid[hour][dayIndex]) {
          dayChanged = true;
          break;
        }
      }
      if (dayChanged) {
        changedDays.push({ weekday: weekdays[dayIndex], dayIndex });
      }
    }
    
    return changedDays;
  };

// Save schedule
const handleSaveSchedule = async () => {
  try {
    if (!scheduleData || !scheduleData.recurring_schedule?.id) {
      alert('Schedule data not loaded yet');
      return;
    }

    const changedDays = getChangedDays();
    console.log('Changed days:', changedDays);

    if (changedDays.length === 0) {
      alert('No changes detected');
      return;
    }

    // Process each changed day
    for (const { weekday, dayIndex } of changedDays) {
      // Find ALL schedule blocks for this weekday
      const weekdayBlocks = scheduleData.schedule_blocks.filter(
        block => block.weekday === weekday
      );
      
      const newBlocks = convertGridToScheduleBlocks(dayIndex);

      // Case 1: No blocks exist for this weekday - CREATE
      if (weekdayBlocks.length === 0) {
        console.log(`➕ No blocks found for ${weekday}, creating new blocks...`);
        
        const createPayload = {
          blocks: newBlocks.map(block => ({
            weekday: weekday,
            start_time: block.start_time,
            end_time: block.end_time
          }))
        };

        await apiRequest(
          `/createScheduleBlocks/${resource.id}/${scheduleData.recurring_schedule.id}`,
          'POST',
          createPayload
        );
        
        console.log(`✅ Created blocks for ${weekday}`);
        continue;
      }

      // Case 2: Blocks exist - UPDATE first block, then DELETE remaining blocks
      console.log(`🔄 Updating ${weekday} (${weekdayBlocks.length} existing block(s))...`);
      
      // Update the first block with all new blocks
      const updatePayload = {
        weekday: weekday,
        newBlocks: newBlocks
      };

      await apiRequest(
        `/updateScheduleBlock/${resource.id}/${scheduleData.recurring_schedule.id}/${weekdayBlocks[0].id}`,
        'PUT',
        updatePayload
      );

      console.log(`✅ Updated first block for ${weekday}`);

      // Delete any remaining blocks for this weekday (if there were multiple)
      if (weekdayBlocks.length > 1) {
        console.log(`🗑️ Deleting ${weekdayBlocks.length - 1} extra block(s) for ${weekday}...`);
        
        for (let i = 1; i < weekdayBlocks.length; i++) {
          try {
            await apiRequest(
              `/deleteScheduleBlock/${resource.id}/${scheduleData.recurring_schedule.id}/${weekdayBlocks[i].id}`,
              'DELETE'
            );
            console.log(`✅ Deleted extra block ${weekdayBlocks[i].id}`);
          } catch (error) {
            console.error(`⚠️ Failed to delete extra block ${weekdayBlocks[i].id}:`, error);
            // Continue deleting other blocks even if one fails
          }
        }
      }
    }

    // Update original grid to reflect saved state
    setOriginalGrid(JSON.parse(JSON.stringify(availabilityGrid)));

    // Show success message
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-[#79C485] text-white px-6 py-3 rounded-lg shadow-lg z-50';
    successMessage.textContent = 'Schedule updated successfully!';
    document.body.appendChild(successMessage);
    
    setTimeout(() => {
      if (successMessage.parentNode) {
        successMessage.parentNode.removeChild(successMessage);
      }
    }, 3000);

    if (onUpdate) await onUpdate();

  } catch (err) {
    console.error('❌ Error saving schedule:', err);
    alert('Failed to save schedule: ' + err.message);
  }
};

  // Save capacity
  const handleSaveCapacity = async () => {
    try {
      const existingData = resource.originalData || {};
      const existingMetadata = existingData.metadata || {};
      
      const resourceData = {
        name: resource.name,
        capacity: localCapacity,
        metadata: {
          photo_url: resource.image,
          category: resource.category,
          resource_details: {
            description: resource.details?.resourceDetails || ''
          },
          email_confirmation: resource.email_confirmation || false,
          rates: existingMetadata.rates || [],
          resource_plans: existingMetadata.resource_plans || []
        },
        max_duration: existingData.max_duration || 'PT10H',
        min_duration: existingData.min_duration || 'PT1H',
        duration_interval: existingData.duration_interval || 'PT15M',
        defined_timings: existingData.defined_timings || []
      };
      
      console.log('Capacity update request:', resourceData);
      await apiRequest(`/updateResource/${resource.id}`, 'PUT', resourceData);
      
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-[#79C485] text-white px-6 py-3 rounded-lg shadow-lg z-50';
      successMessage.textContent = 'Capacity updated successfully!';
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        if (successMessage.parentNode) {
          successMessage.parentNode.removeChild(successMessage);
        }
      }, 3000);
      
      if (onUpdate) await onUpdate();
    } catch (err) {
      console.error('Error updating capacity:', err);
      alert('Failed to update capacity: ' + err.message);
    }
  };

  // Save duration
const handleSaveDuration = async () => {
  try {
    const existingData = resource.originalData || {};
    const existingMetadata = existingData.metadata || {};
    
    const resourceData = {
      name: resource.name,
      capacity: localCapacity,
      metadata: {
        photo_url: resource.image,
        category: resource.category,
        resource_details: {
          description: resource.details?.resourceDetails || ''
        },
        email_confirmation: resource.email_confirmation || false,
        rates: existingMetadata.rates || [],
        resource_plans: existingMetadata.resource_plans || []
      },
      max_duration: convertValueUnitToPT(durationState.max_duration.value, durationState.max_duration.unit),
      min_duration: convertValueUnitToPT(durationState.min_duration.value, durationState.min_duration.unit),
      duration_interval: convertValueUnitToPT(durationState.duration_interval.value, durationState.duration_interval.unit),
      defined_timings: existingData.defined_timings || []
    };

    console.log('Duration update request:', resourceData);
    await apiRequest(`/updateResource/${resource.id}`, 'PUT', resourceData);

    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-[#79C485] text-white px-6 py-3 rounded-lg shadow-lg z-50';
    successMessage.textContent = 'Duration settings updated successfully!';
    document.body.appendChild(successMessage);

    setTimeout(() => {
      if (successMessage.parentNode) {
        successMessage.parentNode.removeChild(successMessage);
      }
    }, 3000);

    if (onUpdate) await onUpdate();
  } catch (err) {
    console.error('Error updating duration:', err);
    alert('Failed to update duration: ' + err.message);
  }
};

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-4">
      {/* Available times and days */}
      <div className="border border-gray-200 rounded-lg">
        <button 
          onClick={() => toggleSection('availableTimes')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
        >
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Available times and days</h3>
            <p className="text-sm text-gray-500">Set the times of the day and days of the week when this resource is available.</p>
          </div>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.availableTimes ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {expandedSections.availableTimes && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              {/* Clickable view mode toggles */}
              <button 
                onClick={() => setViewMode(viewMode === 'monfri' ? 'auto' : 'monfri')} 
                className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                  effectiveViewMode === 'monfri'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' 
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                Mon–Fri
              </button>
              <button 
                onClick={() => setViewMode(viewMode === 'everyday' ? 'auto' : 'everyday')} 
                className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                  effectiveViewMode === 'everyday'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' 
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                Every day
              </button>
              
              <button
                onClick={handleSaveSchedule}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 ml-auto"
              >
                <Save className="w-4 h-4" />
                Save Schedule
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-md bg-white">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-14 px-2 py-2 text-xs font-medium text-gray-600 text-left">Time</th>
                    {days.map((d, idx) => {
                      // Check if this day has any active blocks
                      const hasActiveBlocks = availabilityGrid.some(row => row[idx]);
                      // Hide Sat/Sun if Mon-Fri view mode is active
                      if (effectiveViewMode === 'monfri' && idx >= 5) return null;
                      
                      return (
                        <th 
                          key={d} 
                          className={`px-2 py-2 text-xs font-medium text-center ${
                            hasActiveBlocks ? 'text-gray-900' : 'text-gray-400'
                          }`}
                        >
                          {d}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {hours.map((h, rowIdx) => (
                    <tr key={h} className="border-t border-gray-100">
                      <td className="px-2 py-1 text-xs text-gray-500">{h}:00</td>
                      {days.map((_, colIdx) => {
                        // Hide Sat/Sun if Mon-Fri view mode is active
                        if (effectiveViewMode === 'monfri' && colIdx >= 5) return null;
                        
                        const active = availabilityGrid[rowIdx][colIdx];
                        return (
                          <td key={`${rowIdx}-${colIdx}`} className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onMouseDown={() => handleMouseDown(rowIdx, colIdx)}
                              onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
                              className={`w-28 h-14 rounded border transition-colors relative ${
                                active 
                                  ? 'bg-blue-400 border-blue-500 hover:bg-blue-500' 
                                  : 'bg-gray-100 border-gray-200 hover:bg-gray-200'
                              }`}
                              aria-label={`Toggle ${days[colIdx]} ${h}:00`}
                            >
                              {(() => {
                                const isFirstInColumn = active && (rowIdx === 0 || !availabilityGrid[rowIdx - 1][colIdx]);
                                if (isFirstInColumn) {
                                  let lastSelectedHour = rowIdx;
                                  for (let checkHour = rowIdx + 1; checkHour < 24; checkHour++) {
                                    if (availabilityGrid[checkHour][colIdx]) {
                                      lastSelectedHour = checkHour;
                                    } else {
                                      break;
                                    }
                                  }
                                  const startTime = `${rowIdx.toString().padStart(2, '0')}:00`;
                                  const endTime = `${(lastSelectedHour + 1).toString().padStart(2, '0')}:00`;
                                  return (
                                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium leading-tight">
                                      {startTime}-{endTime}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Duration */}
      <div className="border border-gray-200 rounded-lg">
        <button 
          onClick={() => toggleSection('duration')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
        >
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Duration</h3>
            <p className="text-sm text-gray-500">These parameters let you control how long or short bookings can be and the times they can start and end.</p>
          </div>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.duration ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {expandedSections.duration && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Duration</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={durationState.max_duration.value}
                  onChange={(e) => setDurationState({
                    ...durationState,
                    max_duration: { ...durationState.max_duration, value: parseInt(e.target.value) || 0 }
                  })}
                  min="1"
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={durationState.max_duration.unit}
                  onChange={(e) => setDurationState({
                    ...durationState,
                    max_duration: { ...durationState.max_duration, unit: e.target.value }
                  })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Duration</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={durationState.min_duration.value}
                  onChange={(e) => setDurationState({
                    ...durationState,
                    min_duration: { ...durationState.min_duration, value: parseInt(e.target.value) || 0 }
                  })}
                  min="1"
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={durationState.min_duration.unit}
                  onChange={(e) => setDurationState({
                    ...durationState,
                    min_duration: { ...durationState.min_duration, unit: e.target.value }
                  })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration Interval (Booking Time Slots)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={durationState.duration_interval.value}
                  onChange={(e) => setDurationState({
                    ...durationState,
                    duration_interval: { ...durationState.duration_interval, value: parseInt(e.target.value) || 0 }
                  })}
                  min="1"
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={durationState.duration_interval.unit}
                  onChange={(e) => setDurationState({
                    ...durationState,
                    duration_interval: { ...durationState.duration_interval, unit: e.target.value }
                  })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveDuration}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Capacity */}
      <div className="border border-gray-200 rounded-lg">
        <button 
          onClick={() => toggleSection('capacity')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
        >
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Capacity</h3>
            <p className="text-sm text-gray-500">Set the maximum number of people who can use this resource.</p>
          </div>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.capacity ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {expandedSections.capacity && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Maximum capacity</label>
              <input
                type="number"
                value={localCapacity}
                onChange={(e) => setLocalCapacity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveCapacity}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LimitationsTab;