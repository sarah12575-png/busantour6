/**
 * API 엔드포인트: /api/attractions
 * 부산광역시 공공데이터 포털의 부산명소정보 API를 통해 명소를 검색합니다
 * CORS 프록시 역할을 수행합니다
 * 
 * 사용법:
 * GET /api/attractions?query=흰여울&pageNo=1&numOfRows=12
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
    const { query, pageNo = '1', numOfRows = '12' } = req.query;

    // 필수 파라미터 검증
    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '검색어(query)를 입력해주세요'
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
    const baseUrl = 'http://apis.data.go.kr/6260000/AttractionService/getAttractionKr';
    
    const params = new URLSearchParams({
      ServiceKey: apiKey,
      pageNo: pageNo,
      numOfRows: numOfRows,
      resultType: 'json',
      // 검색어를 이용한 필터링 (API에서 직접 지원하지 않을 수 있으므로 
      // 응답 후 클라이언트에서 필터링하도록 설계)
    });

    const apiUrl = `${baseUrl}?${params.toString()}`;

    console.log('Fetching from Busan API:', baseUrl);

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
        data: []
      });
    }

    // 검색어로 필터링 (클라이언트에서도 수행하지만 서버에서도 수행)
    let items = apiData.response?.body?.items?.item || [];
    
    // 배열 확인 (단일 항목인 경우 배열로 변환)
    if (items && !Array.isArray(items)) {
      items = [items];
    }

    // 검색어 필터링
    const searchQuery = query.toLowerCase();
    const filteredItems = items.filter(item => {
      const title = (item.MAIN_TITLE || '').toLowerCase();
      const subtitle = (item.SUBTITLE || '').toLowerCase();
      const content = (item.ITEMCNTNTS || '').toLowerCase();
      
      return title.includes(searchQuery) || 
             subtitle.includes(searchQuery) || 
             content.includes(searchQuery);
    });

    // 응답 포맷팅
    return res.status(200).json({
      success: true,
      data: filteredItems,
      pageNo: apiData.response?.body?.pageNo || pageNo,
      numOfRows: apiData.response?.body?.numOfRows || numOfRows,
      totalCount: filteredItems.length,
      resultCode: apiData.resultCode,
      resultMsg: apiData.resultMsg
    });

  } catch (error) {
    console.error('Error in attractions API:', error);

    // 상세한 에러 로깅
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return res.status(500).json({
      success: false,
      message: '데이터 조회 중 오류가 발생했습니다',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}
