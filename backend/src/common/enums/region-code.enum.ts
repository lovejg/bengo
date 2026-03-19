export enum RegionCode {
  SEOUL = 'seoul',
}

export function regionMatches(policyRegion: RegionCode, userRegion: RegionCode): boolean {
  return policyRegion === userRegion;
}
