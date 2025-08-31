
import { Shield } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex items-center justify-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            개인정보처리방침
          </h1>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-gray-600 mb-6">
            <strong>시행일:</strong> 2025년 8월 31일
          </p>

          <p className="text-gray-600 mb-8">
            한시에(이하 &quot;회사&quot;)는 정보통신망 이용촉진 및 정보보호 등에 관한 법률, 개인정보보호법 등 관련 법령상의 개인정보보호 규정을 준수하며, 관련 법령에 의거한 개인정보처리방침을 정하여 이용자 권익 보호에 최선을 다하고 있습니다.
          </p>

          <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-6">
            1. 수집하는 개인정보 항목 및 수집 방법
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">가. 수집하는 개인정보의 항목</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-2 pl-4">
                <li><strong>회원가입 및 계정 관리:</strong> 이름, 이메일 주소</li>
                <li><strong>면접 일정 생성 (담당자):</strong> 이름, 이메일 주소</li>
                <li><strong>면접 일정 응답 (지원자):</strong> 이름, 이메일 주소, 전화번호</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">나. 수집 방법</h3>
              <p className="text-gray-600">
                서비스 내에서 이용자가 직접 입력하는 정보를 수집합니다. (회원가입, 면접 생성, 면접 응답 등)
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 my-8">
            2. 개인정보의 수집 및 이용 목적
          </h2>
          <p className="text-gray-600 mb-6">
            회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 pl-4">
            <li>서비스 제공 및 운영, 회원 관리</li>
            <li>면접 일정 조율 및 관련 안내, 알림 전송</li>
            <li>고객 문의 응대 및 지원</li>
            <li>서비스 개선 및 신규 서비스 개발</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 my-8">
            3. 개인정보의 보유 및 이용기간
          </h2>
          <p className="text-gray-600">
            원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관계 법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 관계 법령에서 정한 일정한 기간 동안 회원정보를 보관합니다.
          </p>

          <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 my-8">
            4. 개인정보처리방침 변경에 관한 사항
          </h2>
          <p className="text-gray-600">
            본 개인정보처리방침의 내용 추가, 삭제 및 수정이 있을 경우 개정 최소 7일 전에 서비스 내 공지사항을 통해 고지할 것입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
