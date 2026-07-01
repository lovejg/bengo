import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../config/redis.module';
import { evaluateMvpScope, getPolicySource } from '../common/constants/mvp-policy-scope.constant';
import { Gender } from '../common/enums/gender.enum';
import { InterestCategory } from '../common/enums/interest-category.enum';
import { PolicyStatus } from '../common/enums/policy-status.enum';
import { PolicyType } from '../common/enums/policy-type.enum';
import { RegionCode, regionMatches } from '../common/enums/region-code.enum';
import { UserPolicyState as UserPolicyStateEnum } from '../common/enums/user-policy-state.enum';
import { EligibilityCheck, Policy, PolicyRule, UserPolicyState } from '../database/entities';
import { EligibilityService } from '../eligibility/eligibility.service';
import { UsersService } from '../users/users.service';
import { ListPoliciesQueryDto, PolicySortBy, SortOrder } from './dto/list-policies-query.dto';
import { PublicListPoliciesQueryDto } from './dto/public-list-policies-query.dto';
import { UpdateUserPolicyStateDto } from './dto/update-user-policy-state.dto';

@Injectable()
export class PoliciesService {
  constructor(
    private readonly usersService: UsersService,
    private readonly eligibilityService: EligibilityService,
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
    @InjectRepository(PolicyRule)
    private readonly policyRuleRepository: Repository<PolicyRule>,
    @InjectRepository(EligibilityCheck)
    private readonly eligibilityCheckRepository: Repository<EligibilityCheck>,
    @InjectRepository(UserPolicyState)
    private readonly userPolicyStateRepository: Repository<UserPolicyState>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async listPoliciesPublic(query: PublicListPoliciesQueryDto) {
    const cacheKey = `policies:public:${JSON.stringify(query)}`;

    const cached = await this.safeRedisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached) as unknown;
    }

    const policies = await this.policyRepository.find({
      where: { status: PolicyStatus.ACTIVE },
    });

    const filtered = policies.filter((policy) => {
      if (!this.isPolicyInMvpScope(policy)) {
        return false;
      }

      if (query.interest && policy.categories.length > 0) {
        if (!policy.categories.includes(query.interest)) {
          return false;
        }
      }

      if (query.regionCode && policy.regionCodes.length > 0) {
        if (!policy.regionCodes.some((pr) => regionMatches(pr, query.regionCode!))) {
          return false;
        }
      }

      if (query.search) {
        const keyword = query.search.toLowerCase();
        const content = `${policy.title} ${policy.shortDescription}`.toLowerCase();
        if (!content.includes(keyword)) {
          return false;
        }
      }

      return true;
    });

