"use client"

import { motion } from "framer-motion"

interface LoadingSpinnerProps {
  message?: string
}

export default function LoadingSpinner({ message = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className="text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        className="w-6 h-6 mx-auto mb-3 border-2 border-primary border-t-transparent rounded-full"
      />
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  )
}
