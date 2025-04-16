import fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { Result, ok, err } from 'neverthrow';
import { Logger } from 'pino';

import { Service } from '../service/service';

export class Server {
  private instance: FastifyInstance;
  private running = false;
  private readonly port: number;
  private readonly service: Service;
  private readonly logger: Logger;
  private readonly host: string;

  constructor(host: string, port: number, service: Service, logger: Logger) {
    this.port = port;
    this.service = service;
    this.logger = logger;
    this.host = host;
    this.instance = fastify({
      logger: {
        level: 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      },
    });

    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.instance.get('/get-events', async (request, reply) => {
      const { integrator, limit, offset } = request.query as {
        integrator: string;
        limit: number;
        offset: number;
      };

      if (!limit || !offset) {
        return await reply.status(400).send('missing integrator, limit, or offset');
      }

      // max limit is 100
      const normalizedLimit = Math.min(limit, 100);

      if (integrator) {
        const events = await this.service.getEventsByIntegrator(
          integrator,
          normalizedLimit,
          offset,
        );
        if (events.isErr()) {
          this.logger.error(events.error.message);
          return await reply.status(500).send('failed to get events');
        }
        return await reply.status(200).send(events.value);
      }

      const events = await this.service.getEvents(normalizedLimit, offset);
      if (events.isErr()) {
        this.logger.error(events.error.message);
        return await reply.status(500).send('failed to get events');
      }

      return await reply.status(200).send(events.value);
    });
  }

  public async start(): Promise<Result<null, Error>> {
    if (this.running) {
      return err(new Error('Server is already running'));
    }

    try {
      await this.instance.listen({ port: this.port, host: this.host });
      this.running = true;
      return ok(null);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      return err(error);
    }
  }

  public async stop(): Promise<Result<void, Error>> {
    if (!this.running) {
      return ok(undefined);
    }

    try {
      await this.instance.close();
      this.running = false;
      return ok(undefined);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      return err(error);
    }
  }
}
