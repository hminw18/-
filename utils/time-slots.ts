import type { TimeSlot } from "../types/calendar"

export const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = []
  const startHour = 9
  const endHour = 17

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 45) {
      if (hour === 16 && minute > 15) break

      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      const endMinute = minute + 45
      const endHour = endMinute >= 60 ? hour + 1 : hour
      const endTimeString = `${endHour.toString().padStart(2, "0")}:${(endMinute % 60).toString().padStart(2, "0")}`

      if (Math.random() > 0.3) {
        slots.push({
          id: `${hour}-${minute}`,
          time: `${timeString} - ${endTimeString}`,
        })
      }
    }
  }

  return slots
}
