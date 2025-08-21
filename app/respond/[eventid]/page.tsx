"use client"

import VerticalMeetingCalendar from "../../../vertical-meeting-calendar"

export default function RespondPage({ params }: { params: { eventid: string } }) {
  const experience = {
    title: "Mountain Mindfulness Coliving Retreat",
    dates: [
      {
        id: "1",
        label: "April 1, 2025",
        date: "2025-04-01",
        dateRange: "April 1-7, 2025",
      },
    ],
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="w-full px-8">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full">
          <VerticalMeetingCalendar experience={experience} />
        </div>
      </div>
    </div>
  )
}
