"use client"

import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import type { FormData, TimeSlot } from "../../types/calendar"

interface BookingFormProps {
  selectedDate: Date
  selectedSlot: string
  timeSlots: TimeSlot[]
  onSubmit: (data: FormData) => void
}

export default function BookingForm({ selectedDate, selectedSlot, timeSlots, onSubmit }: BookingFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({ mode: "onChange" })

  const watchedFields = watch()
  const isFormValid = !Object.keys(errors).length && watchedFields.name?.trim() && watchedFields.email?.trim()

  const selectedTimeSlot = timeSlots.find((slot) => slot.id === selectedSlot)

  return (
    <div className="flex-1 min-h-0 flex flex-col px-2">
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col mt-4 justify-around min-h-0">
        <div className="space-y-3 flex-shrink-0">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              {...register("name", { required: "Name is required" })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
              placeholder="Enter your full name"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: "Invalid email address",
                },
              })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
              placeholder="Enter your email"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={!isFormValid}
          whileHover={isFormValid ? { scale: 1.01 } : {}}
          whileTap={isFormValid ? { scale: 0.99 } : {}}
          className={`w-full font-medium py-2 px-4 rounded-md text-sm transition-colors mt-4 flex-shrink-0 ${
            !isFormValid
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-primary hover:bg-primary-hover text-white"
          }`}
        >
          Schedule Meeting
        </motion.button>
      </form>
    </div>
  )
}
