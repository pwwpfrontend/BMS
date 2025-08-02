import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const SelectAreaCard = ({ selectedBuilding, selectedFloor, selectedArea, onAreaChange }) => {
  const buildings = ['BOC Building'];
  const floors = ['6/F', '7/F'];
  
  const getAreasForFloor = (floor) => {
    if (floor === '6/F') {
      return ['6/F Lobby', '6/F Activity Room'];
    } else if (floor === '7/F') {
      return ['7/F Activity Room'];
    }
    return [];
  };

  const handleBuildingChange = (e) => {
    const building = e.target.value;
    onAreaChange(building, selectedFloor, selectedArea);
  };

  const handleFloorChange = (e) => {
    const floor = e.target.value;
    const areas = getAreasForFloor(floor);
    const newArea = areas.length > 0 ? areas[0] : '';
    onAreaChange(selectedBuilding, floor, newArea);
  };

  const handleAreaChange = (e) => {
    const area = e.target.value;
    onAreaChange(selectedBuilding, selectedFloor, area);
  };

  const areas = getAreasForFloor(selectedFloor);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Area</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Building Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Building
          </label>
          <div className="relative">
            <select
              value={selectedBuilding}
              onChange={handleBuildingChange}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
            >
              {buildings.map((building) => (
                <option key={building} value={building}>
                  {building}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Floor Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Floor
          </label>
          <div className="relative">
            <select
              value={selectedFloor}
              onChange={handleFloorChange}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
            >
              {floors.map((floor) => (
                <option key={floor} value={floor}>
                  {floor}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Area Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Area
          </label>
          <div className="relative">
            <select
              value={selectedArea}
              onChange={handleAreaChange}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
            >
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectAreaCard;
