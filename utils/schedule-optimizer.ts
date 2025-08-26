export interface Candidate {
  id: string
  name: string
  email: string
  availableSlots: string[] // ['2024-01-15T09:00', '2024-01-15T10:00', ...]
}

export interface TimeSlot {
  id: string
  datetime: string // '2024-01-15T09:00'
  date: string
  startTime: string
  endTime: string
}

export interface ScheduleAssignment {
  candidate: Candidate
  slot: TimeSlot
  sessionId: string
}

export interface OptimizationResult {
  assignments: ScheduleAssignment[]
  unscheduledCandidates: Candidate[]
  utilizationRate: number
  totalSessions: number
  score: number
}

export class InterviewScheduleOptimizer {
  private interviewLength: number
  private simultaneousCount: number
  private availableSlots: TimeSlot[]

  constructor(
    interviewLength: number,
    simultaneousCount: number,
    availableSlots: TimeSlot[]
  ) {
    this.interviewLength = interviewLength
    this.simultaneousCount = simultaneousCount
    this.availableSlots = availableSlots
  }

  /**
   * 메인 스케줄링 함수
   */
  optimizeSchedule(candidates: Candidate[]): OptimizationResult {
    if (candidates.length <= 50) {
      return this.hybridOptimization(candidates)
    } else {
      return this.greedyOptimization(candidates)
    }
  }

  /**
   * 하이브리드 최적화 (소규모용)
   */
  private hybridOptimization(candidates: Candidate[]): OptimizationResult {
    // Phase 1: 제약이 많은 후보자 우선 배정
    const criticalCandidates = candidates
      .filter(c => c.availableSlots.length <= 3)
      .sort((a, b) => a.availableSlots.length - b.availableSlots.length)
    
    const regularCandidates = candidates
      .filter(c => c.availableSlots.length > 3)

    const assignments: ScheduleAssignment[] = []
    const slotOccupancy = new Map<string, number>()
    const sessionCounter = new Map<string, number>()

    // 제약이 많은 후보자부터 배정
    for (const candidate of criticalCandidates) {
      const assignment = this.assignCandidateToSlot(
        candidate, 
        slotOccupancy, 
        sessionCounter, 
        candidates
      )
      if (assignment) {
        assignments.push(assignment)
        slotOccupancy.set(assignment.slot.datetime, 
          (slotOccupancy.get(assignment.slot.datetime) || 0) + 1)
      }
    }

    // Phase 2: 남은 후보자들 배정
    for (const candidate of regularCandidates) {
      const assignment = this.assignCandidateToSlot(
        candidate, 
        slotOccupancy, 
        sessionCounter, 
        candidates
      )
      if (assignment) {
        assignments.push(assignment)
        slotOccupancy.set(assignment.slot.datetime, 
          (slotOccupancy.get(assignment.slot.datetime) || 0) + 1)
      }
    }

    return this.buildResult(assignments, candidates)
  }

  /**
   * 그리디 최적화 (대규모용)
   */
  private greedyOptimization(candidates: Candidate[]): OptimizationResult {
    const sortedCandidates = candidates.sort((a, b) => 
      a.availableSlots.length - b.availableSlots.length
    )

    const assignments: ScheduleAssignment[] = []
    const slotOccupancy = new Map<string, number>()
    const sessionCounter = new Map<string, number>()

    for (const candidate of sortedCandidates) {
      const assignment = this.assignCandidateToSlot(
        candidate, 
        slotOccupancy, 
        sessionCounter, 
        candidates
      )
      if (assignment) {
        assignments.push(assignment)
        slotOccupancy.set(assignment.slot.datetime, 
          (slotOccupancy.get(assignment.slot.datetime) || 0) + 1)
      }
    }

    return this.buildResult(assignments, candidates)
  }

  /**
   * 후보자를 최적 슬롯에 배정
   */
  private assignCandidateToSlot(
    candidate: Candidate,
    slotOccupancy: Map<string, number>,
    sessionCounter: Map<string, number>,
    allCandidates: Candidate[]
  ): ScheduleAssignment | null {
    let bestSlot: TimeSlot | null = null
    let bestScore = -1

    for (const slotDatetime of candidate.availableSlots) {
      const slot = this.availableSlots.find(s => s.datetime === slotDatetime)
      if (!slot) continue

      const currentOccupancy = slotOccupancy.get(slotDatetime) || 0
      if (currentOccupancy >= this.simultaneousCount) continue

      const score = this.calculateSlotScore(slot, allCandidates, slotOccupancy)
      if (score > bestScore) {
        bestScore = score
        bestSlot = slot
      }
    }

    if (!bestSlot) return null

    // 세션 ID 생성
    const sessionId = this.generateSessionId(bestSlot, sessionCounter)

    return {
      candidate,
      slot: bestSlot,
      sessionId
    }
  }

