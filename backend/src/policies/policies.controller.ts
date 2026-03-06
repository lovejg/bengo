import {
  Body,
  Controller,
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
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckEligibilityDto } from './dto/check-eligibility.dto';
import { ListPoliciesQueryDto } from './dto/list-policies-query.dto';
import { UpdateUserPolicyStateDto } from './dto/update-user-policy-state.dto';
import { PoliciesService } from './policies.service';

@ApiTags('policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get('policies')
  @ApiOperation({ summary: '정책 목록 조회 (검색/정렬/필터)' })
  @ApiOkResponse({ description: '정책 목록' })
  listPolicies(
    @CurrentUser() user: JwtUser,
    @Query() query: ListPoliciesQueryDto,
  ) {
    return this.policiesService.listPolicies(user.sub, query);
  }

  @Get('policies/:id')
  @ApiOperation({ summary: '정책 상세 조회' })
  @ApiOkResponse({ description: '정책 상세' })
  getPolicyDetail(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.policiesService.getPolicyDetail(user.sub, id);
  }

  @Post('policies/:id/check-eligibility')
  @ApiOperation({ summary: '정책 신청 가능 여부 판정' })
  @ApiOkResponse({ description: '판정 결과' })
  checkEligibility(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CheckEligibilityDto,
  ) {
    return this.policiesService.checkEligibility(user.sub, id, dto.answers);
  }

  @Patch('me/policies/:id/state')
  @ApiOperation({ summary: '내 정책 상태 변경 (완료/숨김/검토중)' })
  @ApiOkResponse({ description: '변경 결과' })
  updateMyPolicyState(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserPolicyStateDto,
  ) {
    return this.policiesService.updateUserPolicyState(user.sub, id, dto);
  }

  @Get('me/policies')
  @ApiOperation({ summary: '내 정책 상태 목록 조회' })
  @ApiOkResponse({ description: '내 정책 목록' })
  getMyPolicies(@CurrentUser() user: JwtUser) {
    return this.policiesService.listMyPolicies(user.sub);
  }
}