    const sorted = filtered.sort((a, b) => {
      const direction = query.order === SortOrder.ASC ? 1 : -1;
      if (query.sortBy === PolicySortBy.DEADLINE) {
        const aD = a.endsAt ? new Date(a.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bD = b.endsAt ? new Date(b.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
        return (aD - bD) * direction;
      }
      return (a.createdAt.getTime() - b.createdAt.getTime()) * direction;
    });

    const response = {
      total: sorted.length,
      items: sorted.map((policy) => ({
        id: policy.id,
        code: policy.code,
        title: policy.title,
        shortDescription: policy.shortDescription,
        providerName: policy.providerName,
        categories: policy.categories,
        regionCodes: policy.regionCodes,
        minAge: policy.minAge,
        maxAge: policy.maxAge,
        startsAt: policy.startsAt,
        endsAt: policy.endsAt,
        isAlwaysOpen: policy.isAlwaysOpen,
        periodRaw: this.resolvePeriodRaw(policy),
        policyType: policy.policyType,
        targetDescription: policy.targetDescription,
        sourceType: this.getSourceType(policy.sourceUrl),
      })),
    };

    await this.safeRedisSet(cacheKey, JSON.stringify(response), 120);
    return response;
  }

  async listPolicies(userId: string, query: ListPoliciesQueryDto) {
    const profile = await this.usersService.findProfileOrFail(userId);
    const cacheKey = `policies:list:${userId}:${JSON.stringify(query)}`;

    const cached = await this.safeRedisGet(cacheKey);
    if (cached) {
      return JSON.parse(cached) as unknown;
    }

    const policies = await this.policyRepository.find({
      where: { status: PolicyStatus.ACTIVE },
      relations: ['requirements'],
    });

    const regionFilter = query.regionCode ?? profile.regionCode;
    const interestFilter = query.interest ? [query.interest] : profile.interests;

    const filtered = policies
      .filter((policy) => {
        if (!this.isPolicyInMvpScope(policy)) {
          return false;
        }

        if (
          query.onlyAvailable &&
          !this.isPolicyAvailableForProfile(policy, profile.age, profile.gender, regionFilter)
        ) {
          return false;
        }

        if (interestFilter.length > 0 && policy.categories.length > 0) {
          const hasCategory = policy.categories.some((category) =>
            interestFilter.includes(category),
          );
          if (!hasCategory) {
            return false;
          }
        }

        if (query.search) {
          const keyword = query.search.toLowerCase();
          const content = `${policy.title} ${policy.shortDescription}`.toLowerCase();
          if (!content.includes(keyword)) {
            return false;
          }
        }

        return true;
      })
      .map((policy) => ({
        ...policy,
        fitScore: this.calculateFitScore(
          policy,
          profile.age,
          profile.gender,
          profile.regionCode,
          profile.interests,
        ),
      }));

    const sorted = filtered.sort((a, b) => this.sortPolicies(a, b, query.sortBy, query.order));

    const policyIds = sorted.map((policy) => policy.id);
    const states = policyIds.length
      ? await this.userPolicyStateRepository.find({
          where: {
            userId,
            policyId: In(policyIds),
          },
        })
      : [];

    const stateMap = new Map(states.map((state) => [state.policyId, state]));

    const response = {
      total: sorted.length,
      items: sorted.map((policy) => ({
        id: policy.id,
        code: policy.code,
        title: policy.title,
        shortDescription: policy.shortDescription,
        providerName: policy.providerName,
        categories: policy.categories,
        regionCodes: policy.regionCodes,
        minAge: policy.minAge,
        maxAge: policy.maxAge,
        startsAt: policy.startsAt,
        endsAt: policy.endsAt,
        isAlwaysOpen: policy.isAlwaysOpen,
        periodRaw: this.resolvePeriodRaw(policy),
        targetDescription: policy.targetDescription,
        fitScore: policy.fitScore,
        sourceType: this.getSourceType(policy.sourceUrl),
        userState: stateMap.get(policy.id)?.state ?? null,
      })),
    };

    await this.safeRedisSet(cacheKey, JSON.stringify(response), 60);
    return response;
  }

  async getPolicyDetailPublic(policyId: string) {
    const policy = await this.findActivePolicyInScope(policyId);
    return this.toPolicyDetailBase(policy);
  }

  async getPolicyDetail(userId: string, policyId: string) {
    const policy = await this.findActivePolicyInScope(policyId);

    const [state, lastCheck] = await Promise.all([
      this.userPolicyStateRepository.findOne({ where: { userId, policyId } }),
      this.eligibilityCheckRepository.findOne({
        where: { userId, policyId },
        order: { createdAt: 'DESC' },
      }),
    ]);

    return {
      ...this.toPolicyDetailBase(policy),
      userState: state?.state ?? null,
      lastEligibility: lastCheck
        ? {
            result: lastCheck.result,
            reasons: lastCheck.reasons,
            explanation: lastCheck.explanation,
            checkedAt: lastCheck.createdAt,
          }
        : null,
    };
  }

  private async findActivePolicyInScope(policyId: string): Promise<Policy> {
    const policy = await this.policyRepository.findOne({
      where: { id: policyId, status: PolicyStatus.ACTIVE },
      relations: ['requirements', 'rules'],
    });

    if (!policy || !this.isPolicyInMvpScope(policy)) {
      throw new NotFoundException('정책을 찾을 수 없습니다.');
    }

    return policy;
  }

  private toPolicyDetailBase(policy: Policy) {
    const extra = (policy.extraMeta ?? {}) as Record<string, unknown>;

    return {
      id: policy.id,
      code: policy.code,
      title: policy.title,
      shortDescription: policy.shortDescription,
      description: policy.description,
      providerName: policy.providerName,
      sourceUrl: policy.sourceUrl,
      sourceType: this.getSourceType(policy.sourceUrl),
      applicationUrl: policy.applicationUrl,
      applicationMethod: policy.applicationMethod,
      searchUrl: this.buildSearchUrl(policy),
      categories: policy.categories,
      regionCodes: policy.regionCodes,
      minAge: policy.minAge,
      maxAge: policy.maxAge,
      targetGenders: policy.targetGenders,
      targetDescription: policy.targetDescription,
      startsAt: policy.startsAt,
      endsAt: policy.endsAt,
      isAlwaysOpen: policy.isAlwaysOpen,
      periodRaw: policy.periodRaw,
      requirements: policy.requirements
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((requirement) => ({
          key: requirement.key,
          label: requirement.label,
          description: requirement.description,
          type: requirement.type,
          isRequired: requirement.isRequired,
          options: requirement.options,
        })),
      eligibilityInfo: {
        supportContent: (extra.supportContent as string) ?? null,
        selectionCriteria: (extra.selectionCriteria as string) ?? null,
        applicationDeadline: (extra.applicationDeadline as string) ?? null,
        warnBox: (extra.warnBox as string) ?? null,
      },
      policyType: policy.policyType,
      eligibilityCompleteness: this.computeEligibilityCompleteness(policy),
    };
  }

  async checkEligibility(userId: string, policyId: string, answers: Record<string, unknown>) {
    // 프로필이 없어도 answers에 age/regionCode가 있으면 자격 판별 가능
    const profile = await this.usersService.findProfile(userId);
    if (!profile) {
      const answerAge = answers.age != null ? Number(answers.age) : null;
      const answerRegion = answers.regionCode != null ? String(answers.regionCode) : null;
      if (answerAge === null || answerRegion === null) {
        throw new BadRequestException(
          '프로필이 설정되지 않았습니다. 나이(age)와 거주 지역(regionCode)을 입력해주세요.',
        );
      }
    }

    const policy = await this.policyRepository.findOne({
      where: { id: policyId, status: PolicyStatus.ACTIVE },
      relations: ['requirements'],
    });

    if (!policy) {
      throw new NotFoundException('정책을 찾을 수 없습니다.');
    }

    if (!this.isPolicyInMvpScope(policy)) {
      throw new NotFoundException('정책을 찾을 수 없습니다.');
    }

    const missingRequiredFields = policy.requirements
      .filter((requirement) => requirement.isRequired)
      .filter((requirement) => {
        const value = answers[requirement.key];
        return value === undefined || value === null || value === '';
      })
      .map((requirement) => requirement.label);

    if (missingRequiredFields.length > 0) {
      throw new BadRequestException(
        `필수 입력값이 누락되었습니다: ${missingRequiredFields.join(', ')}`,
      );
    }

    const activeRule = await this.policyRuleRepository.findOne({
      where: { policyId, isActive: true },
      order: { version: 'DESC' },
    });

    const effectiveProfile = profile ?? {
      age: Number(answers.age),
      regionCode: String(answers.regionCode) as RegionCode,
      gender: Gender.UNSPECIFIED,
      interests: [] as InterestCategory[],
    };

    const evaluated = this.eligibilityService.evaluate({
      policy,
      profile: effectiveProfile as import('../database/entities').UserProfile,
      answers,
      rule: activeRule?.definition,
    });

    // 프로필 없는 경우(스테일 JWT 등) 판별 결과만 반환하고 이력 저장 스킵
    if (!profile) {
      return {
        result: evaluated.result,
        reasons: evaluated.reasons,
        explanation: evaluated.explanation,
      };
    }

    const savedCheck = await this.eligibilityCheckRepository.save(
      this.eligibilityCheckRepository.create({
        userId,
        policyId,
        inputAnswers: answers,
        result: evaluated.result,
        reasons: evaluated.reasons,
        explanation: evaluated.explanation,
        evaluatedRuleVersion: activeRule?.version ?? null,
      }),
    );

    return {
      result: evaluated.result,
      reasons: evaluated.reasons,
      explanation: evaluated.explanation,
      policy: {
        title: policy.title,
        applicationUrl: policy.applicationUrl,
        applicationMethod: policy.applicationMethod,
        sourceUrl: policy.sourceUrl,
      },
      checkedAt: savedCheck.createdAt,
    };
  }

  async updateUserPolicyState(userId: string, policyId: string, dto: UpdateUserPolicyStateDto) {
    const policy = await this.policyRepository.findOne({ where: { id: policyId } });
    if (!policy) {
      throw new NotFoundException('정책을 찾을 수 없습니다.');
    }

    if (!this.isPolicyInMvpScope(policy)) {
      throw new NotFoundException('정책을 찾을 수 없습니다.');
    }

    const current = await this.userPolicyStateRepository.findOne({
      where: { userId, policyId },
    });

    const next = this.userPolicyStateRepository.create({
      id: current?.id,
      userId,
      policyId,
      state: dto.state,
      note: dto.note ?? current?.note ?? null,
      appliedAt:
        dto.state === UserPolicyStateEnum.APPLIED
          ? (current?.appliedAt ?? new Date())
          : (current?.appliedAt ?? null),
    });

    const saved = await this.userPolicyStateRepository.save(next);

    return {
      id: saved.id,
      policyId: saved.policyId,
      state: saved.state,
      note: saved.note,
      appliedAt: saved.appliedAt,
      updatedAt: saved.updatedAt,
    };
  }

  async listMyPolicies(userId: string, stateFilter?: UserPolicyStateEnum) {
    const where: Record<string, unknown> = { userId };
    if (stateFilter) {
      where.state = stateFilter;
    }

    const states = await this.userPolicyStateRepository.find({
      where,
      relations: ['policy'],
      order: { updatedAt: 'DESC' },
    });
    const scopedStates = states.filter((s) => this.isPolicyInMvpScope(s.policy));

    return {
      total: scopedStates.length,
      items: scopedStates.map((s) => ({
        policyId: s.policyId,
        title: s.policy.title,
        shortDescription: s.policy.shortDescription,
        providerName: s.policy.providerName,
        categories: s.policy.categories,
        startsAt: s.policy.startsAt,
        endsAt: s.policy.endsAt,
        isAlwaysOpen: s.policy.isAlwaysOpen,
        periodRaw: this.resolvePeriodRaw(s.policy),
        targetDescription: s.policy.targetDescription,
        state: s.state,
        note: s.note,
        appliedAt: s.appliedAt,
        updatedAt: s.updatedAt,
      })),
    };
  }

  async removeUserPolicyState(userId: string, policyId: string) {
    const existing = await this.userPolicyStateRepository.findOne({
      where: { userId, policyId },
    });
    if (!existing) {
      throw new NotFoundException('저장된 정책이 없습니다.');
    }
    await this.userPolicyStateRepository.remove(existing);
  }

  private buildSearchUrl(policy: Policy): string {
    const query = encodeURIComponent(`${policy.title} 신청`);
    return `https://search.naver.com/search.naver?query=${query}`;
  }

  private isPolicyAvailableForProfile(
    policy: Policy,
    age: number,
    gender: Gender,
    regionCode: RegionCode,
  ): boolean {
    if (!this.isPolicyInMvpScope(policy)) {
      return false;
    }

    if (policy.minAge !== null && age < policy.minAge) {
      return false;
    }

    if (policy.maxAge !== null && age > policy.maxAge) {
      return false;
    }

    if (
      policy.regionCodes.length > 0 &&
      !policy.regionCodes.some((pr) => regionMatches(pr, regionCode))
    ) {
      return false;
    }

    if (policy.targetGenders.length > 0 && !policy.targetGenders.includes(gender)) {
      return false;
    }

    return true;
  }

  private isPolicyInMvpScope(policy: Policy): boolean {
    const source = getPolicySource(policy.extraMeta) ?? 'unknown';
    return evaluateMvpScope(source, policy.categories, policy.regionCodes).inScope;
  }

  private calculateFitScore(
    policy: Policy,
    age: number,
    gender: Gender,
    regionCode: RegionCode,
    interests: InterestCategory[],
  ): number {
    let score = 0;

    if (this.isPolicyAvailableForProfile(policy, age, gender, regionCode)) {
      score += 50;
    }

    if (policy.categories.length > 0) {
      const matchedInterests = policy.categories.filter((category) =>
        interests.includes(category),
      ).length;
      score += matchedInterests * 20;
    }

    if (policy.endsAt) {
      const daysLeft = Math.ceil(
        (new Date(policy.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft > 0 && daysLeft <= 7) {
        score += 15;
      }
    }

    return score;
  }

  private sortPolicies(
    a: Policy & { fitScore: number },
    b: Policy & { fitScore: number },
    sortBy: PolicySortBy,
    order: SortOrder,
  ): number {
    const direction = order === SortOrder.ASC ? 1 : -1;

    if (sortBy === PolicySortBy.DEADLINE) {
      const aDeadline = a.endsAt ? new Date(a.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bDeadline = b.endsAt ? new Date(b.endsAt).getTime() : Number.MAX_SAFE_INTEGER;
      return (aDeadline - bDeadline) * direction;
    }

    if (sortBy === PolicySortBy.LATEST) {
      return (a.createdAt.getTime() - b.createdAt.getTime()) * direction;
    }

    return (a.fitScore - b.fitScore) * direction;
  }

  private async safeRedisGet(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  private async safeRedisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } catch {
      // MVP 단계에서는 캐시 오류로 요청이 실패하지 않도록 무시한다.
    }
  }

  /** isAlwaysOpen이 true인데 periodRaw가 없으면 "상시"로 채워서 반환 */
  private resolvePeriodRaw(policy: Pick<Policy, 'isAlwaysOpen' | 'periodRaw'>): string | null {
    if (policy.isAlwaysOpen && !policy.periodRaw) return '상시';
    return policy.periodRaw ?? null;
  }

  /**
   * 원문 URL 출처 유형.
   * - 'official' : 정상적인 공공기관 페이지
   * - 'blog'     : 블로그/SNS 등 비공식 출처
   * - 'none'     : sourceUrl 없음 (검색 엔진 폴백)
   */
  private getSourceType(url: string | null): 'official' | 'blog' | 'none' {
    if (!url) return 'none';
    const BLOG_DOMAINS = [
      'blog.naver.com',
      'm.blog.naver.com',
      'naver.me',
      'tistory.com',
      'brunch.co.kr',
      'velog.io',
      'blog.daum.net',
      'cafe.naver.com',
    ];
    try {
      const hostname = new URL(url).hostname;
      if (BLOG_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
        return 'blog';
      }
    } catch {
      // URL 파싱 실패 → official로 간주
    }
    return 'official';
  }

  /**
   * 자격 판별 데이터 충실도.
   * - 'full'    : 나이/지역 외 추가 조건이 있음
   * - 'partial' : 나이/지역만이지만 심사·선착순 등 CONDITIONAL 힌트 존재
   * - 'minimal' : 나이/지역만, 힌트도 없음 → 데이터 부족 경고 적합
   * INFO 정책은 조건이 없는 게 정상이므로 'full' 반환.
   */
  private computeEligibilityCompleteness(policy: Policy): 'full' | 'partial' | 'minimal' {
    if (policy.policyType === PolicyType.INFO) return 'full';

    const BASE_KEYS = new Set(['age', 'regionCode']);
    const hasExtraRequirements = (policy.requirements ?? []).some((r) => !BASE_KEYS.has(r.key));
    if (hasExtraRequirements) return 'full';

    const BLOCKING_PATTERN =
      /선착순|인원\s*제한|모집\s*마감|심사|면접|위원회\s*평가|중복\s*(혜택|신청)/;
    const activeRules = (policy.rules ?? []).filter((r) => r.isActive);
    const hasBlockingHint = activeRules.some((r) =>
      r.definition?.conditionalHints?.some((h) => BLOCKING_PATTERN.test(h)),
    );
    if (hasBlockingHint) return 'partial';

    return 'minimal';
  }
}
