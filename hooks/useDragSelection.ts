import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { calculateDragSelection, throttleRAF, parseSlotId } from '../utils/dragUtils'

interface SelectionArea {
  startDateIndex: number
  endDateIndex: number
  startTimeIndex: number
  endTimeIndex: number
}

interface DragSelectionHook {
  availableTimes: Array<{ date: Date; slots: Array<{ start: string; end: string }> }>
  timeSlots: string[]
  onSelectionComplete: (selection: SelectionArea, mode: 'select' | 'deselect') => void
  isTimeSlotSelected: (dateIndex: number, timeIndex: number) => boolean
}

const useDragSelection = ({
  availableTimes,
  timeSlots,
  onSelectionComplete,
  isTimeSlotSelected,
}: DragSelectionHook) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select')
  const [dragStartCell, setDragStartCell] = useState<string | null>(null)
  const [dragCurrentCell, setDragCurrentCell] = useState<string | null>(null)

  const throttledUpdateRef = useRef<((slotId: string) => void) & { cancel?: () => void } | null>(null)

  const updateDragImmediate = useCallback((slotId: string) => {
    if (isDragging && slotId) {
      setDragCurrentCell(slotId)
    }
  }, [isDragging])

  // Create throttled version on mount
  useEffect(() => {
    throttledUpdateRef.current = throttleRAF(updateDragImmediate)
    return () => {
      if (throttledUpdateRef.current?.cancel) {
        throttledUpdateRef.current.cancel()
      }
    }
  }, [updateDragImmediate])

  const startDrag = useCallback((dateIndex: number, timeIndex: number, mode: 'select' | 'deselect') => {
    const slotId = `${dateIndex}-${timeIndex}`
    setIsDragging(true)
    setDragMode(mode)
    setDragStartCell(slotId)
    setDragCurrentCell(slotId)
  }, [])

  const updateDrag = useCallback((slotId: string) => {
    if (throttledUpdateRef.current) {
      throttledUpdateRef.current(slotId)
    }
  }, [])

  const endDrag = useCallback(() => {
    if (!isDragging || !dragStartCell || !dragCurrentCell) return

    const start = parseSlotId(dragStartCell)
    const end = parseSlotId(dragCurrentCell)
    const selection = calculateDragSelection(start, end)

    if (selection && onSelectionComplete) {
      onSelectionComplete(selection, dragMode)
    }

    setIsDragging(false)
    setDragMode('select')
    setDragStartCell(null)
    setDragCurrentCell(null)
  }, [isDragging, dragStartCell, dragCurrentCell, dragMode, onSelectionComplete])

  // Handle mouse down on time slot
  const handleTimeSlotMouseDown = useCallback((dateIndex: number, timeIndex: number) => {
    const isSelected = isTimeSlotSelected(dateIndex, timeIndex)
    const mode = isSelected ? 'deselect' : 'select'
    startDrag(dateIndex, timeIndex, mode)
  }, [startDrag, isTimeSlotSelected])

  // Handle mouse enter on time slot
  const handleTimeSlotMouseEnter = useCallback((dateIndex: number, timeIndex: number) => {
    if (!isDragging) return
    const slotId = `${dateIndex}-${timeIndex}`
    updateDrag(slotId)
  }, [isDragging, updateDrag])

  // Global mouse up handler
  useEffect(() => {
    if (!isDragging) return

    const handleGlobalMouseUp = () => {
      endDrag()
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Skip if we're over a time slot (handled by mouseenter)
      const target = e.target as HTMLElement
      if (target?.closest('[data-slot-id]')) return

      // If we're outside the time slots area, we could extend selection logic here
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('mousemove', handleGlobalMouseMove)

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [isDragging, endDrag])

  // Calculate current drag selection
  const dragSelection = useMemo(() => {
    if (!isDragging || !dragStartCell || !dragCurrentCell) {
      return null
    }

    const start = parseSlotId(dragStartCell)
    const end = parseSlotId(dragCurrentCell)
    return calculateDragSelection(start, end)
  }, [isDragging, dragStartCell, dragCurrentCell])

  // Check if a cell is in current drag selection
  const isCellInDragSelection = useCallback((dateIndex: number, timeIndex: number) => {
    if (!dragSelection) return false

    return (
      dateIndex >= dragSelection.startDateIndex &&
      dateIndex <= dragSelection.endDateIndex &&
      timeIndex >= dragSelection.startTimeIndex &&
      timeIndex <= dragSelection.endTimeIndex
    )
  }, [dragSelection])

  // Determine cell visual state
  const getCellState = useCallback((dateIndex: number, timeIndex: number) => {
    const isSelected = isTimeSlotSelected(dateIndex, timeIndex)
    const inDragSelection = isCellInDragSelection(dateIndex, timeIndex)

    if (!inDragSelection) {
      return isSelected ? 'selected' : 'default'
    }

    // Cell is in drag selection
    if (dragMode === 'select') {
      return isSelected ? 'selected' : 'will-select'
    } else {
      return isSelected ? 'will-deselect' : 'default'
    }
  }, [isTimeSlotSelected, isCellInDragSelection, dragMode])

  return {
    isDragging,
    dragMode,
    handleTimeSlotMouseDown,
    handleTimeSlotMouseEnter,
    getCellState,
    endDrag,
  }
}

export default useDragSelection