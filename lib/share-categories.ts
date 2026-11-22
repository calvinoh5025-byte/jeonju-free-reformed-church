// 자료 나눔의 "자료 종류" 목록입니다. 종류를 늘리거나 이름을 바꾸려면 이 목록만 고치면 됩니다.
// 이미 올라온 자료는 종류 이름이 그대로 저장되어 있으니, 이름을 바꿀 때는 옛 이름의 자료가 "기타"로 보인다는 점에 주의하세요.
export const SHARE_CATEGORIES = ["교회사", "교리설교집", "성경설교집", "신앙 서적", "교육·주일학교 자료", "기타"] as const;
export const DEFAULT_SHARE_CATEGORY = "기타";
export const isShareCategory = (value: string) => (SHARE_CATEGORIES as readonly string[]).includes(value);
