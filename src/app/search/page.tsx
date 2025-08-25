import { Suspense } from "react";

function Results() {
	return (
		<div className="space-y-4">
			{/* Placeholder results list */}
			<div className="border rounded-md p-4">
				<div className="font-medium">Sample Turf - Football</div>
				<div className="text-sm text-gray-500">Mumbai • Rs 1200/hr</div>
			</div>
		</div>
	);
}

export default function SearchPage() {
	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-semibold">Search</h1>
			<Suspense>
				<Results />
			</Suspense>
		</div>
	);
}

