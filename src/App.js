import React, { useState } from 'react';
import { format } from 'date-fns';
import Header from './components/Header';
import TotalVisitsCards from './components/TotalVisitsCards';
import SelectAreaCard from './components/SelectAreaCard';
import AreaGraphCard from './components/AreaGraphCard';
import ReportsSection from './components/ReportsSection';

function App() {
  const [selectedBuilding, setSelectedBuilding] = useState('BOC Building');
  const [selectedFloor, setSelectedFloor] = useState('6/F');
  const [selectedArea, setSelectedArea] = useState('6/F Lobby');

  const currentDate = new Date();
  const formattedDate = format(currentDate, 'd MMMM yyyy, EEEE');

  const handleAreaSelection = (building, floor, area) => {
    setSelectedBuilding(building);
    setSelectedFloor(floor);
    setSelectedArea(area);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Full width, no margins */}
      <Header />
      
      {/* Main content with padding and max-width */}
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Welcome section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-light text-gray-900">
                Welcome to{' '}
                <span className="text-blue-600 font-medium">Optimus</span>
              </h1>
            </div>
            
            <div className="mt-2 sm:mt-0">
              <p className="text-gray-800 text-xl">
                {formattedDate}
              </p>
            </div>
          </div>
        
        {/* Total Visits Today Cards */}
        <TotalVisitsCards />
        
        {/* Select Area Card */}
        <SelectAreaCard 
          selectedBuilding={selectedBuilding}
          selectedFloor={selectedFloor}
          selectedArea={selectedArea}
          onAreaChange={handleAreaSelection}
        />
        
        {/* Area Graph Card */}
        <AreaGraphCard selectedArea={selectedArea} />
        
          {/* Reports Section */}
          <ReportsSection />
        </div>
      </div>
    </div>
  );
}

export default App;