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

// 최대유량 알고리즘용 타입들
export interface FlowEdge {
  from: number
  to: number
  capacity: number
  flow: number
  reverse?: FlowEdge
}

export interface FlowNetwork {
  nodeCount: number
  source: number
  sink: number
  edges: FlowEdge[]
  candidateNodes: Map<string, number>
  sessionNodes: Map<string, number[]>
}

export interface MaxFlowResult {
  maxFlow: number
  assignments: ScheduleAssignment[]
}


export class InterviewScheduleOptimizer {
  private interviewLength: number
  private bufferTime: number
  private simultaneousCount: number
  private availableSlots: TimeSlot[]
  private actualInterviewSlots: TimeSlot[]

  constructor(
    interviewLength: number,
    bufferTime: number,
    simultaneousCount: number,
    availableSlots: TimeSlot[]
  ) {
    this.interviewLength = interviewLength
    this.bufferTime = bufferTime
    this.simultaneousCount = simultaneousCount
    this.availableSlots = availableSlots
    
    // create page와 동일한 로직으로 실제 면접 세션 계산
    this.actualInterviewSlots = this.calculateActualInterviewSessions()
  }

  /**
   * create page와 동일한 로직으로 면접 세션 계산
   */
  private calculateActualInterviewSessions(): TimeSlot[] {
    const sessions: TimeSlot[] = []
    const totalInterviewTime = this.interviewLength + this.bufferTime // 35분 간격

    console.log(`=== 세션 계산 시작 ===`)
    console.log(`면접시간: ${this.interviewLength}분, 버퍼: ${this.bufferTime}분, 총간격: ${totalInterviewTime}분`)

    // 날짜별로 그룹화
    const slotsByDate = new Map<string, TimeSlot[]>()
    this.availableSlots.forEach(slot => {
      if (!slotsByDate.has(slot.date)) {
        slotsByDate.set(slot.date, [])
      }
      slotsByDate.get(slot.date)!.push(slot)
      console.log(`원본 슬롯: ${slot.startTime}-${slot.endTime}`)
    })

    slotsByDate.forEach((daySlots, date) => {
      // 연속된 시간 범위들 찾기
      const timeRanges = this.findContinuousTimeRanges(daySlots)
      console.log(`날짜 ${date}의 연속 범위:`, timeRanges.map(r => `${Math.floor(r.start/60)}:${(r.start%60).toString().padStart(2,'0')}-${Math.floor(r.end/60)}:${(r.end%60).toString().padStart(2,'0')}`))
      
      timeRanges.forEach(range => {
        const totalMinutes = range.end - range.start
        const possibleSessions = Math.floor(totalMinutes / totalInterviewTime)
        console.log(`범위 ${Math.floor(range.start/60)}:${(range.start%60).toString().padStart(2,'0')}-${Math.floor(range.end/60)}:${(range.end%60).toString().padStart(2,'0')} (${totalMinutes}분) → 가능 세션: ${possibleSessions}개`)
        
        // 각 면접 세션 생성
        for (let session = 0; session < possibleSessions; session++) {
          const sessionStartMinutes = range.start + (session * totalInterviewTime)
          const sessionEndMinutes = sessionStartMinutes + this.interviewLength
          
          console.log(`세션 ${session}: 시작=${sessionStartMinutes}분, 끝=${sessionEndMinutes}분, 범위끝=${range.end}분`)
          
          // 면접 종료 시간이 범위를 벗어나는지 확인
          if (sessionEndMinutes > range.end) {
            console.log(`  → 범위 초과로 스킵`)
            break // 이 세션은 범위를 벗어남
          }
          
          const startHour = Math.floor(sessionStartMinutes / 60)
          const startMinute = sessionStartMinutes % 60
          const endHour = Math.floor(sessionEndMinutes / 60)
          const endMinute = sessionEndMinutes % 60
          
          const startTime = `${startHour.toString().padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}`
          const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`
          
          console.log(`  → 생성된 세션: ${startTime}-${endTime}`)
          
          sessions.push({
            id: `${date}-${startTime}`,
            datetime: `${date}T${startTime}`,
            date,
            startTime,
            endTime
          })
        }
      })
    })

    console.log(`=== 최종 생성된 세션 ===`)
    sessions.forEach(s => console.log(`${s.startTime}-${s.endTime}`))
    console.log(`=== 세션 계산 완료 ===`)

    return sessions
  }

  /**
   * 연속된 시간 범위 찾기
   */
  private findContinuousTimeRanges(slots: TimeSlot[]): Array<{start: number, end: number}> {
    const sortedSlots = slots.sort((a, b) => a.startTime.localeCompare(b.startTime))
    const ranges: Array<{start: number, end: number}> = []
    
    let currentRangeStart = this.timeToMinutes(sortedSlots[0].startTime)
    let currentRangeEnd = this.timeToMinutes(sortedSlots[0].endTime)
    
    for (let i = 1; i < sortedSlots.length; i++) {
      const slotStart = this.timeToMinutes(sortedSlots[i].startTime)
      const slotEnd = this.timeToMinutes(sortedSlots[i].endTime)
      
      if (slotStart === currentRangeEnd) {
        // 연속된 슬롯
        currentRangeEnd = slotEnd
      } else {
        // 새로운 범위 시작
        ranges.push({start: currentRangeStart, end: currentRangeEnd})
        currentRangeStart = slotStart
        currentRangeEnd = slotEnd
      }
    }
    
    ranges.push({start: currentRangeStart, end: currentRangeEnd})
    return ranges
  }

  /**
   * 시간을 분 단위로 변환
   */
  private timeToMinutes(time: string): number {
    const [hour, minute] = time.split(':').map(Number)
    return hour * 60 + minute
  }

  /**
   * 최대유량 알고리즘을 이용한 최적 스케줄링
   */
  optimizeScheduleMaxFlow(candidates: Candidate[]): OptimizationResult {
    console.log(`=== 최대유량 알고리즘 시작 ===`)
    console.log(`후보자 ${candidates.length}명, 실제 세션 ${this.actualInterviewSlots.length}개`)
    
    // 네트워크 플로우 그래프 구축
    const flowNetwork = this.buildFlowNetwork(candidates)
    console.log(`네트워크 노드: ${flowNetwork.nodeCount}개, 간선: ${flowNetwork.edges.length}개`)
    
    // Dinic 알고리즘으로 최대유량 계산
    const maxFlowResult = this.dinicMaxFlow(flowNetwork, candidates)
    console.log(`최대유량: ${maxFlowResult.maxFlow}, 배정수: ${maxFlowResult.assignments.length}`)
    
    console.log(`=== 최대유량 알고리즘 완료: ${maxFlowResult.assignments.length}/${candidates.length}명 ===`)
    
    // 미배정 참가자들을 위한 후처리 - 새로운 세션 동적 생성
    const unscheduledCandidates = candidates.filter(c => 
      !maxFlowResult.assignments.find(a => a.candidate.id === c.id)
    )
    
    if (unscheduledCandidates.length > 0) {
      console.log(`=== 미배정 참가자 후처리 시작: ${unscheduledCandidates.length}명 ===`)
      const additionalAssignments = this.postProcessUnscheduled(unscheduledCandidates, maxFlowResult.assignments)
      maxFlowResult.assignments.push(...additionalAssignments)
      console.log(`=== 후처리 완료: ${additionalAssignments.length}명 추가 배정 ===`)
    }
    
    return this.buildResult(maxFlowResult.assignments, candidates)
  }

  /**
   * 간단한 그리디 스케줄링 - 제약 많은 후보자 우선
   */
  optimizeSchedule(candidates: Candidate[]): OptimizationResult {
    const assignments: ScheduleAssignment[] = []
    const sessionUsage = new Map<string, number>() // 세션별 현재 배정 인원
    
    // 1. 제약이 많은 후보자부터 정렬 (가용 시간 적은 순)
    const sortedCandidates = candidates.sort((a, b) => 
      a.availableSlots.length - b.availableSlots.length
    )
    
    console.log(`=== 그리디 배정 시작 ===`)
    console.log(`후보자 ${candidates.length}명, 실제 세션 ${this.actualInterviewSlots.length}개`)
    
    // 2. 각 후보자를 최적 세션에 배정
    for (const candidate of sortedCandidates) {
      const assignment = this.assignCandidateGreedy(candidate, sessionUsage)
      if (assignment) {
        assignments.push(assignment)
        const sessionKey = assignment.slot.datetime
        sessionUsage.set(sessionKey, (sessionUsage.get(sessionKey) || 0) + 1)
        
        console.log(`✅ ${candidate.name} → ${assignment.slot.startTime}-${assignment.slot.endTime} (${sessionUsage.get(sessionKey)}/${this.simultaneousCount}명)`)
      } else {
        console.log(`❌ ${candidate.name} → 배정 불가`)
      }
    }
    
    console.log(`=== 그리디 배정 완료: ${assignments.length}/${candidates.length}명 ===`)
    
    // 미배정 참가자들을 위한 후처리 - 새로운 세션 동적 생성
    const unscheduledCandidates = candidates.filter(c => 
      !assignments.find(a => a.candidate.id === c.id)
    )
    
    if (unscheduledCandidates.length > 0) {
      console.log(`=== 미배정 참가자 후처리 시작: ${unscheduledCandidates.length}명 ===`)
      const additionalAssignments = this.postProcessUnscheduled(unscheduledCandidates, assignments)
      assignments.push(...additionalAssignments)
      console.log(`=== 후처리 완료: ${additionalAssignments.length}명 추가 배정 ===`)
    }
    
    return this.buildResult(assignments, candidates)
  }

  /**
   * 그리디 방식으로 후보자를 최적 세션에 배정
   */
  private assignCandidateGreedy(candidate: Candidate, sessionUsage: Map<string, number>): ScheduleAssignment | null {
    let bestSession: TimeSlot | null = null
    let bestScore = -1

    console.log(`\n🔍 [${candidate.name}] 배정 시도 - 가능 슬롯: ${candidate.availableSlots.length}개`)
    console.log(`   후보자 가능 시간:`, candidate.availableSlots)
    console.log(`   검토할 실제 세션: ${this.actualInterviewSlots.length}개`)
    
    // 후보자의 실제 시간 범위도 확인해보자
    console.log(`   🔍 후보자 실제 시간 범위:`)
    candidate.availableSlots.forEach(slotTime => {
      const slot = this.availableSlots.find(s => s.datetime === slotTime)
      if (slot) {
        console.log(`      ${slotTime} → ${slot.startTime}-${slot.endTime}`)
      } else {
        console.log(`      ${slotTime} → ❌ 원본 슬롯을 찾을 수 없음`)
      }
    })

    // 후보자가 참석 가능한 모든 실제 세션 중에서 최적 선택
    for (const session of this.actualInterviewSlots) {
      console.log(`\n   📅 세션 검토: ${session.startTime}-${session.endTime} (${session.datetime})`)
      
      // 1. 후보자가 이 세션에 참석 가능한가?
      const canAttend = this.canCandidateAttendSession(candidate, session)
      console.log(`      ✅ 참석 가능: ${canAttend}`)
      if (!canAttend) {
        console.log(`      ❌ 세션 ${session.startTime}-${session.endTime} 스킵: 참석 불가`)
        continue
      }

      // 2. 세션에 자리가 있는가?
      const currentCount = sessionUsage.get(session.datetime) || 0
      console.log(`      👥 현재 배정: ${currentCount}/${this.simultaneousCount}`)
      if (currentCount >= this.simultaneousCount) {
        console.log(`      ❌ 자리 없음`)
        continue
      }

      // 3. 세션 점수 계산 (슬롯 효율 중심)
      const score = this.calculateGreedyScore(session, currentCount, candidate)
      console.log(`      🎯 점수: ${score} (현재 최고: ${bestScore})`)
      if (score > bestScore) {
        bestScore = score
        bestSession = session
        console.log(`      🌟 새로운 최적 세션 선택됨!`)
      }
    }

    if (!bestSession) {
      console.log(`   ❌ [${candidate.name}] 배정 불가 - 적합한 세션 없음`)
      return null
    }

    // 세션 ID 생성 (동시 면접은 같은 ID 사용)
    const sessionId = this.generateSessionId(bestSession, 1)

    console.log(`   ✅ [${candidate.name}] → ${bestSession.startTime}-${bestSession.endTime} (점수: ${bestScore})`)

    return {
      candidate,
      slot: bestSession,
      sessionId
    }
  }

  /**
   * 그리디 점수 계산 - 슬롯 효율성 우선
   */
  private calculateGreedyScore(session: TimeSlot, currentCount: number, candidate: Candidate): number {
    let score = 100

    // 높은 우선순위: 슬롯을 꽉 채울 수 있는 경우
    if (currentCount === this.simultaneousCount - 1) {
      score += 50 // 슬롯 완성 보너스
    }

    // 중간 우선순위: 이미 사람이 있는 슬롯 (효율성)
    if (currentCount > 0) {
      score += 20
    }

    // 낮은 우선순위: 빈 슬롯 (새로 시작)
    if (currentCount === 0) {
      score += 5
    }

    // 제약이 적은 후보자는 약간 낮은 우선순위
    if (candidate.availableSlots.length > 3) {
      score -= 5
    }

    return score
  }

  /**
   * 지원자가 특정 세션에 참석 가능한지 확인 (연속된 시간 범위 고려)
   */
  private canCandidateAttendSession(candidate: Candidate, session: TimeSlot): boolean {
    console.log(`      🔍 후보자 ${candidate.name}의 세션 ${session.startTime}-${session.endTime} 참석 가능성 확인`)
    
    // 후보자의 연속된 시간 범위들 계산
    const candidateRanges = this.getCandidateContinuousRanges(candidate, session.date)
    console.log(`         후보자의 연속 시간 범위:`, candidateRanges.map(r => `${Math.floor(r.start/60)}:${(r.start%60).toString().padStart(2,'0')}-${Math.floor(r.end/60)}:${(r.end%60).toString().padStart(2,'0')}`))
    
    const sessionStart = this.timeToMinutes(session.startTime)
    const sessionEnd = this.timeToMinutes(session.endTime)
    console.log(`         세션 시간: ${sessionStart}-${sessionEnd}분`)
    
    // 세션이 어떤 연속 범위에라도 완전히 포함되는지 확인
    for (const range of candidateRanges) {
      if (sessionStart >= range.start && sessionEnd <= range.end) {
        console.log(`         ✅ 매치: 세션이 범위 ${Math.floor(range.start/60)}:${(range.start%60).toString().padStart(2,'0')}-${Math.floor(range.end/60)}:${(range.end%60).toString().padStart(2,'0')} 내에 포함됨`)
        return true
      }
    }
    
    console.log(`      ❌ ${candidate.name}은 세션 ${session.startTime}-${session.endTime}에 참석 불가`)
    return false
  }

  /**
   * 후보자의 연속된 시간 범위 계산
   */
  private getCandidateContinuousRanges(candidate: Candidate, targetDate: string): Array<{start: number, end: number}> {
    // 해당 날짜의 후보자 슬롯들만 필터링
    const candidateDateSlots = candidate.availableSlots
      .map(slotTime => this.availableSlots.find(slot => slot.datetime === slotTime))
      .filter(slot => slot && slot.date === targetDate)
      .sort((a, b) => a!.startTime.localeCompare(b!.startTime)) as TimeSlot[]

    if (candidateDateSlots.length === 0) return []

    const ranges: Array<{start: number, end: number}> = []
    let currentRangeStart = this.timeToMinutes(candidateDateSlots[0].startTime)
    let currentRangeEnd = this.timeToMinutes(candidateDateSlots[0].endTime)

    for (let i = 1; i < candidateDateSlots.length; i++) {
      const slotStart = this.timeToMinutes(candidateDateSlots[i].startTime)
      const slotEnd = this.timeToMinutes(candidateDateSlots[i].endTime)

      if (slotStart === currentRangeEnd) {
        // 연속된 슬롯
        currentRangeEnd = slotEnd
      } else {
        // 새로운 범위 시작
        ranges.push({start: currentRangeStart, end: currentRangeEnd})
        currentRangeStart = slotStart
        currentRangeEnd = slotEnd
      }
    }

    ranges.push({start: currentRangeStart, end: currentRangeEnd})
    return ranges
  }

  /**
   * 미배정 참가자를 위한 후처리 - 새로운 세션 동적 생성
   */
  private postProcessUnscheduled(unscheduledCandidates: Candidate[], existingAssignments: ScheduleAssignment[]): ScheduleAssignment[] {
    const additionalAssignments: ScheduleAssignment[] = []
    const allAssignments = [...existingAssignments] // 기존 + 추가된 배정들 추적

    for (const candidate of unscheduledCandidates) {
      console.log(`\n🔄 [${candidate.name}] 후처리 배정 시도`)
      
      // 참가자의 연속 시간 범위들 계산
      const candidateRangesByDate = new Map<string, Array<{start: number, end: number}>>()
      
      // 날짜별로 연속 범위 계산
      const dateSlots = new Map<string, TimeSlot[]>()
      candidate.availableSlots.forEach(slotTime => {
        const slot = this.availableSlots.find(s => s.datetime === slotTime)
        if (slot) {
          if (!dateSlots.has(slot.date)) {
            dateSlots.set(slot.date, [])
          }
          dateSlots.get(slot.date)!.push(slot)
        }
      })

      dateSlots.forEach((daySlots, date) => {
        const ranges = this.getCandidateContinuousRanges(candidate, date)
        candidateRangesByDate.set(date, ranges)
        console.log(`   날짜 ${date}의 연속 범위:`, ranges.map(r => `${Math.floor(r.start/60)}:${(r.start%60).toString().padStart(2,'0')}-${Math.floor(r.end/60)}:${(r.end%60).toString().padStart(2,'0')}`))
      })

      // 각 날짜의 각 범위에서 가능한 면접 시작점 찾기
      let assigned = false
      for (const [date, ranges] of candidateRangesByDate) {
        if (assigned) break
        
        for (const range of ranges) {
          if (assigned) break
          
          // 면접을 시작할 수 있는 가능한 시점들 (1분 단위로 체크)
          const latestStartTime = range.end - this.interviewLength
          
          for (let startMinute = range.start; startMinute <= latestStartTime; startMinute++) {
            const interviewEndMinute = startMinute + this.interviewLength
            const bufferEndMinute = interviewEndMinute + this.bufferTime
            
            console.log(`     시도: ${Math.floor(startMinute/60)}:${(startMinute%60).toString().padStart(2,'0')}-${Math.floor(interviewEndMinute/60)}:${(interviewEndMinute%60).toString().padStart(2,'0')} (버퍼:${Math.floor(bufferEndMinute/60)}:${(bufferEndMinute%60).toString().padStart(2,'0')})`)
            
            // 기존 배정들과 충돌하는지 확인
            const hasConflict = this.hasTimeConflict(
              date, 
              startMinute, 
              bufferEndMinute, 
              allAssignments
            )
            
            if (!hasConflict) {
              // 새로운 세션 생성
              const newSession = this.createDynamicSession(date, startMinute, interviewEndMinute)
              const sessionId = this.generateSessionId(newSession, 1)
              
              const assignment: ScheduleAssignment = {
                candidate,
                slot: newSession,
                sessionId
              }
              
              additionalAssignments.push(assignment)
              allAssignments.push(assignment)
              
              console.log(`     ✅ 새 세션 생성: ${newSession.startTime}-${newSession.endTime}`)
              assigned = true
              break
            } else {
              console.log(`     ❌ 충돌 발생`)
            }
          }
        }
      }
      
      if (!assigned) {
        console.log(`   ❌ [${candidate.name}] 후처리에서도 배정 불가`)
      }
    }

    return additionalAssignments
  }

  /**
   * 특정 시간대에 기존 배정들과 충돌이 있는지 확인
   */
  private hasTimeConflict(date: string, startMinute: number, bufferEndMinute: number, assignments: ScheduleAssignment[]): boolean {
    for (const assignment of assignments) {
      if (assignment.slot.date !== date) continue
      
      const assignmentStart = this.timeToMinutes(assignment.slot.startTime)
      const assignmentEnd = this.timeToMinutes(assignment.slot.endTime) + this.bufferTime
      
      // 겹치는지 확인
      if (!(bufferEndMinute <= assignmentStart || startMinute >= assignmentEnd)) {
        return true // 충돌 발생
      }
    }
    return false // 충돌 없음
  }

  /**
   * 동적으로 새로운 세션 생성
   */
  private createDynamicSession(date: string, startMinute: number, endMinute: number): TimeSlot {
    const startHour = Math.floor(startMinute / 60)
    const startMin = startMinute % 60
    const endHour = Math.floor(endMinute / 60)
    const endMin = endMinute % 60
    
    const startTime = `${startHour.toString().padStart(2, "0")}:${startMin.toString().padStart(2, "0")}`
    const endTime = `${endHour.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")}`
    
    return {
      id: `dynamic-${date}-${startTime}`,
      datetime: `${date}T${startTime}`,
      date,
      startTime,
      endTime
    }
  }

  /**
   * 세션 ID 생성
   */
  private generateSessionId(slot: TimeSlot, sessionNum: number): string {
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
    
    // 사용된 세션 수 계산
    const usedSessions = new Set(assignments.map(a => a.slot.datetime))
    const totalSessions = usedSessions.size
    
    // 점수 계산: 슬롯 활용도 기반
    const slotUtilization = this.calculateSlotUtilization(assignments)
    const score = utilizationRate * 0.4 + slotUtilization * 0.6

    return {
      assignments,
      unscheduledCandidates,
      utilizationRate,
      totalSessions,
      score
    }
  }

  /**
   * 슬롯 활용도 계산 - 배정 결과 기반
   */
  private calculateSlotUtilization(assignments: ScheduleAssignment[]): number {
    if (assignments.length === 0) return 0

    // 세션별 배정 인원 계산
    const sessionUsage = new Map<string, number>()
    assignments.forEach(assignment => {
      const sessionKey = assignment.slot.datetime
      sessionUsage.set(sessionKey, (sessionUsage.get(sessionKey) || 0) + 1)
    })

    if (sessionUsage.size === 0) return 0

    // 각 세션의 활용도 계산 (배정인원 / 최대인원)
    const totalUtilization = Array.from(sessionUsage.values())
      .reduce((sum, count) => sum + (count / this.simultaneousCount), 0)
    
    return totalUtilization / sessionUsage.size
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

  // ==================== 최대유량 알고리즘 구현 ====================

  /**
   * 플로우 네트워크 구축
   */
  private buildFlowNetwork(candidates: Candidate[]): FlowNetwork {
    let nodeId = 0
    const SOURCE = nodeId++
    const SINK = nodeId++

    // 후보자 노드들
    const candidateNodes = new Map<string, number>()
    candidates.forEach(candidate => {
      candidateNodes.set(candidate.email, nodeId++)
    })

    // 세션 노드들 (동시 면접 인원수만큼 복제)
    const sessionNodes = new Map<string, number[]>()
    this.actualInterviewSlots.forEach(session => {
      const nodes: number[] = []
      for (let i = 0; i < this.simultaneousCount; i++) {
        nodes.push(nodeId++)
      }
      sessionNodes.set(session.datetime, nodes)
    })

    const edges: FlowEdge[] = []

    // Source → 후보자 (용량 1)
    candidates.forEach(candidate => {
      const candidateNode = candidateNodes.get(candidate.email)!
      edges.push({ from: SOURCE, to: candidateNode, capacity: 1, flow: 0 })
    })

    // 후보자 → 가능한 세션들 (용량 1)
    candidates.forEach(candidate => {
      const candidateNode = candidateNodes.get(candidate.email)!
      
      this.actualInterviewSlots.forEach(session => {
        if (this.canCandidateAttendSession(candidate, session)) {
          const sessionNodeList = sessionNodes.get(session.datetime)!
          sessionNodeList.forEach(sessionNode => {
            edges.push({ from: candidateNode, to: sessionNode, capacity: 1, flow: 0 })
          })
        }
      })
    })

    // 세션들 → Sink (용량 1)
    sessionNodes.forEach(nodes => {
      nodes.forEach(sessionNode => {
        edges.push({ from: sessionNode, to: SINK, capacity: 1, flow: 0 })
      })
    })

    return {
      nodeCount: nodeId,
      source: SOURCE,
      sink: SINK,
      edges,
      candidateNodes,
      sessionNodes
    }
  }

  /**
   * Dinic 최대유량 알고리즘
   */
  private dinicMaxFlow(network: FlowNetwork, candidates: Candidate[]): MaxFlowResult {
    let maxFlow = 0
    
    // 인접 리스트 구축
    const graph = this.buildAdjacencyList(network)

    while (true) {
      // BFS로 레벨 그래프 구축
      const levels = this.bfsLevels(graph, network.source, network.sink)
      if (levels[network.sink] === -1) break

      // DFS로 블로킹 플로우 찾기
      const iter = new Array(network.nodeCount).fill(0)
      let flow: number
      while ((flow = this.dfsFlow(graph, network.source, network.sink, Infinity, levels, iter)) > 0) {
        maxFlow += flow
      }
    }

    // 결과에서 배정 추출
    const assignments = this.extractAssignments(network, graph, candidates)
    
    return { maxFlow, assignments }
  }

  private buildAdjacencyList(network: FlowNetwork): FlowEdge[][] {
    const graph: FlowEdge[][] = Array.from({ length: network.nodeCount }, () => [])
    
    network.edges.forEach(edge => {
      graph[edge.from].push(edge)
      // 역방향 간선 추가 (용량 0)
      graph[edge.to].push({ from: edge.to, to: edge.from, capacity: 0, flow: 0, reverse: edge })
      edge.reverse = graph[edge.to][graph[edge.to].length - 1]
    })
    
    return graph
  }

  private bfsLevels(graph: FlowEdge[][], source: number, sink: number): number[] {
    const levels = new Array(graph.length).fill(-1)
    const queue: number[] = [source]
    levels[source] = 0
    
    let front = 0
    while (front < queue.length) {
      const node = queue[front++]
      
      for (const edge of graph[node]) {
        if (levels[edge.to] === -1 && edge.capacity > edge.flow) {
          levels[edge.to] = levels[node] + 1
          queue.push(edge.to)
        }
      }
    }
    
    return levels
  }

  private dfsFlow(graph: FlowEdge[][], node: number, sink: number, flow: number, levels: number[], iter: number[]): number {
    if (node === sink) return flow
    
    while (iter[node] < graph[node].length) {
      const edge = graph[node][iter[node]]
      
      if (levels[edge.to] === levels[node] + 1 && edge.capacity > edge.flow) {
        const minFlow = Math.min(flow, edge.capacity - edge.flow)
        const result = this.dfsFlow(graph, edge.to, sink, minFlow, levels, iter)
        
        if (result > 0) {
          edge.flow += result
          if (edge.reverse) edge.reverse.flow -= result
          return result
        }
      }
      
      iter[node]++
    }
    
    return 0
  }

  private extractAssignments(network: FlowNetwork, graph: FlowEdge[][], originalCandidates: Candidate[]): ScheduleAssignment[] {
    const assignments: ScheduleAssignment[] = []
    
    // 후보자에서 세션으로 가는 플로우가 1인 간선들 찾기
    network.candidateNodes.forEach((candidateNode, email) => {
      const candidate = originalCandidates.find(c => c.email === email)
      if (!candidate) return
      
      for (const edge of graph[candidateNode]) {
        if (edge.flow === 1) {
          // 어느 세션인지 찾기
          for (const [sessionDatetime, sessionNodes] of network.sessionNodes) {
            if (sessionNodes.includes(edge.to)) {
              const session = this.actualInterviewSlots.find(s => s.datetime === sessionDatetime)!
              const sessionId = this.generateSessionId(session, 1)
              
              assignments.push({
                candidate,
                slot: session,
                sessionId
              })
              break
            }
          }
          break
        }
      }
    })
    
    return assignments
  }
}

/**
 * 편의 함수: 간단한 스케줄링
 */
export function optimizeInterviewSchedule(
  candidates: Candidate[],
  availableSlots: TimeSlot[],
  interviewLength: number,
  bufferTime: number,
  simultaneousCount: number
): OptimizationResult {
  const optimizer = new InterviewScheduleOptimizer(
    interviewLength,
    bufferTime,
    simultaneousCount,
    availableSlots
  )
  
  return optimizer.optimizeSchedule(candidates)
}