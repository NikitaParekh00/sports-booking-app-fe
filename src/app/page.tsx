export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Book a court</h1>
      <form action="/search" className="flex gap-2">
        <input name="q" placeholder="Search by sport or location" className="flex-1 border rounded-md px-3 py-2" />
        <button className="bg-black text-white rounded-md px-4">Search</button>
      </form>
      <div className="text-sm text-gray-500">Try: football, cricket, badminton, Mumbai</div>
    </div>
  );
}
