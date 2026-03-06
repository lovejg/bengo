import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cors from '@fastify/cors';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  await app.register(cors, { origin: true, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Bengo API')
    .setDescription('MVP backend API for policy discovery and eligibility checks')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDoc);

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
