import type { TimeSlot } from "../types/calendar"

export const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = []
  const startHour = 9
  const endHour = 18

  for (let hour = startHour; hour < endHour; hour++) {
    const timeString = `${hour.toString().padStart(2, "0")}:00`
    const endTimeString = `${(hour + 1).toString().padStart(2, "0")}:00`

    slots.push({
      id: `${hour}-00`,
      time: `${timeString} - ${endTimeString}`,
    })
  }

  return slots
}
