import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserPolicyState } from '../common/enums/user-policy-state.enum';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckEligibilityDto } from './dto/check-eligibility.dto';
import { ListPoliciesQueryDto } from './dto/list-policies-query.dto';
import { PublicListPoliciesQueryDto } from './dto/public-list-policies-query.dto';
import { UpdateUserPolicyStateDto } from './dto/update-user-policy-state.dto';
import { PoliciesService } from './policies.service';

@ApiTags('policies')
@Controller()
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get('policies')
  @ApiOperation({ summary: '정책 목록 조회 (공개, 로그인 불필요)' })
  @ApiOkResponse({ description: '정책 목록' })
  listPoliciesPublic(@Query() query: PublicListPoliciesQueryDto) {
    return this.policiesService.listPoliciesPublic(query);
  }

  @Get('policies/recommended')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '맞춤 정책 목록 조회 (프로필 기반 필터링)' })
  @ApiOkResponse({ description: '맞춤 정책 목록' })
  listPoliciesRecommended(
    @CurrentUser() user: JwtUser,
    @Query() query: ListPoliciesQueryDto,
  ) {
    return this.policiesService.listPolicies(user.sub, query);
  }

  @Get('policies/:id')
  @ApiOperation({ summary: '정책 상세 조회 (공개, 로그인 불필요)' })
  @ApiOkResponse({ description: '정책 상세' })
  getPolicyDetailPublic(@Param('id', ParseUUIDPipe) id: string) {
    return this.policiesService.getPolicyDetailPublic(id);
  }

  @Get('policies/:id/my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '정책 상세 + 내 상태/판별이력 조회' })
  @ApiOkResponse({ description: '정책 상세 (사용자 정보 포함)' })
  getPolicyDetailWithUser(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.policiesService.getPolicyDetail(user.sub, id);
  }

  @Post('policies/:id/check-eligibility')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @ApiOperation({ summary: '정책 신청 가능 여부 판정 (이메일 인증 필요)' })
  @ApiOkResponse({ description: '판정 결과' })
  checkEligibility(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CheckEligibilityDto,
  ) {
    return this.policiesService.checkEligibility(user.sub, id, dto.answers);
  }

  @Patch('me/policies/:id/state')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @ApiOperation({ summary: '정책 저장/신청완료 상태 변경 (이메일 인증 필요)' })
  @ApiOkResponse({ description: '변경 결과' })
  updateMyPolicyState(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserPolicyStateDto,
  ) {
    return this.policiesService.updateUserPolicyState(user.sub, id, dto);
  }

  @Delete('me/policies/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @ApiOperation({ summary: '저장한 정책 삭제 (이메일 인증 필요)' })
  @ApiOkResponse({ description: '삭제 완료' })
  removeMyPolicy(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.policiesService.removeUserPolicyState(user.sub, id);
  }

  @Get('me/policies')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'MY 정책 목록 조회' })
  @ApiQuery({ name: 'state', enum: UserPolicyState, required: false })
  @ApiOkResponse({ description: '내 정책 목록' })
  getMyPolicies(
    @CurrentUser() user: JwtUser,
    @Query('state') state?: UserPolicyState,
  ) {
    return this.policiesService.listMyPolicies(user.sub, state);
  }
}
