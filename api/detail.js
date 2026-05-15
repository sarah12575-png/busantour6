/**
 * API 엔드포인트: /api/detail
 * 특정 명소의 상세 정보를 조회합니다
 * 
 * 사용법:
 * GET /api/detail?id=255
 * 
 * 환경변수 필요:
 * - BUSAN_API_KEY: data.go.kr에서 발급받은 API 키
 */

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET 요청만 허용
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { id } = req.query;

    // 필수 파라미터 검증
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '명소 ID(id)를 입력해주세요'
      });
    }

    // API 키 확인
    const apiKey = process.env.BUSAN_API_KEY;
    if (!apiKey) {
      console.error('API Key not configured');
      return res.status(500).json({
        success: false,
        message: '서버 설정 오류가 발생했습니다'
      });
    }

    // data.go.kr 공공데이터 API 호출
    // UC_SEQ 파라미터로 특정 명소 조회
    const baseUrl = 'http://apis.data.go.kr/6260000/AttractionService/getAttractionKr';
    
    const params = new URLSearchParams({
      ServiceKey: apiKey,
      UC_SEQ: id,
      pageNo: '1',
      numOfRows: '1',
      resultType: 'json'
    });

    const apiUrl = `${baseUrl}?${params.toString()}`;

    console.log('Fetching detail from Busan API for ID:', id);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const apiData = await response.json();

    // 응답 검증
    if (!apiData || apiData.resultCode !== '00') {
      console.error('API Error:', apiData);
      return res.status(200).json({
        success: false,
        message: 'API 조회 실패',
        data: null
      });
    }

    // 결과 추출
    let items = apiData.response?.body?.items?.item || [];
    
    // 배열 확인 (단일 항목인 경우 배열로 변환)
    if (items && !Array.isArray(items)) {
      items = [items];
    }

    if (items.length === 0) {
      return res.status(200).json({
        success: false,
        message: '해당 명소를 찾을 수 없습니다',
        data: null
      });
    }

    // 응답 포맷팅 (첫 번째 항목만 반환)
    return res.status(200).json({
      success: true,
      data: items[0],
      resultCode: apiData.resultCode,
      resultMsg: apiData.resultMsg
    });

  } catch (error) {
    console.error('Error in detail API:', error);

    // 상세한 에러 로깅
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return res.status(500).json({
      success: false,
      message: '데이터 조회 중 오류가 발생했습니다',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}