  /**
   * 슬롯 점수 계산
   */
  private calculateSlotScore(
    slot: TimeSlot,
    allCandidates: Candidate[],
    currentOccupancy: Map<string, number>
  ): number {
    // 이 슬롯을 선택할 수 있는 후보자 수
    const availableCandidates = allCandidates.filter(c => 
      c.availableSlots.includes(slot.datetime)
    ).length

    // 남은 수용 인원
    const remainingCapacity = this.simultaneousCount - (currentOccupancy.get(slot.datetime) || 0)

    // 기본 점수: 가능한 후보자 수 × 남은 수용량
    let score = availableCandidates * remainingCapacity

    // 보너스: 수용량을 완전히 활용할 수 있는 경우
    if (remainingCapacity === this.simultaneousCount) {
      score += 10
    }

    // 페널티: 이미 많이 사용된 슬롯
    const currentUsage = currentOccupancy.get(slot.datetime) || 0
    if (currentUsage > 0) {
      score -= currentUsage * 2
    }

    return remainingCapacity > 0 ? score : 0
  }

  /**
   * 세션 ID 생성
   */
  private generateSessionId(
    slot: TimeSlot,
    sessionCounter: Map<string, number>
  ): string {
    const slotKey = slot.datetime
    const sessionNum = (sessionCounter.get(slotKey) || 0) + 1
    sessionCounter.set(slotKey, sessionNum)

    const date = slot.date.replace(/-/g, '')
    const time = slot.startTime.replace(':', '')
    
    return `S${date}_${time}_${sessionNum}`
  }

  /**
   * 최종 결과 생성
   */
  private buildResult(assignments: ScheduleAssignment[], allCandidates: Candidate[]): OptimizationResult {
    const scheduledIds = new Set(assignments.map(a => a.candidate.id))
    const unscheduledCandidates = allCandidates.filter(c => !scheduledIds.has(c.id))
    
    const utilizationRate = assignments.length / allCandidates.length
    const totalSessions = new Set(assignments.map(a => a.sessionId)).size
    
    // 점수 계산
    const slotUtilization = this.calculateSlotUtilization(assignments)
    const score = utilizationRate * 0.7 + slotUtilization * 0.3

    return {
      assignments,
      unscheduledCandidates,
      utilizationRate,
      totalSessions,
      score
    }
  }

  /**
   * 슬롯 활용도 계산
   */
  private calculateSlotUtilization(assignments: ScheduleAssignment[]): number {
    const slotUsage = new Map<string, number>()
    
    assignments.forEach(assignment => {
      const key = assignment.slot.datetime
      slotUsage.set(key, (slotUsage.get(key) || 0) + 1)
    })

    if (slotUsage.size === 0) return 0

    const totalUtilization = Array.from(slotUsage.values())
      .reduce((sum, count) => sum + (count / this.simultaneousCount), 0)
    
    return totalUtilization / slotUsage.size
  }

  /**
   * 스케줄 결과를 그룹별로 정리
   */
  static groupAssignmentsBySession(assignments: ScheduleAssignment[]): Map<string, ScheduleAssignment[]> {
    const groups = new Map<string, ScheduleAssignment[]>()
    
    assignments.forEach(assignment => {
      const sessionId = assignment.sessionId
      if (!groups.has(sessionId)) {
        groups.set(sessionId, [])
      }
      groups.get(sessionId)!.push(assignment)
    })

    return groups
  }

  /**
   * 스케줄 결과를 날짜별로 정리
   */
  static groupAssignmentsByDate(assignments: ScheduleAssignment[]): Map<string, ScheduleAssignment[]> {
    const groups = new Map<string, ScheduleAssignment[]>()
    
    assignments.forEach(assignment => {
      const date = assignment.slot.date
      if (!groups.has(date)) {
        groups.set(date, [])
      }
      groups.get(date)!.push(assignment)
    })

    return groups
  }
}

/**
 * 편의 함수: 간단한 스케줄링
 */
export function optimizeInterviewSchedule(
  candidates: Candidate[],
  availableSlots: TimeSlot[],
  interviewLength: number,
  simultaneousCount: number
): OptimizationResult {
  const optimizer = new InterviewScheduleOptimizer(
    interviewLength,
    simultaneousCount,
    availableSlots
  )
  
  return optimizer.optimizeSchedule(candidates)
}