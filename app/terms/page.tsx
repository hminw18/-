
import { FileText } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex items-center justify-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            이용약관
          </h1>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-gray-600 mb-6">
            <strong>시행일:</strong> 2025년 8월 31일
          </p>

          <p className="text-gray-600 mb-8">
            이 약관은 한시에(이하 &quot;회사&quot;)가 제공하는 모든 서비스(이하 &quot;서비스&quot;)의 이용 조건 및 절차, 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </p>

          <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 mb-6">
            제1조 (목적)
          </h2>
          <p className="text-gray-600 mb-6">
            본 약관은 회사가 제공하는 서비스의 이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </p>

          <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 my-8">
            제2조 (정의)
          </h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2 pl-4">
            <li>&quot;서비스&quot;라 함은 회사가 제공하는 면접 일정 조율 관련 모든 서비스를 의미합니다.</li>
            <li>&quot;이용자&quot;라 함은 회사의 서비스에 접속하여 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
            <li>&quot;회원&quot;이라 함은 회사와 서비스 이용계약을 체결하고 이용자 아이디(ID)를 부여받은 자를 말합니다.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 my-8">
            제3조 (약관의 게시와 개정)
          </h2>
          <p className="text-gray-600 mb-6">
            회사는 이 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다. 회사는 약관의 규제에 관한 법률, 정보통신망 이용촉진 및 정보보호 등에 관한 법률 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
          </p>

          <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 my-8">
            제4조 (서비스의 제공 및 변경)
          </h2>
          <p className="text-gray-600">
            회사는 다음과 같은 업무를 수행합니다.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 pl-4 mt-4">
            <li>면접 일정 조율 서비스</li>
            <li>관련 부가 서비스</li>
            <li>기타 회사가 정하는 업무</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2 my-8">
            제5조 (이용자의 의무)
          </h2>
          <p className="text-gray-600">
            이용자는 다음 행위를 하여서는 안 됩니다.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 pl-4 mt-4">
            <li>허위 내용의 등록</li>
            <li>타인의 정보 도용</li>
            <li>회사가 게시한 정보의 변경</li>
            <li>회사의 운영을 방해하거나 서비스에 해를 가하는 행위</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
