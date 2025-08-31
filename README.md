# 한시에 🗓️

면접 일정 조율을 위한 직관적인 플랫폼

## 🎯 프로젝트 개요

한시에는 면접관과 지원자 양쪽 모두를 위한 효율적인 면접 스케줄링 시스템입니다. 복잡한 일정 조율 과정을 단순화하여, 면접 과정을 더욱 원활하게 만듭니다.

## ✨ 주요 기능

### 🏢 면접관용 기능
- **4단계 이벤트 생성**: 기본정보 → 가용시간 → 지원자등록 → 검토발송
- **드래그 기반 시간 선택**: Excel과 같은 직관적인 시간 범위 선택
- **CSV 대량 업로드**: 지원자 정보 일괄 등록
- **실시간 관리 대시보드**: 응답률, 진행상황 실시간 모니터링
- **자동 일정 배정**: AI 기반 최적 스케줄링
- **이메일 자동 발송**: 초대장, 리마인더, 확정 통지

### 👥 지원자용 기능
- **간편한 신원 확인**: 이름 + 전화번호로 간단 인증
- **직관적인 시간 선택**: 달력 + 시간 슬롯 다중 선택
- **반응형 디자인**: 모바일/데스크톱 최적화
- **실시간 피드백**: 선택 즉시 시각적 확인

## 🛠️ 기술 스택

### Frontend
- **Framework**: Next.js 15.2.4 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Fonts**: Geist Sans & Geist Mono

### UI Components
- **Design System**: Radix UI Primitives
- **Component Library**: Shadcn/UI
- **Form Handling**: React Hook Form + Zod
- **Date Handling**: date-fns + react-day-picker

## 🚀 시작하기

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 빌드
pnpm build

# 프로덕션 실행
pnpm start

# 린트 검사
pnpm lint
```

### 환경 요구사항

- Node.js 18.17 이상
- pnpm 8.0 이상

## 📁 프로젝트 구조

```
├── app/                    # Next.js App Router
│   ├── page.tsx           # 랜딩 페이지
│   ├── create/            # 이벤트 생성 플로우
│   ├── events/            # 이벤트 관리
│   └── respond/           # 지원자 응답
├── components/            # 재사용 컴포넌트
│   ├── ui/               # Shadcn/UI 컴포넌트
│   └── calendar/         # 캘린더 전용 컴포넌트
├── hooks/                # 커스텀 훅
├── utils/                # 유틸리티 함수
├── types/                # TypeScript 타입 정의
└── CLAUDE.md            # AI 개발 가이드
```

## 🎨 UX/UI 플로우

### 면접관 플로우
1. **랜딩 페이지** → "Create Event" 클릭
2. **기본 정보 입력** → 이벤트명, 면접시간, 동시인원, 이메일
3. **가용 시간 설정** → 드래그로 시간 범위 선택
4. **지원자 등록** → CSV 업로드 또는 수기 입력
5. **검토 및 발송** → 마감일 설정 후 초대장 발송

### 지원자 플로우
1. **이메일 링크 클릭** → 응답 페이지 접속
2. **신원 확인** → 이름 + 전화번호 인증
3. **시간 선택** → 선호 시간대 다중 선택
4. **제출 완료** → 자동 확인 이메일 발송

## 📊 현재 상태

✅ **완료된 기능**
- 프론트엔드 전체 UI/UX 구현
- 4단계 이벤트 생성 플로우
- 드래그 기반 시간 선택 시스템
- 반응형 디자인
- 타입세이프 TypeScript 구현

🚧 **진행 예정**
- 백엔드 API 개발 (Node.js + PostgreSQL)
- 이메일 발송 시스템 (SendGrid)
- 자동 스케줄링 알고리즘
- 사용자 인증 시스템
- 실시간 알림 기능

## 🔮 향후 계획

- [ ] 백엔드 API 구축
- [ ] 데이터베이스 설계 및 구현
- [ ] 이메일 템플릿 시스템
- [ ] 화상회의 연동 (Zoom, Teams)
- [ ] 모바일 앱 (React Native)
- [ ] 다국어 지원
- [ ] 분석 대시보드

## 📝 라이선스

MIT License

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**한시에** - 면접 일정 조율의 새로운 표준 ✨