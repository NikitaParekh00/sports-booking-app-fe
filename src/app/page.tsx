export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Book a court</h1>
      <div className="flex gap-2">
        <a href="/dashboard" className="flex-1 bg-blue-600 text-white rounded-md px-4 py-2 text-center hover:bg-blue-700 transition-colors">
          Go to Dashboard
        </a>
        <a href="/search" className="bg-gray-800 text-white rounded-md px-4 py-2 hover:bg-gray-900 transition-colors">
          Search
        </a>
      </div>
      <div className="text-sm text-gray-500">Try: football, cricket, badminton, Mumbai</div>
    </div>
  );
}
