import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Package, CreditCard, ChevronDown } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import bookingAPI from '../services/bookingApi';
import { transformBookingForUI, getStatusBadgeClass, formatTime } from '../utils/bookingUtils';

export default function Dashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [cancelledBookings, setCancelledBookings] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResource, setSelectedResource] = useState('all');
  const [cancelledFilter, setCancelledFilter] = useState('today');
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [bookingsResponse, resourcesResponse] = await Promise.all([
          bookingAPI.getAllBookings(true),
          bookingAPI.getResources()
        ]);
        
        // Fetch cancelled booking IDs from the cancelled-meeting API
        const cancelledResponse = await fetch('https://njs-01.optimuslab.space/bms/cancelled-meeting', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        let cancelledBookingIds = [];
        if (cancelledResponse.ok) {
          const cancelledData = await cancelledResponse.json();
          cancelledBookingIds = cancelledData
            .map(item => item.booking_id)
            .filter(id => id);
        }

        console.log(`📋 Dashboard: Found ${cancelledBookingIds.length} cancelled booking IDs`);

        // Transform all bookings
        const allTransformedBookings = bookingsResponse.data.map(transformBookingForUI);
        
        // Separate cancelled and active bookings
        const cancelled = [];
        const active = [];
        
        allTransformedBookings.forEach(booking => {
          if (cancelledBookingIds.includes(booking.id)) {
            cancelled.push({
              ...booking,
              status: 'Cancelled',
              is_canceled: true
            });
          } else if (!booking.is_canceled) {
            active.push(booking);
          }
        });
        
        console.log(`✅ Dashboard: Active bookings: ${active.length}, Cancelled: ${cancelled.length}`);
        
        setBookings(active);
        setCancelledBookings(cancelled);
        setResources(resourcesResponse.data || []);
      } catch (err) {
        setError('Failed to fetch data');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getCurrentWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const getCurrentMonth = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[new Date().getMonth()];
  };

  const getCurrentMonthBookings = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return bookings.filter(b => {
      if (!b.starts_at) return false;
      const bookingDate = new Date(b.starts_at);
      return bookingDate.getMonth() === currentMonth && 
             bookingDate.getFullYear() === currentYear &&
             b.status === 'Confirmed';
    }).length;
  };

  const totalBookings = bookings.length;
  const currentMonthConfirmedBookings = getCurrentMonthBookings();
  const totalResources = resources.length;
  const uniqueCustomers = new Set(bookings.map(b => b.customer).filter(c => c && c !== 'N/A')).size;

  const generateChartData = () => {
    const weekDates = getCurrentWeekDates();
    
    return weekDates.map((date) => {
      const dateStr = date.toISOString().split('T')[0];
      let count = 0;
      
      if (selectedResource === 'all') {
        count = bookings.filter(b => {
          if (!b.starts_at) return false;
          const bookingDate = new Date(b.starts_at).toISOString().split('T')[0];
          return bookingDate === dateStr;
        }).length;
      } else {
        count = bookings.filter(b => {
          if (!b.starts_at) return false;
          const bookingDate = new Date(b.starts_at).toISOString().split('T')[0];
          return bookingDate === dateStr && String(b.resource?.id) === String(selectedResource);
        }).length;
      }
      
      return {
        date: date,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: count
      };
    });
  };

  const chartData = generateChartData();
  
  const dataValues = chartData.map(d => d.value);
  const maxDataValue = Math.max(...dataValues, 0);
  
  let yAxisMax;
  if (maxDataValue === 0) {
    yAxisMax = 4;
  } else if (maxDataValue <= 3) {
    yAxisMax = 6;
  } else if (maxDataValue <= 10) {
    yAxisMax = Math.ceil(maxDataValue * 1.5);
  } else {
    yAxisMax = Math.ceil(maxDataValue * 1.3);
  }
  
  const yAxisMin = 0;
  const yAxisRange = yAxisMax - yAxisMin;
  const yAxisStep = yAxisRange / 3;
  
  const yAxisLabels = [
    Math.round(yAxisMax),
    Math.round(yAxisMax - yAxisStep),
    Math.round(yAxisMax - yAxisStep * 2),
    yAxisMin
  ];

  const filteredBookings = bookings.filter(booking => {
    let matchesDate = true;
    let matchesStatus = true;

    if (selectedDate) {
      const bookingDate = new Date(booking.starts_at).toISOString().split('T')[0];
      matchesDate = bookingDate === selectedDate;
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'tentative') {
        matchesStatus = booking.status.toLowerCase() === 'pending';
      } else if (statusFilter === 'approved') {
        matchesStatus = booking.status.toLowerCase() === 'confirmed';
      }
    }

    return matchesDate && matchesStatus;
  });

  const recentBookings = filteredBookings.slice(0, 6);
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const startOfWeek = new Date(today);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const filteredCancelledBookings = cancelledBookings.filter(booking => {
    if (!booking.starts_at) return false;
    const bookingDate = new Date(booking.starts_at);
    const bookingDateStr = bookingDate.toISOString().split('T')[0];
    
    if (cancelledFilter === 'today') {
      return bookingDateStr === todayStr;
    } else {
      return bookingDate >= startOfWeek && bookingDate <= today;
    }
  });

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar currentPath="/dashboard" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-gray-50 flex items-center justify-center">
            <div className="text-gray-500">Loading...</div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar currentPath="/dashboard" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-gray-50 flex items-center justify-center">
            <div className="text-red-500">{error}</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar currentPath="/dashboard" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Overview of all of recent bookings, inventory and plans</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div 
                onClick={() => navigate('/bookings')}
                className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-sm text-gray-600">Recent Bookings</div>
                  <div className="text-xs text-gray-400">{getCurrentMonth()}</div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-semibold text-gray-900">{currentMonthConfirmedBookings}</div>
                  <Calendar className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                </div>
              </div>

              <div 
                onClick={() => navigate('/customers')}
                className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-sm text-gray-600">Total Customers</div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-semibold text-gray-900">{uniqueCustomers}</div>
                  <Users className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                </div>
              </div>

              <div 
                onClick={() => navigate('/resources')}
                className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-sm text-gray-600">Total Resources</div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-semibold text-gray-900">{totalResources}</div>
                  <Package className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                </div>
              </div>

              <div 
                onClick={() => navigate('/plans')}
                className="bg-[#214BAE] rounded-lg p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-sm text-blue-100">Plans</div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-semibold text-white">03</div>
                  <CreditCard className="w-5 h-5 text-white" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Resource Usage Overview</h3>
                    <div className="relative">
                      <select 
                        value={selectedResource}
                        onChange={(e) => setSelectedResource(e.target.value)}
                        className="appearance-none text-sm border border-gray-200 rounded-lg px-4 py-2 pr-10 text-gray-700 bg-white cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Resources</option>
                        {resources.map(resource => (
                          <option key={resource.id} value={resource.id}>
                            {resource.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  
                  <div className="relative" style={{ height: '260px', paddingLeft: '40px', paddingBottom: '32px' }}>
                    <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-sm text-gray-500 font-medium">
                      {yAxisLabels.map((label, i) => (
                        <span key={i}>{label}</span>
                      ))}
                    </div>
                    
                    <div className="h-full relative" style={{ paddingBottom: '32px' }}>
                      <div className="absolute inset-0 bottom-8 flex flex-col justify-between">
                        {yAxisLabels.map((val, i) => (
                          <div key={i} className="border-t border-dashed border-gray-200"></div>
                        ))}
                      </div>
                      
                      <svg className="absolute inset-0 w-full bottom-8" style={{ height: 'calc(100% - 32px)' }} preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#5b8def" />
                            <stop offset="100%" stopColor="#5b8def" />
                          </linearGradient>
                        </defs>
                        
                        <path
                          fill="none"
                          stroke="url(#lineGradient)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d={(() => {
                            if (chartData.length === 0) return '';
                            
                            const points = chartData.map((item, i) => {
                              const x = (i / (chartData.length - 1)) * 100;
                              const y = yAxisRange > 0 
                                ? ((yAxisMax - item.value) / yAxisRange) * 100 
                                : 50;
                              return { x, y };
                            });
                            
                            if (points.length === 1) {
                              return `M ${points[0].x},${points[0].y}`;
                            }
                            
                            if (points.length === 2) {
                              return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
                            }
                            
                            let path = `M ${points[0].x},${points[0].y}`;
                            
                            for (let i = 0; i < points.length - 1; i++) {
                              const p0 = points[Math.max(0, i - 1)];
                              const p1 = points[i];
                              const p2 = points[i + 1];
                              const p3 = points[Math.min(points.length - 1, i + 2)];
                              
                              const cp1x = p1.x + (p2.x - p0.x) / 6;
                              const cp1y = p1.y + (p2.y - p0.y) / 6;
                              const cp2x = p2.x - (p3.x - p1.x) / 6;
                              const cp2y = p2.y - (p3.y - p1.y) / 6;
                              
                              path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
                            }
                            
                            return path;
                          })()}
                        />
                      </svg>
                      
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-sm text-gray-500 font-medium">
                        {chartData.map((item, i) => (
                          <span key={i} className="text-center">{item.label}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-gray-900">Cancelled Bookings</h3>
                  <div className="relative">
                    <select 
                      value={cancelledFilter}
                      onChange={(e) => setCancelledFilter(e.target.value)}
                      className="appearance-none text-xs border border-gray-200 rounded-md px-2.5 py-1 pr-7 text-gray-600 bg-white cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                
                <div className="space-y-3 flex-1 overflow-y-auto" style={{ maxHeight: '280px' }}>
                  {filteredCancelledBookings.length > 0 ? (
                    filteredCancelledBookings.map((booking) => (
                      <div key={booking.id} className="border border-gray-200 rounded-lg p-3.5">
                        <div className="text-sm font-semibold text-gray-900 mb-1.5">
                          {booking.resource?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 mb-1">
                          {booking.customer || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {booking.starts_at ? new Date(booking.starts_at).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          }) : 'N/A'} {formatTime(booking.starts_at)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-sm text-gray-500 py-8">
                      No cancelled bookings
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        placeholder="dd-mm-yyyy"
                        className="text-sm border border-gray-200 rounded-md px-3 py-1.5 pr-9 text-gray-700 bg-white cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        style={{ minWidth: '140px' }}
                      />
                      <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                    </div>
                    <div className="relative">
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="appearance-none text-sm border border-gray-200 rounded-md px-3 py-1.5 pr-8 text-gray-700 bg-white cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        style={{ minWidth: '120px' }}
                      >
                        <option value="all">Status</option>
                        <option value="approved">Approved</option>
                        <option value="tentative">Tentative</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentBookings.length > 0 ? (
                      recentBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3.5 text-sm text-gray-900">{booking.customer}</td>
                          <td className="px-6 py-3.5 text-sm text-gray-900">{booking.resource?.name || 'N/A'}</td>
                          <td className="px-6 py-3.5 text-sm text-gray-900">{formatTime(booking.starts_at)}</td>
                          <td className="px-6 py-3.5 text-sm text-gray-900">{formatTime(booking.ends_at)}</td>
                          <td className="px-6 py-3.5 text-sm text-gray-900">{booking.duration}</td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeClass(booking.status)}`}>
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500">
                          No bookings found for the selected filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}