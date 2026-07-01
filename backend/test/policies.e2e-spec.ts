import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PoliciesController } from '../src/policies/policies.controller';
import { PoliciesService } from '../src/policies/policies.service';
import { UsersService } from '../src/users/users.service';

/**
 * 공개 정책 엔드포인트의 HTTP 계층(라우팅 + 글로벌 ValidationPipe + ParseUUIDPipe)을
 * 실제 DB 없이 검증한다. PoliciesService는 목으로 대체한다.
 */
describe('Policies (e2e)', () => {
  let app: NestFastifyApplication;

  const policiesService = {
    listPoliciesPublic: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    getPolicyDetailPublic: jest.fn().mockResolvedValue({ id: 'x' }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PoliciesController],
      providers: [
        { provide: PoliciesService, useValue: policiesService },
        // 보호 라우트의 가드(EmailVerifiedGuard)가 주입받는 의존성 스텁.
        // 공개 라우트만 테스트하므로 실제 동작은 필요 없다.
        { provide: UsersService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    // main.ts와 동일한 글로벌 파이프 설정
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /policies', () => {
    it('유효한 요청이면 200과 목록을 반환한다', async () => {
      const res = await request(app.getHttpServer()).get('/policies').expect(200);
      expect(res.body).toEqual({ items: [], total: 0 });
      expect(policiesService.listPoliciesPublic).toHaveBeenCalled();
    });

    it('정의되지 않은 enum 값(interest)이면 400', async () => {
      await request(app.getHttpServer()).get('/policies?interest=not_a_category').expect(400);
    });

    it('화이트리스트에 없는 쿼리 파라미터면 400', async () => {
      await request(app.getHttpServer()).get('/policies?hacker=1').expect(400);
    });
  });

  describe('GET /policies/:id', () => {
    it('UUID가 아닌 id면 400 (ParseUUIDPipe)', async () => {
      await request(app.getHttpServer()).get('/policies/not-a-uuid').expect(400);
    });

    it('유효한 UUID면 200', async () => {
      await request(app.getHttpServer())
        .get('/policies/11111111-1111-1111-1111-111111111111')
        .expect(200);
    });
  });
});
