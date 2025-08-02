import React, { useState, useEffect } from 'react';

const TotalVisitsCards = () => {
  const [visitsData, setVisitsData] = useState([]);

  // Mapping areas to device names
  const areaToDeviceMapping = {
    '6/F Lobby': 'CITYU-SDS-FF-01',
    '6/F Activity Room': 'CITYU-SDS-FF-02',
    '6/F Activity Rooms': 'CITYU-SDS-FF-02',
    '7/F Activity Room': 'CITYU-SDS-FF-03',
    '7/F Activity Rooms': 'CITYU-SDS-FF-03',
  };

  // Areas to display on cards
  const displayAreas = ['6/F Lobby', '6/F Activity Rooms', '7/F Activity Rooms'];

  const fetchLiveVisits = async () => {
    try {
      const res = await fetch(
        'https://api.powerworkplace.com/api:JhyDriv1/city_sds_live_test'
      );

      if (!res.ok) throw new Error('Failed to fetch live visit data');

      const liveData = await res.json();
      console.log('Live visit data:', liveData);

      const processedData = displayAreas.map((area) => {
        const deviceId = areaToDeviceMapping[area];
        const deviceData = liveData.find((d) => d.Device_Name === deviceId);

        return {
          area,
          visits: deviceData?.in || 0,
        };
      });

      setVisitsData(processedData);
    } catch (err) {
      console.error('Error fetching live visits:', err);
    }
  };

  useEffect(() => {
    fetchLiveVisits();

    const interval = setInterval(() => {
      fetchLiveVisits();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Total Visits Today
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visitsData.map((item, index) => (
          <div
            key={index}
            className="rounded-lg p-6 text-white text-center hover:opacity-90 transition-opacity duration-200"
            style={{ backgroundColor: '#5CBE81' }}
          >
            <div className="font-medium text-lg mb-2">{item.area}</div>
            <div className="text-2xl font-bold flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{item.visits}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TotalVisitsCards;