import { OAuthProvider } from '../../common/enums/oauth-provider.enum';

/** OAuth strategy의 validate()가 반환하는 정규화된 사용자 정보 */
export interface OAuthProfileInput {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  displayName?: string;
}
