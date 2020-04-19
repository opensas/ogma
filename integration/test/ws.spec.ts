import { INestApplication, WebSocketAdapter } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';
import { color } from '@ogma/logger';
import {
  AbstractInterceptorService,
  OgmaInterceptor,
  Type,
} from '@ogma/nestjs-module';
import { SocketIOParser } from '@ogma/platform-socket.io';
import { WsParser } from '@ogma/platform-ws';
import * as Io from 'socket.io-client';
import * as WebSocket from 'ws';
import { WsModule } from '../src/ws/ws.module';
import {
  createConnection,
  hello,
  serviceOptionsFactory,
  wsClose,
  wsPromise,
} from './utils';

describe.each`
  adapter      | server         | parser            | client                                 | protocol  | sendMethod | serializer
  ${IoAdapter} | ${'Socket.io'} | ${SocketIOParser} | ${(url: string) => Io(url)}            | ${'http'} | ${'emit'}  | ${(message: string) => message}
  ${WsAdapter} | ${'Websocket'} | ${WsParser}       | ${(url: string) => new WebSocket(url)} | ${'ws'}   | ${'send'}  | ${(message: string) => JSON.stringify({ event: message })}
`(
  '$server server',
  ({
    adapter,
    server,
    parser,
    client,
    protocol,
    sendMethod,
    serializer,
  }: {
    adapter: Type<WebSocketAdapter>;
    server: string;
    parser: Type<AbstractInterceptorService>;
    client: (url: string) => SocketIOClient.Socket | WebSocket;
    protocol: 'http' | 'ws';
    sendMethod: 'send' | 'emit';
    serializer: (message: string) => string;
  }) => {
    let app: INestApplication;
    let interceptor: OgmaInterceptor;

    beforeAll(async () => {
      const modRef = await Test.createTestingModule({
        imports: [
          WsModule.register({
            service: serviceOptionsFactory(server),
            interceptor: {
              ws: parser,
            },
          }),
        ],
      }).compile();
      app = modRef.createNestApplication();
      app.useWebSocketAdapter(new adapter(app));
      interceptor = app.get(OgmaInterceptor);
      await app.listen(0);
    });

    afterAll(async () => {
      await app.close();
    });

    describe('messages', () => {
      let logSpy: jest.SpyInstance;
      let ws: WebSocket | SocketIOClient.Socket;

      beforeAll(async () => {
        let baseUrl = await app.getUrl();
        baseUrl = baseUrl.replace('http', protocol);
        ws = await createConnection(client, baseUrl);
      });

      afterAll(async () => {
        await wsClose(ws);
      });

      beforeEach(() => {
        logSpy = jest.spyOn(interceptor, 'log');
      });

      afterEach(() => {
        logSpy.mockClear();
      });

      it.each`
        message      | status
        ${'message'} | ${color.green(200)}
        ${'throw'}   | ${color.red(500)}
      `(
        '$message',
        async ({ message, status }: { message: string; status: string }) => {
          await wsPromise(ws, serializer(message), sendMethod);
          expect(logSpy).toHaveBeenCalledTimes(1);
          const logObject = logSpy.mock.calls[0][0];
          expect(logObject).toBeALogObject(
            server.toLowerCase(),
            message,
            'WS',
            status,
          );
        },
      );
      it('should get the data from skip but not log', async () => {
        const data = await wsPromise(ws, serializer('skip'), sendMethod);
        expect(data).toEqual(
          server === 'Websocket' ? hello : JSON.parse(hello),
        );
        expect(logSpy).toHaveBeenCalledTimes(0);
      });
    });
  },
);