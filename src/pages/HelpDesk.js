import Sidebar from '../components/Sidebar';

export default function HelpDesk() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar currentPath="/HelpDesk" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-gray-900">Help Desk</h1>
            {/* Your customers content */}
          </div>
        </main>
      </div>
    </div>
  );
}