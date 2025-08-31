"use client"

import { useState } from 'react'
import { Play, RotateCcw, Users, Clock, Calendar, Plus, Trash2, Edit3 } from 'lucide-react'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import AppHeader from '../../components/ui/app-header'
import { InterviewScheduleOptimizer, TimeSlot, Candidate, ScheduleAssignment } from '../../utils/schedule-optimizer'

interface TestData {
  candidates: Candidate[]
  timeSlots: TimeSlot[]
  interviewLength: number
  bufferTime: number
  simultaneousCount: number
}

export default function TestSchedulerPage() {
  const [testData, setTestData] = useState<TestData>({
    candidates: [
      { id: '1', name: '김철수', email: 'kim@test.com', availableSlots: ['2024-12-01T09:00', '2024-12-01T10:00', '2024-12-01T11:00'] },
      { id: '2', name: '이영희', email: 'lee@test.com', availableSlots: ['2024-12-01T09:00', '2024-12-01T10:00'] },
      { id: '3', name: '박민수', email: 'park@test.com', availableSlots: ['2024-12-01T09:00', '2024-12-01T14:00'] },
      { id: '4', name: '정수연', email: 'jung@test.com', availableSlots: ['2024-12-01T10:00', '2024-12-01T11:00', '2024-12-01T14:00'] },
      { id: '5', name: '최대호', email: 'choi@test.com', availableSlots: ['2024-12-01T11:00', '2024-12-01T14:00'] },
      { id: '6', name: '임하늘', email: 'lim@test.com', availableSlots: ['2024-12-01T09:00', '2024-12-01T10:00', '2024-12-01T11:00', '2024-12-01T14:00'] },
    ],
    timeSlots: [
      { id: '1', datetime: '2024-12-01T09:00', date: '2024-12-01', startTime: '09:00', endTime: '09:30' },
      { id: '2', datetime: '2024-12-01T09:30', date: '2024-12-01', startTime: '09:30', endTime: '10:00' },
      { id: '3', datetime: '2024-12-01T10:00', date: '2024-12-01', startTime: '10:00', endTime: '10:30' },
      { id: '4', datetime: '2024-12-01T10:30', date: '2024-12-01', startTime: '10:30', endTime: '11:00' },
      { id: '5', datetime: '2024-12-01T11:00', date: '2024-12-01', startTime: '11:00', endTime: '11:30' },
      { id: '6', datetime: '2024-12-01T14:00', date: '2024-12-01', startTime: '14:00', endTime: '14:30' },
      { id: '7', datetime: '2024-12-01T14:30', date: '2024-12-01', startTime: '14:30', endTime: '15:00' },
    ],
    interviewLength: 25,
    bufferTime: 10,
    simultaneousCount: 2
  })

  const [editingCandidate, setEditingCandidate] = useState<string | null>(null)
  const [editingTimeSlot, setEditingTimeSlot] = useState<string | null>(null)
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<'greedy' | 'maxflow'>('greedy')

  const [results, setResults] = useState<{
    assignments: ScheduleAssignment[]
    unscheduledCandidates: Candidate[]
    utilizationRate: number
    totalSessions: number
    score: number
  } | null>(null)

  const runTest = () => {
    const optimizer = new InterviewScheduleOptimizer(
      testData.interviewLength,
      testData.bufferTime,
      testData.simultaneousCount,
      testData.timeSlots
    )

    let result
    if (selectedAlgorithm === 'greedy') {
      result = optimizer.optimizeSchedule(testData.candidates)
    } else {
      result = optimizer.optimizeScheduleMaxFlow(testData.candidates)
    }
    
    setResults(result)
  }

  const resetTest = () => {
    setResults(null)
  }

  const addCandidate = () => {
    const newId = (testData.candidates.length + 1).toString()
    const randomSlots = testData.timeSlots
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 3) + 1)
      .map(slot => slot.datetime)

    setTestData(prev => ({
      ...prev,
      candidates: [
        ...prev.candidates,
        {
          id: newId,
          name: `테스트${newId}`,
          email: `test${newId}@example.com`,
          availableSlots: randomSlots
        }
      ]
    }))
  }

  const addTimeSlot = () => {
    const newId = (testData.timeSlots.length + 1).toString()
    
    // 기존 시간대 중 가장 늦은 시간 찾기
    const lastSlot = testData.timeSlots
      .map(slot => {
        const [hour, minute] = slot.startTime.split(':').map(Number)
        return hour * 60 + minute
      })
      .sort((a, b) => b - a)[0] || 480 // 기본값: 8:00 (480분)
    
    // 30분 추가
    const newTimeMinutes = lastSlot + 30
    const hour = Math.floor(newTimeMinutes / 60)
    const minute = newTimeMinutes % 60
    
    const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    const endHour = minute === 30 ? hour + 1 : hour
    const endMinute = minute === 30 ? 0 : 30
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
    
    setTestData(prev => ({
      ...prev,
      timeSlots: [
        ...prev.timeSlots,
        {
          id: newId,
          datetime: `2024-12-01T${startTime}`,
          date: '2024-12-01',
          startTime,
          endTime
        }
      ]
    }))
  }

  const removeCandidate = (candidateId: string) => {
    setTestData(prev => ({
      ...prev,
      candidates: prev.candidates.filter(c => c.id !== candidateId)
    }))
  }

  const removeTimeSlot = (slotId: string) => {
    const slotToRemove = testData.timeSlots.find(s => s.id === slotId)
    if (!slotToRemove) return

    setTestData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter(s => s.id !== slotId),
      candidates: prev.candidates.map(candidate => ({
        ...candidate,
        availableSlots: candidate.availableSlots.filter(slot => slot !== slotToRemove.datetime)
      }))
    }))
  }

  const toggleCandidateSlot = (candidateId: string, slotDatetime: string) => {
    setTestData(prev => ({
      ...prev,
      candidates: prev.candidates.map(candidate => {
        if (candidate.id !== candidateId) return candidate
        
        const hasSlot = candidate.availableSlots.includes(slotDatetime)
        return {
          ...candidate,
          availableSlots: hasSlot 
            ? candidate.availableSlots.filter(slot => slot !== slotDatetime)
            : [...candidate.availableSlots, slotDatetime]
        }
      })
    }))
  }

  const updateCandidateName = (candidateId: string, name: string) => {
    setTestData(prev => ({
      ...prev,
      candidates: prev.candidates.map(candidate => 
        candidate.id === candidateId ? { ...candidate, name } : candidate
      )
    }))
  }

  const updateTimeSlotTime = (slotId: string, startTime: string) => {
    const [hour, minute] = startTime.split(':').map(Number)
    const endHour = minute === 30 ? hour + 1 : hour
    const endMinute = minute === 30 ? 0 : 30
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
    
    setTestData(prev => {
      const oldSlot = prev.timeSlots.find(s => s.id === slotId)
      const newDatetime = `2024-12-01T${startTime}`
      
      return {
        ...prev,
        timeSlots: prev.timeSlots.map(slot => 
          slot.id === slotId ? {
            ...slot,
            datetime: newDatetime,
            startTime,
            endTime
          } : slot
        ),
        candidates: prev.candidates.map(candidate => ({
          ...candidate,
          availableSlots: candidate.availableSlots.map(slot => 
            slot === oldSlot?.datetime ? newDatetime : slot
          )
        }))
      }
    })
  }

  const groupedAssignments = results ? 
    results.assignments.reduce((groups, assignment) => {
      const key = assignment.slot.datetime
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(assignment)
      return groups
    }, {} as Record<string, ScheduleAssignment[]>) : {}

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <AppHeader>
          <div className="flex items-center justify-between w-full">
            <h1 className="text-xl font-semibold text-gray-900">스케줄러 로직 테스트</h1>
          </div>
        </AppHeader>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 설정 영역 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* 테스트 설정 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">테스트 설정</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">면접 시간 (분)</label>
                    <input
                      type="number"
                      value={testData.interviewLength}
                      onChange={(e) => setTestData(prev => ({ ...prev, interviewLength: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">버퍼 시간 (분)</label>
                    <input
                      type="number"
                      value={testData.bufferTime}
                      onChange={(e) => setTestData(prev => ({ ...prev, bufferTime: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">동시 면접 인원</label>
                    <input
                      type="number"
                      value={testData.simultaneousCount}
                      onChange={(e) => setTestData(prev => ({ ...prev, simultaneousCount: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">알고리즘 선택</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="algorithm"
                        value="greedy"
                        checked={selectedAlgorithm === 'greedy'}
                        onChange={(e) => setSelectedAlgorithm(e.target.value as 'greedy' | 'maxflow')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">그리디 알고리즘</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="algorithm"
                        value="maxflow"
                        checked={selectedAlgorithm === 'maxflow'}
                        onChange={(e) => setSelectedAlgorithm(e.target.value as 'greedy' | 'maxflow')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">최대유량 알고리즘</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={runTest}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {selectedAlgorithm === 'greedy' ? '그리디 테스트 실행' : '최대유량 테스트 실행'}
                  </button>
                  <button
                    onClick={resetTest}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    리셋
                  </button>
                  <button
                    onClick={addCandidate}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    후보자 추가
                  </button>
                  <button
                    onClick={addTimeSlot}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    시간대 추가
                  </button>
                </div>
              </div>
            </div>

            {/* 통계 */}
            {results && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">배정 결과 통계</h2>
                <div className="mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    selectedAlgorithm === 'greedy' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {selectedAlgorithm === 'greedy' ? '그리디 알고리즘' : '최대유량 알고리즘'} 사용
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-900">{results.assignments.length}</div>
                    <div className="text-sm text-blue-700">배정된 후보자</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-900">{results.unscheduledCandidates.length}</div>
                    <div className="text-sm text-red-700">미배정 후보자</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-900">{Math.round(results.utilizationRate * 100)}%</div>
                    <div className="text-sm text-green-700">배정률</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-900">{results.totalSessions}</div>
                    <div className="text-sm text-purple-700">총 세션 수</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 면접관 가능 시간대 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">면접관 가능 시간대 ({testData.timeSlots.length}개)</h2>
                <button
                  onClick={addTimeSlot}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  추가
                </button>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {testData.timeSlots.map((slot) => (
                  <div key={slot.id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {editingTimeSlot === slot.id ? (
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateTimeSlotTime(slot.id, e.target.value)}
                          onBlur={() => setEditingTimeSlot(null)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                          onClick={() => setEditingTimeSlot(slot.id)}
                        >
                          {slot.startTime} - {slot.endTime}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeTimeSlot(slot.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 후보자 목록 및 가용 시간 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">후보자 목록 ({testData.candidates.length}명)</h2>
                <button
                  onClick={addCandidate}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  추가
                </button>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {testData.candidates.map((candidate) => (
                  <div key={candidate.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {editingCandidate === candidate.id ? (
                          <input
                            type="text"
                            value={candidate.name}
                            onChange={(e) => updateCandidateName(candidate.id, e.target.value)}
                            onBlur={() => setEditingCandidate(null)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm font-medium"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                            onClick={() => setEditingCandidate(candidate.id)}
                          >
                            {candidate.name}
                          </span>
                        )}
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {candidate.availableSlots.length}/{testData.timeSlots.length}
                        </span>
                      </div>
                      <button
                        onClick={() => removeCandidate(candidate.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1">
                      {testData.timeSlots.map(slot => {
                        const isAvailable = candidate.availableSlots.includes(slot.datetime)
                        return (
                          <button
                            key={slot.datetime}
                            onClick={() => toggleCandidateSlot(candidate.id, slot.datetime)}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              isAvailable 
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {slot.startTime}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 배정 결과 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">배정 결과</h2>
              
              {!results ? (
                <div className="text-center text-gray-500 py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>테스트를 실행하여 결과를 확인하세요</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(groupedAssignments).map(([slotTime, assignments]) => (
                    <div key={slotTime} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-900">
                          {new Date(slotTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          assignments.length === testData.simultaneousCount 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {assignments.length}/{testData.simultaneousCount}명
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {assignments.map(assignment => (
                          <div key={assignment.candidate.id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                            <span className="font-medium text-sm text-gray-900">{assignment.candidate.name}</span>
                            <span className="text-xs text-gray-600">{assignment.sessionId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {results.unscheduledCandidates.length > 0 && (
                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <h3 className="font-medium text-red-900 mb-2">미배정 후보자</h3>
                      <div className="space-y-1">
                        {results.unscheduledCandidates.map(candidate => (
                          <div key={candidate.id} className="text-sm text-red-700">
                            {candidate.name} - 가능한 슬롯: {candidate.availableSlots.length}개
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}